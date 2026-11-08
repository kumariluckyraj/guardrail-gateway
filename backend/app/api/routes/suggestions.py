import uuid
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pymongo import ReturnDocument

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.redis_client import get_redis
from app.services.advisor import analyze_one, find_candidates
from app.services.audit_service import write_audit

router = APIRouter(prefix="/suggestions", tags=["suggestions"])


def _out(s: dict) -> dict:
    return {
        "id": str(s["_id"]), "agent_name": s["agent_name"], "tool_name": s["tool_name"],
        "action": s["action"], "reason": s["reason"],
        "current_approval": s["current_approval"], "proposed_approval": s["proposed_approval"],
        "evidence": s["evidence"], "status": s["status"], "created_at": s["created_at"],
    }


async def _owned(suggestion_id: str, user: dict) -> dict:
    if not ObjectId.is_valid(suggestion_id):
        raise HTTPException(status_code=404, detail="Suggestion not found")
    s = await get_db().suggestions.find_one({"_id": ObjectId(suggestion_id), "org_id": user["org_id"]})
    if not s:
        raise HTTPException(status_code=404, detail="Suggestion not found")
    return s


@router.get("")
async def list_suggestions(status: str = "pending", user: dict = Depends(get_current_user)):
    cursor = get_db().suggestions.find({"org_id": user["org_id"], "status": status}).sort("_id", -1).limit(50)
    return [_out(s) async for s in cursor]


@router.post("/analyze")
async def analyze(user: dict = Depends(get_current_user)):
    # Only once every 20 seconds per company, so nobody burns the AI quota.
    if not await get_redis().set(f"adv:{user['org_id']}", "1", nx=True, ex=20):
        raise HTTPException(status_code=429, detail="Please wait a few seconds before analyzing again")

    candidates = await find_candidates(user["org_id"])
    created = 0
    for policy, tool, facts in candidates[:5]:  # at most 5 AI reviews per click
        if await analyze_one(user["org_id"], policy, tool, facts):
            created += 1
    return {"checked": min(len(candidates), 5), "new_suggestions": created}


@router.post("/{suggestion_id}/apply")
async def apply(suggestion_id: str, user: dict = Depends(get_current_user)):
    s = await _owned(suggestion_id, user)
    db = get_db()
    claimed = await db.suggestions.find_one_and_update(
        {"_id": s["_id"], "status": "pending"},
        {"$set": {"status": "applied", "decided_by": user["email"],
                  "decided_at": datetime.now(timezone.utc)}},
        return_document=ReturnDocument.AFTER,
    )
    if not claimed:
        raise HTTPException(status_code=409, detail=f"Suggestion is already {s['status']}")

    res = await db.policies.update_one(
        {"org_id": s["org_id"], "agent_id": s["agent_id"], "tool_id": s["tool_id"]},
        {"$set": {"approval": s["proposed_approval"], "updated_at": datetime.now(timezone.utc)}},
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=409, detail="The policy no longer exists")

    await write_audit(
        org_id=s["org_id"], agent_id=s["agent_id"], agent_name=s["agent_name"],
        tool_name=s["tool_name"], request_id=uuid.uuid4().hex, decision="policy_updated",
        reason=f"{user['email']} applied an AI suggestion ({s['action']})",
        arguments={"from": s["current_approval"], "to": s["proposed_approval"]},
        decided_by=user["email"],
    )
    return _out(claimed)


@router.post("/{suggestion_id}/dismiss")
async def dismiss(suggestion_id: str, user: dict = Depends(get_current_user)):
    s = await _owned(suggestion_id, user)
    claimed = await get_db().suggestions.find_one_and_update(
        {"_id": s["_id"], "status": "pending"},
        {"$set": {"status": "dismissed", "decided_by": user["email"]}},
        return_document=ReturnDocument.AFTER,
    )
    if not claimed:
        raise HTTPException(status_code=409, detail=f"Suggestion is already {s['status']}")
    return _out(claimed)