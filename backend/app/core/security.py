from datetime import datetime, timedelta, timezone
import hashlib
import secrets
import bcrypt
import jwt

from app.core.config import settings

ALGORITHM = "HS256"

API_KEY_PREFIX = "gk_live_"


def generate_api_key() -> tuple[str, str, str]:
    """Returns (full_key, display_prefix, sha256_hash)."""
    full_key = API_KEY_PREFIX + secrets.token_urlsafe(32)
    return full_key, full_key[:12], hash_api_key(full_key)


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "iat": now,
        "exp": now + timedelta(minutes=settings.jwt_expire_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGORITHM)


def decode_access_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGORITHM])
        return payload.get("sub")
    except jwt.PyJWTError:
        return None