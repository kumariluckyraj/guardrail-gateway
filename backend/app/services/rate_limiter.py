import math
import uuid

from app.core.redis_client import get_redis

LUA = """
local key = KEYS[1]
local window = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local t = redis.call('TIME')
local now = t[1] * 1000 + math.floor(t[2] / 1000)

redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
local count = redis.call('ZCARD', key)
if count >= limit then
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retry = window
  if oldest[2] then retry = window - (now - tonumber(oldest[2])) end
  return {0, count, retry}
end
redis.call('ZADD', key, now, now .. ':' .. ARGV[3])
redis.call('PEXPIRE', key, window)
return {1, count + 1, 0}
"""


async def check_rate_limit(
    agent_id: str, tool_id: str, max_calls: int, window_seconds: int
) -> tuple[bool, int, int]:
    """Returns (allowed, current_count, retry_after_seconds). Raises RedisError if Redis is down."""
    script = get_redis().register_script(LUA)
    allowed, count, retry_ms = await script(
        keys=[f"rl:{agent_id}:{tool_id}"],
        args=[window_seconds * 1000, max_calls, uuid.uuid4().hex],
    )
    return bool(int(allowed)), int(count), max(1, math.ceil(int(retry_ms) / 1000))