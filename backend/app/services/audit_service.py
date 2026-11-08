import logging
from datetime import datetime, timezone
from typing import Any

from app.core.database import get_db

logger = logging.getLogger("gateway.audit")

SENSITIVE_KEYS = {
    "password", "passwd", "secret", "token", "api_key", "apikey",
    "authorization", "card_number", "cvv", "ssn",
}


def redact(value: Any, depth: int = 0) -> Any:
    if depth > 6:
        return "[truncated]"
    if isinstance(value, dict):
        return {
            k: "[REDACTED]" if str(k).lower() in SENSITIVE_KEYS else redact(v, depth + 1)
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [redact(v, depth + 1) for v in value[:50]]
    if isinstance(value, str):
        return value[:2000]
    return value


async def write_audit(**fields: Any) -> None:
    """Append-only. There is intentionally no update or delete function."""
    doc = {
        **fields,
        "arguments": redact(fields.get("arguments", {})),
        "created_at": datetime.now(timezone.utc),
    }
    try:
        await get_db().audit_logs.insert_one(doc)
    except Exception:
        logger.exception("AUDIT WRITE FAILED: %s", doc.get("request_id"))