from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.deps import get_current_user
from app.core.database import get_db

router = APIRouter(prefix="/audit", tags=["audit"])


@router.get("")
async def list_audit(
    agent_id: str | None = None,
    decision: str | None = None,
    tool: str | None = None,
    limit: int = Query(50, ge=1, le=100),
    before: str | None = None,  # pass next_before from the previous page
    user: dict = Depends(get_current_user),
):
    q: dict = {"org_id": user["org_id"]}  # tenant isolation
    if agent_id:
        q["agent_id"] = agent_id
    if decision:
        q["decision"] = decision
    if tool:
        q["tool_name"] = tool
    if before:
        if not ObjectId.is_valid(before):
            raise HTTPException(status_code=400, detail="Invalid cursor")
        q["_id"] = {"$lt": ObjectId(before)}

    items = []
    async for d in get_db().audit_logs.find(q).sort("_id", -1).limit(limit):
        d["id"] = str(d.pop("_id"))
        items.append(d)
    return {"items": items, "next_before": items[-1]["id"] if len(items) == limit else None}