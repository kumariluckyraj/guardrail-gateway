from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.api.deps import get_current_user
from app.core.database import get_db
from app.schemas.policy import PolicyOut, PolicyUpsert

router = APIRouter(prefix="/policies", tags=["policies"])

DEFAULT_RATE_LIMIT = {"max_calls": 60, "window_seconds": 60}


def _policy_out(p: dict) -> dict:
    return {
        "id": str(p["_id"]),
        "agent_id": p["agent_id"],
        "tool_id": p["tool_id"],
        "tool_name": p["tool_name"],
        "allowed": p["allowed"],
        "rate_limit": p["rate_limit"],
        "approval": p["approval"],
        "created_at": p["created_at"],
        "updated_at": p["updated_at"],
    }


async def _owned(collection: str, id_: str, user: dict, label: str) -> dict:
    if not ObjectId.is_valid(id_):
        raise HTTPException(status_code=404, detail=f"{label} not found")
    doc = await get_db()[collection].find_one(
        {"_id": ObjectId(id_), "org_id": user["org_id"]}  # tenant isolation
    )
    if not doc:
        raise HTTPException(status_code=404, detail=f"{label} not found")
    return doc


@router.put("", response_model=PolicyOut)
async def upsert_policy(body: PolicyUpsert, user: dict = Depends(get_current_user)):
    """Create or fully replace the policy for one (agent, tool) pair."""
    agent = await _owned("agents", body.agent_id, user, "Agent")
    tool = await _owned("tools", body.tool_id, user, "Tool")

    rate_limit = (body.rate_limit or None) and body.rate_limit.model_dump()
    approval = body.approval.model_dump() if body.approval else {
        "mode": "always" if tool["risk_level"] == "high" else "never",
        "field": None,
        "operator": None,
        "value": None,
    }

    now = datetime.now(timezone.utc)
    db = get_db()
    key = {
        "org_id": user["org_id"],
        "agent_id": str(agent["_id"]),
        "tool_id": str(tool["_id"]),
    }
    await db.policies.update_one(
        key,
        {
            "$set": {
                "tool_name": tool["name"],
                "allowed": body.allowed,
                "rate_limit": rate_limit or DEFAULT_RATE_LIMIT,
                "approval": approval,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    return _policy_out(await db.policies.find_one(key))


@router.get("", response_model=list[PolicyOut])
async def list_policies(
    agent_id: str | None = None, user: dict = Depends(get_current_user)
):
    query: dict = {"org_id": user["org_id"]}
    if agent_id:
        query["agent_id"] = agent_id
    cursor = get_db().policies.find(query).sort("tool_name", 1)
    return [_policy_out(p) async for p in cursor]


@router.delete("/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy(policy_id: str, user: dict = Depends(get_current_user)):
    policy = await _owned("policies", policy_id, user, "Policy")
    await get_db().policies.delete_one({"_id": policy["_id"]})
    return Response(status_code=status.HTTP_204_NO_CONTENT)