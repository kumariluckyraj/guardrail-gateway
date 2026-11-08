import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from pymongo.errors import DuplicateKeyError
from redis.exceptions import RedisError

from app.api.deps import get_agent_from_api_key
from app.core.database import get_db
from app.services.audit_service import write_audit
from app.services.policy_engine import needs_approval
from app.services.rate_limiter import check_rate_limit
from app.services.risk_classifier import SAFE, decide_rules

router = APIRouter(prefix="/v1", tags=["gateway"])

MAX_TOOLS_PER_ORG = 50



class CheckRequest(BaseModel):
    tool: str = Field(pattern=r"^[a-z][a-z0-9_]{1,49}$")
    arguments: dict[str, Any] = Field(default_factory=dict)
    description: str = Field(default="", max_length=300)


async def _ensure_tool(db, org_id: str, body: CheckRequest):
    tool = await db.tools.find_one({"org_id": org_id, "name": body.tool})
    if tool:
        return tool
    if await db.tools.count_documents({"org_id": org_id}) >= MAX_TOOLS_PER_ORG:
        return None
    rules = await decide_rules(body.tool, body.description, list(body.arguments.keys()))
    doc = {
        "org_id": org_id, "name": body.tool, "description": body.description,
        "upstream_url": "", "http_method": "POST", "timeout_seconds": 10,
        "risk_level": rules["risk_level"], "ai_rules": rules,
        "mode": "check", "auto_created": True, "created_at": datetime.now(timezone.utc),
    }
    try:
        res = await db.tools.insert_one(doc)
        doc["_id"] = res.inserted_id
        return doc
    except DuplicateKeyError:  # two calls at once: the other one won
        return await db.tools.find_one({"org_id": org_id, "name": body.tool})


async def _ensure_policy(db, org_id: str, agent_id: str, tool: dict):
    key = {"org_id": org_id, "agent_id": agent_id, "tool_id": str(tool["_id"])}
    policy = await db.policies.find_one(key)
    if policy:
        return policy
    rules = tool.get("ai_rules") or SAFE
    rate, approval = rules["rate_limit"], rules["approval"]
    now = datetime.now(timezone.utc)
    await db.policies.update_one(
        key,
        {"$setOnInsert": {"tool_name": tool["name"], "allowed": True, "rate_limit": rate,
                                                    "approval": approval,
                          "created_at": now, "updated_at": now}},
        upsert=True,
    )
    return await db.policies.find_one(key)


@router.post("/check")
async def check(body: CheckRequest, agent: dict = Depends(get_agent_from_api_key)):
    db = get_db()
    request_id = uuid.uuid4().hex
    started = time.monotonic()
    agent_id = str(agent["_id"])
    ctx: dict = {}

    async def finish(status, decision, reason, extra=None, audit_extra=None, headers=None):
        await write_audit(
            org_id=agent["org_id"], agent_id=agent_id, agent_name=agent["name"],
            tool_name=body.tool, request_id=request_id, decision=decision, reason=reason,
            arguments=body.arguments, latency_ms=int((time.monotonic() - started) * 1000),
            **ctx, **(audit_extra or {}),
        )
        return JSONResponse(
            status_code=status, headers=headers or {},
            content={"request_id": request_id, "decision": decision, "reason": reason, **(extra or {})},
        )

    if len(str(body.arguments)) > 64_000:
        return JSONResponse(status_code=413, content={"detail": "Arguments too large"})

    tool = await _ensure_tool(db, agent["org_id"], body)
    if not tool:
        return await finish(403, "denied", "Too many different actions registered")
    ctx = {"tool_id": str(tool["_id"]), "risk_level": tool["risk_level"]}

    policy = await _ensure_policy(db, agent["org_id"], agent_id, tool)
    if not policy.get("allowed", False):
        return await finish(403, "denied", "This agent is not allowed to do this action",
                            audit_extra={"deny_cause": "disabled"})

    try:
        rl = policy["rate_limit"]
        ok, _n, retry = await check_rate_limit(agent_id, str(tool["_id"]), rl["max_calls"], rl["window_seconds"])
    except RedisError:
        return await finish(503, "error", "Gateway could not check limits, so the action is not allowed")
    if not ok:
        return await finish(429, "rate_limited",
                            f"Limit of {rl['max_calls']} per {rl['window_seconds']}s reached",
                            extra={"retry_after_seconds": retry}, headers={"Retry-After": str(retry)})

    required, why = needs_approval(policy["approval"], body.arguments)
    if required:
        now = datetime.now(timezone.utc)
        res = await db.approvals.insert_one({
            "org_id": agent["org_id"], "agent_id": agent_id, "agent_name": agent["name"],
            "tool_id": str(tool["_id"]), "tool_name": tool["name"], "risk_level": tool["risk_level"],
            "arguments": body.arguments, "reason": why, "request_id": request_id,
            "status": "pending", "created_at": now, "expires_at": now + timedelta(hours=24),
            "decided_at": None, "decided_by": None, "result": None,
        })
        aid = str(res.inserted_id)
        return await finish(202, "pending_approval", why, audit_extra={"approval_id": aid},
                            extra={"approval_id": aid, "status_url": f"/v1/approvals/{aid}",
                                   "poll_after_seconds": 3})

    return await finish(200, "allowed", "Allowed (the agent runs the action itself)")