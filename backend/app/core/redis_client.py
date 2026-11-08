import redis.asyncio as redis
from redis.asyncio.retry import Retry
from redis.backoff import ExponentialBackoff
from redis.exceptions import ConnectionError, TimeoutError
from app.core.config import settings

_redis: redis.Redis | None = None


async def connect_redis() -> None:
    global _redis
    _redis = redis.from_url(
        settings.redis_url,
        decode_responses=True,
        socket_connect_timeout=15,
        socket_timeout=10,
        socket_keepalive=True,        # keep idle connections alive
        health_check_interval=15,     # ping idle connections before reuse
        retry_on_timeout=True,
        retry=Retry(ExponentialBackoff(cap=1, base=0.1), 3),
        retry_on_error=[ConnectionError, TimeoutError],
    )
    await _redis.ping()  # fail fast


async def close_redis() -> None:
    if _redis is not None:
        await _redis.aclose()


def get_redis() -> redis.Redis:
    if _redis is None:
        raise RuntimeError("Redis not initialised")
    return _redis


async def ping_redis() -> bool:
    try:
        return bool(await _redis.ping())
    except Exception:
        return False