from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class RateLimit(BaseModel):
    max_calls: int = Field(ge=1, le=100000)
    window_seconds: int = Field(ge=1, le=86400)


class ApprovalRule(BaseModel):
    # never: run immediately | always: human approves every call
    # conditional: human approves only when arguments[field] <operator> value
    mode: Literal["never", "always", "conditional"] = "never"
    field: str | None = Field(default=None, max_length=100)  # e.g. "amount"
    operator: Literal["gt", "gte", "lt", "lte", "eq", "neq"] | None = None
    value: float | str | None = None

    @model_validator(mode="after")
    def check_conditional(self):
        if self.mode == "conditional" and not (
            self.field and self.operator and self.value is not None
        ):
            raise ValueError("conditional mode needs field, operator and value")
        return self


class PolicyUpsert(BaseModel):
    agent_id: str
    tool_id: str
    allowed: bool = True
    rate_limit: RateLimit | None = None   # None -> safe default (60 calls / 60 s)
    approval: ApprovalRule | None = None  # None -> "always" for high risk, else "never"


class PolicyOut(BaseModel):
    id: str
    agent_id: str
    tool_id: str
    tool_name: str
    allowed: bool
    rate_limit: RateLimit
    approval: ApprovalRule
    created_at: datetime
    updated_at: datetime