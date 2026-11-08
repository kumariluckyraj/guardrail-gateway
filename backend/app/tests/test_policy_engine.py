from app.services.policy_engine import needs_approval

RULE = {"mode": "conditional", "field": "amount", "operator": "gt", "value": 100000}


def test_below_threshold():
    assert needs_approval(RULE, {"amount": 50000})[0] is False


def test_equal_is_not_greater():
    assert needs_approval(RULE, {"amount": 100000})[0] is False


def test_above_threshold():
    assert needs_approval(RULE, {"amount": 150000})[0] is True


def test_numeric_string_is_coerced():
    assert needs_approval(RULE, {"amount": "150000"})[0] is True


def test_missing_field_fails_safe():
    assert needs_approval(RULE, {})[0] is True


def test_nan_and_inf_fail_safe():
    assert needs_approval(RULE, {"amount": "nan"})[0] is True
    assert needs_approval(RULE, {"amount": float("nan")})[0] is True
    assert needs_approval(RULE, {"amount": "inf"})[0] is True


def test_non_number_and_bool_fail_safe():
    assert needs_approval(RULE, {"amount": "lots"})[0] is True
    assert needs_approval(RULE, {"amount": True})[0] is True


def test_nested_field():
    rule = {**RULE, "field": "order.amount"}
    assert needs_approval(rule, {"order": {"amount": 200000}})[0] is True


def test_modes():
    assert needs_approval({"mode": "never"}, {})[0] is False
    assert needs_approval({"mode": "always"}, {})[0] is True
    assert needs_approval({"mode": "weird"}, {})[0] is True