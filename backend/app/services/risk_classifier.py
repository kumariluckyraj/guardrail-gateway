import json

import httpx

from app.core.config import settings

# Used ONLY if the AI fails or answers badly: the strictest choice.
SAFE = {
    "risk_level": "high",
    "approval": {"mode": "always", "field": None, "operator": None, "value": None},
    "rate_limit": {"max_calls": 10, "window_seconds": 60},
}

PROMPT = """You are a security reviewer for an AI agent gateway. Decide the rules for a NEW action.

Action name: {name}
Description: {description}
Names of the details the agent sends: {fields}

Decide:
- risk: low (only reads), medium (creates or changes ordinary data), high (deletes, moves money,
  changes personal or security data, sends things that cannot be undone).
- approval: never (safe to run alone), always (a human must approve every time), or
  conditional (a human approves only when one numeric detail is too big or small).
  For conditional you must give "field" (one of the detail names above), "operator"
  (gt, gte, lt, lte, eq, neq) and "value".
- max_calls and window_seconds: a sensible speed limit.

Answer with ONLY a JSON object like:
{{"risk":"medium","approval":"conditional","field":"amount","operator":"gt","value":100000,"max_calls":20,"window_seconds":60}}
Use null for field, operator and value when approval is never or always."""


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