import hashlib
import json
import logging
import time
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header
from fastapi.responses import JSONResponse
from redis.exceptions import RedisError

from app.api.deps import get_agent_from_api_key
from app.core.database import get_db
from app.core.redis_client import get_redis
from app.schemas.gateway import ToolCallRequest
from app.services.audit_service import write_audit
from app.services.policy_engine import needs_approval
from app.services.rate_limiter import check_rate_limit
from app.services.tool_executor import UpstreamError, execute_tool

logger = logging.getLogger("gateway")
router = APIRouter(prefix="/v1", tags=["gateway"])

MAX_ARGS_BYTES = 64_000
IDEM_TTL = 86400
APPROVAL_TTL = timedelta(hours=24)


@router.get("/whoami")
async def whoami(agent: dict = Depends(get_agent_from_api_key)):
    return {"agent_id": str(agent["_id"]), "name": agent["name"], "org_id": agent["org_id"]}


# ---------- idempotency (Redis) ----------

async def _idem_start(redis, rkey: str, fp: str) -> JSONResponse | None:
    for _ in range(2):
        if await redis.set(rkey, "processing", nx=True, ex=120):
            return None  # we own this key
        existing = await redis.get(rkey)
        if existing is None:
            continue  # expired between calls, try again
        if existing == "processing":
            return JSONResponse(
                status_code=409,
                content={"detail": "A request with this Idempotency-Key is still in progress"},
            )
        saved = json.loads(existing)
        if saved["fp"] != fp:
            return JSONResponse(
                status_code=422,
                content={"detail": "Idempotency-Key was already used with a different request"},
            )
        return JSONResponse(
            status_code=saved["status"],
            content=saved["body"],
            headers={"Idempotent-Replayed": "true"},
        )
    return JSONResponse(status_code=409, content={"detail": "Idempotency conflict, retry"})


async def _idem_finish(redis, rkey: str, fp: str, status: int, body: dict) -> None:
    try:
        if status == 429 or status >= 500:
            await redis.delete(rkey)  # failures are not cached, so the agent can retry
        else:
            await redis.set(
                rkey, json.dumps({"fp": fp, "status": status, "body": body}), ex=IDEM_TTL
            )
    except RedisError:
        logger.exception("idempotency finish failed")


# ---------- the pipeline ----------

