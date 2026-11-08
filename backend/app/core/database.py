from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase

from app.core.config import settings

_client: AsyncMongoClient | None = None


async def connect_db() -> None:
    global _client
    _client = AsyncMongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
    await _client.admin.command("ping")  # fail fast if Atlas is unreachable


async def close_db() -> None:
    if _client is not None:
        await _client.close()


def get_db() -> AsyncDatabase:
    if _client is None:
        raise RuntimeError("Database not initialised")
    return _client[settings.mongodb_db]


async def ping_db() -> bool:
    try:
        await _client.admin.command("ping")
        return True
    except Exception:
        return False

async def ensure_indexes() -> None:
    db = get_db()
    await db.users.create_index("email", unique=True)
    await db.agents.create_index("key_hash", unique=True)
    await db.agents.create_index([("org_id", 1), ("created_at", -1)])
    await db.tools.create_index([("org_id", 1), ("name", 1)], unique=True)
    await db.policies.create_index(
        [("org_id", 1), ("agent_id", 1), ("tool_id", 1)], unique=True
    )
    await db.audit_logs.create_index([("org_id", 1), ("_id", -1)])
    await db.audit_logs.create_index([("org_id", 1), ("agent_id", 1), ("_id", -1)])
    await db.approvals.create_index([("org_id", 1), ("status", 1), ("created_at", -1)])