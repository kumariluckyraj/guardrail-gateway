from bson import ObjectId
from fastapi import Depends, HTTPException, Request, status
from datetime import datetime, timezone

from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import hash_api_key
from app.core.database import get_db
from app.core.security import decode_access_token

COOKIE_NAME = "access_token"


async def get_current_user(request: Request) -> dict:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated"
    )

    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise unauthorized

    user_id = decode_access_token(token)
    if not user_id or not ObjectId.is_valid(user_id):
        raise unauthorized

    user = await get_db().users.find_one({"_id": ObjectId(user_id)})
    if not user or not user.get("is_active", True):
        raise unauthorized
    return user

bearer_scheme = HTTPBearer(auto_error=False, description="Agent API key (gk_live_...)")


async def get_agent_from_api_key(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    invalid = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing API key",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if creds is None or not creds.credentials.startswith("gk_live_"):
        raise invalid

    db = get_db()
    agent = await db.agents.find_one(
        {"key_hash": hash_api_key(creds.credentials), "status": "active"}
    )
    if not agent:
        raise invalid

    await db.agents.update_one(
        {"_id": agent["_id"]}, {"$set": {"last_used_at": datetime.now(timezone.utc)}}
    )
    return agent