async def _process(agent: dict, body: ToolCallRequest, request_id: str):
    db = get_db()
    started = time.monotonic()
    agent_id = str(agent["_id"])
    ctx: dict = {}

    async def done(status_code, decision, reason, *, headers=None, audit_extra=None, response_extra=None):
        await write_audit(
            org_id=agent["org_id"], agent_id=agent_id, agent_name=agent["name"],
            tool_name=body.tool, request_id=request_id, decision=decision, reason=reason,
            arguments=body.arguments, latency_ms=int((time.monotonic() - started) * 1000),
            **ctx, **(audit_extra or {}),
        )
        payload = {"request_id": request_id, "decision": decision, "reason": reason,
                   **(response_extra or {})}
        return status_code, payload, headers or {}

    # 1. permission (default deny)
    tool = await db.tools.find_one({"org_id": agent["org_id"], "name": body.tool})
    policy = None
    if tool:
        ctx = {"tool_id": str(tool["_id"]), "risk_level": tool["risk_level"]}
        policy = await db.policies.find_one(
            {"org_id": agent["org_id"], "agent_id": agent_id, "tool_id": str(tool["_id"])}
        )
    if not tool or not policy or not policy.get("allowed", False):
        cause = "unknown_tool" if not tool else "no_policy" if not policy else "disabled"
        return await done(
            403, "denied", "Tool is not registered or this agent is not permitted to use it",
            audit_extra={"deny_cause": cause},
        )
        if tool.get("mode") == "check":
            return await done(400, "error", "This action is check-only. Use /v1/check instead.")

    # 2. rate limit (raises RedisError if Redis is down -> fail closed)
    rl = policy["rate_limit"]
    ok, _count, retry = await check_rate_limit(
        agent_id, str(tool["_id"]), rl["max_calls"], rl["window_seconds"]
    )
    if not ok:
        return await done(
            429, "rate_limited",
            f"Rate limit of {rl['max_calls']} calls per {rl['window_seconds']}s exceeded",
            headers={"Retry-After": str(retry)},
            response_extra={"retry_after_seconds": retry},
        )

    # 3. human approval
    required, why = needs_approval(policy["approval"], body.arguments)
    if required:
        now = datetime.now(timezone.utc)
        res = await db.approvals.insert_one({
            "org_id": agent["org_id"], "agent_id": agent_id, "agent_name": agent["name"],
            "tool_id": str(tool["_id"]), "tool_name": tool["name"],
            "risk_level": tool["risk_level"], "arguments": body.arguments,
            "reason": why, "request_id": request_id, "status": "pending",
            "created_at": now, "expires_at": now + APPROVAL_TTL,
            "decided_at": None, "decided_by": None, "result": None,
        })
        approval_id = str(res.inserted_id)
        return await done(
            202, "pending_approval", why,
            audit_extra={"approval_id": approval_id},
            response_extra={"approval_id": approval_id,
                            "status_url": f"/v1/approvals/{approval_id}",
                            "poll_after_seconds": 5},
        )

    # 4. execute
    try:
        res = await execute_tool(tool, body.arguments, request_id, agent_id)
    except UpstreamError as e:
        return await done(
            504 if e.kind == "timeout" else 502, "upstream_error", e.message,
            audit_extra={"error_kind": e.kind},
        )

    code = res["status_code"]
    if not 200 <= code < 300:
        return await done(
            502, "upstream_error", f"Upstream returned HTTP {code}",
            audit_extra={"upstream_status": code},
            response_extra={"upstream_status": code, "upstream_body": res["body"]},
        )
    return await done(
        200, "allowed", "Executed", audit_extra={"upstream_status": code},
        response_extra={"result": res["body"]},
    )


@router.post("/tool-call")
async def tool_call(
    body: ToolCallRequest,
    agent: dict = Depends(get_agent_from_api_key),
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
):
    request_id = uuid.uuid4().hex

    if len(json.dumps(body.arguments)) > MAX_ARGS_BYTES:
        return JSONResponse(status_code=413, content={"detail": "Arguments too large"})
    if idempotency_key is not None and not 1 <= len(idempotency_key) <= 128:
        return JSONResponse(
            status_code=400, content={"detail": "Idempotency-Key must be 1-128 characters"}
        )

    redis = get_redis()
    rkey, fp = None, ""
    try:
        if idempotency_key:
            fp = hashlib.sha256(
                json.dumps({"t": body.tool, "a": body.arguments}, sort_keys=True).encode()
            ).hexdigest()
            rkey = f"idem:{agent['_id']}:{idempotency_key}"
            early = await _idem_start(redis, rkey, fp)
            if early:
                return early
        status_code, payload, headers = await _process(agent, body, request_id)
    except RedisError:
        logger.exception("Redis unavailable, failing closed")
        status_code, headers = 503, {}
        payload = {"request_id": request_id, "decision": "error",
                   "reason": "Gateway dependency unavailable, request not executed"}
        await write_audit(
            org_id=agent["org_id"], agent_id=str(agent["_id"]), agent_name=agent["name"],
            tool_name=body.tool, request_id=request_id, decision="error",
            reason="Redis unavailable (fail closed)", arguments=body.arguments,
        )
    except Exception:
        if rkey:
            try:
                await redis.delete(rkey)
            except RedisError:
                pass
        raise

    if rkey:
        await _idem_finish(redis, rkey, fp, status_code, payload)
    return JSONResponse(status_code=status_code, content=payload, headers=headers)