from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.security import generate_api_key
from app.schemas.agent import AgentCreate, AgentOut, AgentWithKey

router = APIRouter(prefix="/agents", tags=["agents"])

MAX_AGENTS_PER_ORG = 10


def _agent_out(a: dict) -> dict:
    return {
        "id": str(a["_id"]),
        "name": a["name"],
        "description": a.get("description", ""),
        "key_prefix": a["key_prefix"],
        "status": a["status"],
        "created_at": a["created_at"],
        "last_used_at": a.get("last_used_at"),
    }


async def _get_owned_agent(agent_id: str, user: dict) -> dict:
    if not ObjectId.is_valid(agent_id):
        raise HTTPException(status_code=404, detail="Agent not found")
    agent = await get_db().agents.find_one(
        {"_id": ObjectId(agent_id), "org_id": user["org_id"]}  # tenant isolation
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post("", response_model=AgentWithKey, status_code=status.HTTP_201_CREATED)
async def create_agent(body: AgentCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    if await db.agents.count_documents({"org_id": user["org_id"]}) >= MAX_AGENTS_PER_ORG:
        raise HTTPException(status_code=400, detail="Agent limit reached")

    full_key, prefix, key_hash = generate_api_key()
    doc = {
        "org_id": user["org_id"],
        "name": body.name.strip(),
        "description": body.description.strip(),
        "key_prefix": prefix,
        "key_hash": key_hash,
        "status": "active",
        "created_at": datetime.now(timezone.utc),
        "last_used_at": None,
    }
    result = await db.agents.insert_one(doc)
    doc["_id"] = result.inserted_id
    return {**_agent_out(doc), "api_key": full_key}


@router.get("", response_model=list[AgentOut])
async def list_agents(user: dict = Depends(get_current_user)):
    cursor = get_db().agents.find({"org_id": user["org_id"]}).sort("created_at", -1)
    return [_agent_out(a) async for a in cursor]


@router.get("/{agent_id}", response_model=AgentOut)
async def get_agent(agent_id: str, user: dict = Depends(get_current_user)):
    return _agent_out(await _get_owned_agent(agent_id, user))


@router.post("/{agent_id}/rotate-key", response_model=AgentWithKey)
async def rotate_key(agent_id: str, user: dict = Depends(get_current_user)):
    agent = await _get_owned_agent(agent_id, user)
    if agent["status"] != "active":
        raise HTTPException(status_code=400, detail="Agent is revoked")

    full_key, prefix, key_hash = generate_api_key()
    await get_db().agents.update_one(
        {"_id": agent["_id"]}, {"$set": {"key_prefix": prefix, "key_hash": key_hash}}
    )
    agent["key_prefix"] = prefix
    return {**_agent_out(agent), "api_key": full_key}  # old key stops working immediately


@router.post("/{agent_id}/revoke", response_model=AgentOut)
async def revoke_agent(agent_id: str, user: dict = Depends(get_current_user)):
    agent = await _get_owned_agent(agent_id, user)
    await get_db().agents.update_one(
        {"_id": agent["_id"]}, {"$set": {"status": "revoked"}}
    )
    agent["status"] = "revoked"
    return _agent_out(agent)