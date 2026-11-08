from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pymongo.errors import DuplicateKeyError

from app.api.deps import get_current_user
from app.core.database import get_db
from app.schemas.tool import ToolCreate, ToolOut, ToolUpdate
from app.services.url_validator import validate_upstream_url

router = APIRouter(prefix="/tools", tags=["tools"])

MAX_TOOLS_PER_ORG = 50


def _tool_out(t: dict) -> dict:
    return {
        "id": str(t["_id"]),
        "name": t["name"],
        "description": t.get("description", ""),
        "upstream_url": t["upstream_url"],
        "http_method": t["http_method"],
        "risk_level": t["risk_level"],
        "timeout_seconds": t["timeout_seconds"],
        "created_at": t["created_at"],
    }


async def _get_owned_tool(tool_id: str, user: dict) -> dict:
    if not ObjectId.is_valid(tool_id):
        raise HTTPException(status_code=404, detail="Tool not found")
    tool = await get_db().tools.find_one(
        {"_id": ObjectId(tool_id), "org_id": user["org_id"]}
    )
    if not tool:
        raise HTTPException(status_code=404, detail="Tool not found")
    return tool


async def _checked_url(url: str) -> str:
    try:
        return await validate_upstream_url(url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid upstream_url: {e}")


@router.post("", response_model=ToolOut, status_code=status.HTTP_201_CREATED)
async def create_tool(body: ToolCreate, user: dict = Depends(get_current_user)):
    db = get_db()
    if await db.tools.count_documents({"org_id": user["org_id"]}) >= MAX_TOOLS_PER_ORG:
        raise HTTPException(status_code=400, detail="Tool limit reached")

    doc = {
        "org_id": user["org_id"],
        "name": body.name,
        "description": body.description.strip(),
        "upstream_url": await _checked_url(body.upstream_url),
        "http_method": body.http_method,
        "risk_level": body.risk_level,
        "timeout_seconds": body.timeout_seconds,
        "created_at": datetime.now(timezone.utc),
    }
    try:
        result = await db.tools.insert_one(doc)
    except DuplicateKeyError:
        raise HTTPException(status_code=409, detail="A tool with this name already exists")
    doc["_id"] = result.inserted_id
    return _tool_out(doc)


@router.get("", response_model=list[ToolOut])
async def list_tools(user: dict = Depends(get_current_user)):
    cursor = get_db().tools.find({"org_id": user["org_id"]}).sort("name", 1)
    return [_tool_out(t) async for t in cursor]


@router.get("/{tool_id}", response_model=ToolOut)
async def get_tool(tool_id: str, user: dict = Depends(get_current_user)):
    return _tool_out(await _get_owned_tool(tool_id, user))


@router.patch("/{tool_id}", response_model=ToolOut)
async def update_tool(
    tool_id: str, body: ToolUpdate, user: dict = Depends(get_current_user)
):
    tool = await _get_owned_tool(tool_id, user)
    changes = body.model_dump(exclude_unset=True, exclude_none=True)
    if "upstream_url" in changes:
        changes["upstream_url"] = await _checked_url(changes["upstream_url"])
    if changes:
        await get_db().tools.update_one({"_id": tool["_id"]}, {"$set": changes})
        tool.update(changes)
    return _tool_out(tool)


@router.delete("/{tool_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tool(tool_id: str, user: dict = Depends(get_current_user)):
    tool = await _get_owned_tool(tool_id, user)
    db = get_db()
    await db.policies.delete_many({"tool_id": str(tool["_id"]), "org_id": user["org_id"]})
    await db.tools.delete_one({"_id": tool["_id"]})
    return Response(status_code=status.HTTP_204_NO_CONTENT)