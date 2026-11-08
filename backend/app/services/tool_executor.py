import json
from typing import Any

import httpx

from app.services.url_validator import validate_upstream_url

MAX_RESPONSE_BYTES = 1_000_000


class UpstreamError(Exception):
    def __init__(self, kind: str, message: str):
        super().__init__(message)
        self.kind = kind  # "blocked" | "timeout" | "network" | "too_large"
        self.message = message


async def execute_tool(tool: dict, arguments: dict, request_id: str, agent_id: str) -> dict[str, Any]:
    # Re-validate at call time: DNS can change after the tool was registered.
    try:
        url = await validate_upstream_url(tool["upstream_url"])
    except ValueError:
        raise UpstreamError("blocked", "Upstream URL failed safety validation")

    method = tool["http_method"]
    headers = {
        "X-Guardrail-Request-Id": request_id,
        "X-Guardrail-Agent-Id": agent_id,
        "User-Agent": "agent-guardrail-gateway/0.1",
    }
    if method == "GET":
        kwargs: dict[str, Any] = {
            "params": {k: v for k, v in arguments.items() if isinstance(v, (str, int, float, bool))}
        }
    else:
        kwargs = {"json": arguments}

    try:
        async with httpx.AsyncClient(
            follow_redirects=False,  # a redirect could bounce us to an internal address
            timeout=httpx.Timeout(tool["timeout_seconds"]),
        ) as client:
            async with client.stream(method, url, headers=headers, **kwargs) as resp:
                size, chunks = 0, []
                async for chunk in resp.aiter_bytes():
                    size += len(chunk)
                    if size > MAX_RESPONSE_BYTES:
                        raise UpstreamError("too_large", "Upstream response too large")
                    chunks.append(chunk)
                status_code = resp.status_code
    except httpx.TimeoutException:
        raise UpstreamError("timeout", "Upstream tool timed out")
    except httpx.HTTPError:
        raise UpstreamError("network", "Could not reach upstream tool")

    raw = b"".join(chunks)
    try:
        body: Any = json.loads(raw) if raw else None
    except ValueError:
        body = raw.decode("utf-8", "replace")[:10000]
    return {"status_code": status_code, "body": body}