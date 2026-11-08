import os

import httpx

from app.config import settings

_AUTH = {"Authorization": f"Bearer {settings.gateway_api_key}"}

# Online, the service runs on a port chosen by Render (PORT). Locally it is 8001.
LOCAL_BASE = f"http://127.0.0.1:{os.getenv('PORT', '8001')}"

# Short descriptions help the gateway's AI rate the risk correctly.
DESCRIPTIONS = {
    "lookup_customer": "Reads customer records (read only)",
    "send_email": "Sends an email to a customer",
    "create_quote": "Creates a quotation for a customer",
    "update_crm_record": "Updates a customer's CRM stage or notes",
      "edit_customer_info": "Changes a real customer's personal contact details (email, phone). Hard to undo",
    "send_email": "Sends an email to an outside customer on behalf of the company. Cannot be undone",
}

# Where each action really runs (the mock tools in this same service).
LOCAL = {
    "lookup_customer": ("GET", "/mock/crm/lookup"),
    "send_email": ("POST", "/mock/email/send"),
    "create_quote": ("POST", "/mock/quote/create"),
    "update_crm_record": ("POST", "/mock/crm/update"),
    "edit_customer_info": ("POST", "/mock/customer/edit"),
    "delete_all_customers": ("POST", "/mock/customer/delete-all"),
}


def _json(r: httpx.Response) -> dict:
    try:
        data = r.json()
        return data if isinstance(data, dict) else {"detail": data}
    except ValueError:
        return {"detail": r.text[:300]}


async def check(tool: str, arguments: dict, idem_key: str) -> tuple[int, dict]:
    """Ask the gateway for permission. Status 0 means the gateway was unreachable."""
    try:
        async with httpx.AsyncClient(base_url=settings.gateway_url, timeout=30) as c:
            r = await c.post(
                "/v1/check",
                json={"tool": tool, "arguments": arguments,
                      "description": DESCRIPTIONS.get(tool, "")},
                headers=_AUTH,
            )
    except httpx.HTTPError:
        return 0, {"decision": "error", "reason": "Gateway unreachable"}
    return r.status_code, _json(r)


async def run_local(tool: str, arguments: dict, request_id: str) -> tuple[int, dict]:
    """Run the action ourselves, after the gateway said yes."""
    method, path = LOCAL[tool]
    headers = {"X-Guardrail-Request-Id": request_id}  # the mock tools require this header
    try:
        async with httpx.AsyncClient(base_url=LOCAL_BASE, timeout=20) as c:
            if method == "GET":
                r = await c.get(path, params=arguments, headers=headers)
            else:
                r = await c.post(path, json=arguments, headers=headers)
    except httpx.HTTPError:
        return 0, {"detail": "Could not run the action"}
    return r.status_code, _json(r)


async def poll_approval(approval_id: str) -> tuple[int, dict]:
    try:
        async with httpx.AsyncClient(base_url=settings.gateway_url, timeout=15) as c:
            r = await c.get(f"/v1/approvals/{approval_id}", headers=_AUTH)
    except httpx.HTTPError:
        return 0, {}
    return r.status_code, _json(r)