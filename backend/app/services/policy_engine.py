import math
import operator
from typing import Any

OPS = {
    "gt": operator.gt, "gte": operator.ge,
    "lt": operator.lt, "lte": operator.le,
    "eq": operator.eq, "neq": operator.ne,
}


def _get_path(data: dict, path: str) -> tuple[Any, bool]:
    cur: Any = data
    for part in path.split("."):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
        else:
            return None, False
    return cur, True


def needs_approval(rule: dict, arguments: dict) -> tuple[bool, str]:
    """Returns (approval_required, reason)."""
    mode = rule.get("mode", "never")
    if mode == "never":
        return False, ""
    if mode == "always":
        return True, "Policy requires approval for every call to this tool"
    if mode != "conditional":
        return True, "Unknown approval mode, requiring approval"

    field, op, expected = rule.get("field"), rule.get("operator"), rule.get("value")
    if not field or op not in OPS or expected is None:
        return True, "Approval rule is incomplete, requiring approval"

    actual, found = _get_path(arguments, field)
    if not found:
        return True, f"Field '{field}' missing from arguments, requiring approval"
    if isinstance(actual, bool):
        return True, f"Field '{field}' is not comparable, requiring approval"

    try:
        if isinstance(expected, (int, float)):
            a, e = float(actual), float(expected)
            if math.isnan(a) or math.isinf(a):  # NaN compares False to everything
                return True, f"Field '{field}' is not a finite number, requiring approval"
            result = OPS[op](a, e)
        else:
            if op not in ("eq", "neq"):
                return True, "Rule cannot be evaluated, requiring approval"
            result = OPS[op](str(actual), str(expected))
    except (TypeError, ValueError):
        return True, f"Field '{field}' is not comparable, requiring approval"

    if result:
        return True, f"Approval required: {field} {op} {expected}"
    return False, ""