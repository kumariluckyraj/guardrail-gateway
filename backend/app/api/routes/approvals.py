import time
from datetime import datetime, timezone
from typing import Literal

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query
from pymongo import ReturnDocument

from app.api.deps import get_agent_from_api_key, get_current_user
from app.core.database import get_db
from app.schemas.approval import RejectRequest
from app.services.audit_service import redact, write_audit
from app.services.tool_executor import UpstreamError, execute_tool

# Dashboard side (JWT cookie)
router = APIRouter(prefix="/approvals", tags=["approvals"])
# Agent side (API key)
agent_router = APIRouter(prefix="/v1/approvals", tags=["gateway"])

ApprovalStatus = Literal["pending", "executing", "executed", "failed", "rejected", "expired"]


# ---------- helpers ----------

async def _expire_stale(extra: dict) -> None:
    now = datetime.now(timezone.utc)
    await get_db().approvals.update_many(
        {**extra, "status": "pending", "expires_at": {"$lte": now}},
        {"$set": {"status": "expired", "decided_at": now}},
    )


def _out(a: dict) -> dict:
    return {
        "id": str(a["_id"]),
        "agent_id": a["agent_id"],
        "agent_name": a["agent_name"],
        "tool_name": a["tool_name"],
        "risk_level": a["risk_level"],
        "arguments": redact(a["arguments"]),
        "reason": a["reason"],
        "status": a["status"],
        "created_at": a["created_at"],
        "expires_at": a["expires_at"],
        "decided_at": a.get("decided_at"),
        "decided_by": a.get("decided_by"),
        "rejection_reason": a.get("rejection_reason"),
        "result": a.get("result"),
    }


async def _get_owned(approval_id: str, user: dict) -> dict:
    if not ObjectId.is_valid(approval_id):
        raise HTTPException(status_code=404, detail="Approval not found")
    oid = ObjectId(approval_id)
    await _expire_stale({"_id": oid, "org_id": user["org_id"]})
    a = await get_db().approvals.find_one({"_id": oid, "org_id": user["org_id"]})
    if not a:
        raise HTTPException(status_code=404, detail="Approval not found")
    return a


def _audit_fields(a: dict, user: dict) -> dict:
    return dict(
        org_id=a["org_id"], agent_id=a["agent_id"], agent_name=a["agent_name"],
        tool_name=a["tool_name"], tool_id=a["tool_id"], risk_level=a["risk_level"],
        request_id=a["request_id"], approval_id=str(a["_id"]),
        decided_by=user["email"], arguments=a["arguments"],
    )


# ---------- dashboard endpoints ----------

