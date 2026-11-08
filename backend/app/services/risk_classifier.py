import json

import httpx

from app.core.config import settings

# Used ONLY if the AI fails or answers badly: ask a human (never deny by accident).
SAFE = {
    "risk_level": "high",
    "deny": False,
    "approval": {"mode": "always", "field": None, "operator": None, "value": None},
    "rate_limit": {"max_calls": 10, "window_seconds": 60},
}

PROMPT = """You are a security reviewer for an AI agent gateway. Decide the rules for a NEW action.

Action name: {name}
Description: {description}
Names of the details the agent sends: {fields}

Guidelines:
- low risk: only reads data. approval "never".
- medium risk: creates or changes ordinary business data. Use approval "conditional" on a numeric
  detail if one exists (like amount), otherwise "always".
- high risk: changes personal or contact data of a customer, sends messages to people outside the
  company, deletes data, moves money, or changes security. approval "always".
- Anything that cannot be undone, or that affects a real person, must NOT be "never".
- deny: true ONLY for clearly dangerous actions (mass deletion, dropping databases, moving money out,
  exporting passwords, disabling security). If unsure, deny is false.
- max_calls and window_seconds: a sensible speed limit.

Examples:
- lookup_customer -> {{"risk":"low","deny":false,"approval":"never","field":null,"operator":null,"value":null,"max_calls":50,"window_seconds":60}}
- edit_customer_info -> {{"risk":"high","deny":false,"approval":"always","field":null,"operator":null,"value":null,"max_calls":10,"window_seconds":60}}
- create_quote (has amount) -> {{"risk":"medium","deny":false,"approval":"conditional","field":"amount","operator":"gt","value":100000,"max_calls":20,"window_seconds":60}}
- send_email -> {{"risk":"high","deny":false,"approval":"always","field":null,"operator":null,"value":null,"max_calls":10,"window_seconds":60}}

Answer with ONLY a JSON object in that same format."""

def _clean(raw: dict, field_names: list[str]) -> dict | None:
    risk = raw.get("risk")
    mode = raw.get("approval")
    if risk not in ("low", "medium", "high") or mode not in ("never", "always", "conditional"):
        return None
    field = operator = value = None
    if mode == "conditional":
        field, operator, value = raw.get("field"), raw.get("operator"), raw.get("value")
        if field not in field_names or operator not in ("gt", "gte", "lt", "lte", "eq", "neq") or value is None:
            return None
        if isinstance(value, bool) or not isinstance(value, (int, float, str)):
            return None
    try:
        max_calls = min(max(int(raw.get("max_calls", 30)), 1), 1000)
        window = min(max(int(raw.get("window_seconds", 60)), 1), 3600)
    except (TypeError, ValueError):
        return None
    return {
        "risk_level": risk,
        "deny": raw.get("deny") is True,
        "approval": {"mode": mode, "field": field, "operator": operator, "value": value},
        "rate_limit": {"max_calls": max_calls, "window_seconds": window},
    }


async def decide_rules(name: str, description: str, field_names: list[str]) -> dict:
    if not settings.groq_api_key:
        return SAFE
    prompt = PROMPT.format(name=name, description=description[:300] or "none",
                           fields=", ".join(field_names[:30]) or "none")
    try:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.groq_api_key}"},
                json={"model": settings.groq_model, "temperature": 0,
                      "messages": [{"role": "user", "content": prompt}]},
            )
        text = r.json()["choices"][0]["message"]["content"]
        raw = json.loads(text[text.index("{"): text.rindex("}") + 1])
        return _clean(raw, field_names) or SAFE
    except Exception:
        return SAFE