@router.get("")
async def list_approvals(
    status: ApprovalStatus | None = None,
    limit: int = Query(50, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    await _expire_stale({"org_id": user["org_id"]})
    q: dict = {"org_id": user["org_id"]}  # tenant isolation
    if status:
        q["status"] = status
    cursor = get_db().approvals.find(q).sort("_id", -1).limit(limit)
    return [_out(a) async for a in cursor]


@router.get("/pending-count")  # must stay above "/{approval_id}"
async def pending_count(user: dict = Depends(get_current_user)):
    await _expire_stale({"org_id": user["org_id"]})
    n = await get_db().approvals.count_documents(
        {"org_id": user["org_id"], "status": "pending"}
    )
    return {"count": n}


@router.get("/{approval_id}")
async def get_approval(approval_id: str, user: dict = Depends(get_current_user)):
    return _out(await _get_owned(approval_id, user))


@router.post("/{approval_id}/approve")
async def approve(approval_id: str, user: dict = Depends(get_current_user)):
    db = get_db()
    a = await _get_owned(approval_id, user)
    if a["status"] != "pending":
        raise HTTPException(status_code=409, detail=f"Approval is already {a['status']}")

    # Re-check that running this is still allowed right now.
    agent = await db.agents.find_one(
        {"_id": ObjectId(a["agent_id"]), "org_id": user["org_id"]}
    )
    if not agent or agent["status"] != "active":
        raise HTTPException(status_code=409, detail="The agent is no longer active")
    tool = await db.tools.find_one(
        {"_id": ObjectId(a["tool_id"]), "org_id": user["org_id"]}
    )
    if not tool:
        raise HTTPException(status_code=409, detail="The tool no longer exists")
    policy = await db.policies.find_one(
        {"org_id": user["org_id"], "agent_id": a["agent_id"], "tool_id": a["tool_id"]}
    )
    if not policy or not policy.get("allowed", False):
        raise HTTPException(status_code=409, detail="The policy no longer allows this tool")

    # Atomic claim: only one caller can move pending -> executing.
    now = datetime.now(timezone.utc)
    claimed = await db.approvals.find_one_and_update(
        {"_id": a["_id"], "status": "pending", "expires_at": {"$gt": now}},
        {"$set": {"status": "executing", "decided_at": now, "decided_by": user["email"]}},
        return_document=ReturnDocument.AFTER,
    )
    if not claimed:
        raise HTTPException(status_code=409, detail="Approval was already decided or has expired")

    started = time.monotonic()
    extra: dict = {}
    if tool.get("mode") == "check":
        final = "executed"
        result = {"approved": True}
        reason = "Approved by a human (the agent runs the action itself)"
    else:
        try:
            res = await execute_tool(tool, claimed["arguments"], claimed["request_id"], a["agent_id"])
            ok = 200 <= res["status_code"] < 300
            final = "executed" if ok else "failed"
            result = {"status_code": res["status_code"], "body": res["body"]}
            reason = "Approved and executed" if ok else f"Approved, but upstream returned HTTP {res['status_code']}"
            extra["upstream_status"] = res["status_code"]
        except UpstreamError as e:
            final = "failed"
            result = {"error": e.message, "kind": e.kind}
            reason = f"Approved, but execution failed: {e.message}"
            extra["error_kind"] = e.kind
    latency = int((time.monotonic() - started) * 1000)
    updated = await db.approvals.find_one_and_update(
        {"_id": claimed["_id"]},
        {"$set": {"status": final, "result": result, "completed_at": datetime.now(timezone.utc)}},
        return_document=ReturnDocument.AFTER,
    )
    await write_audit(
        **_audit_fields(claimed, user),
        decision="approved_executed" if final == "executed" else "approved_failed",
        reason=reason, latency_ms=latency, **extra,
    )
    return _out(updated)


@router.post("/{approval_id}/reject")
async def reject(
    approval_id: str, body: RejectRequest, user: dict = Depends(get_current_user)
):
    a = await _get_owned(approval_id, user)
    now = datetime.now(timezone.utc)
    claimed = await get_db().approvals.find_one_and_update(
        {"_id": a["_id"], "status": "pending"},
        {"$set": {
            "status": "rejected", "decided_at": now, "decided_by": user["email"],
            "rejection_reason": (body.reason or "").strip() or None,
        }},
        return_document=ReturnDocument.AFTER,
    )
    if not claimed:
        raise HTTPException(status_code=409, detail=f"Approval is already {a['status']}")

    await write_audit(
        **_audit_fields(claimed, user),
        decision="rejected",
        reason=claimed["rejection_reason"] or "Rejected by reviewer",
    )
    return _out(claimed)


# ---------- agent polling endpoint ----------

@agent_router.get("/{approval_id}")
async def poll_approval(approval_id: str, agent: dict = Depends(get_agent_from_api_key)):
    if not ObjectId.is_valid(approval_id):
        raise HTTPException(status_code=404, detail="Approval not found")
    q = {  # an agent can only see its own approvals
        "_id": ObjectId(approval_id),
        "org_id": agent["org_id"],
        "agent_id": str(agent["_id"]),
    }
    await _expire_stale(q)
    a = await get_db().approvals.find_one(q)
    if not a:
        raise HTTPException(status_code=404, detail="Approval not found")

    done = a["status"] in ("executed", "failed")
    return {
        "approval_id": str(a["_id"]),
        "status": a["status"],  # keep polling while "pending" or "executing"
        "tool": a["tool_name"],
        "decided_at": a.get("decided_at"),
        "rejection_reason": a.get("rejection_reason"),
        "result": a.get("result") if done else None,
    }