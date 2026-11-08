from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

RiskLevel = Literal["low", "medium", "high"]
HttpMethod = Literal["GET", "POST", "PUT", "PATCH", "DELETE"]


class ToolCreate(BaseModel):
    name: str = Field(pattern=r"^[a-z][a-z0-9_]{1,49}$")  # e.g. send_email
    description: str = Field(default="", max_length=500)
    upstream_url: str = Field(min_length=8, max_length=500)
    http_method: HttpMethod = "POST"
    risk_level: RiskLevel = "low"
    timeout_seconds: int = Field(default=10, ge=1, le=30)


class ToolUpdate(BaseModel):  # name is immutable, because policies refer to it
    description: str | None = Field(default=None, max_length=500)
    upstream_url: str | None = Field(default=None, min_length=8, max_length=500)
    http_method: HttpMethod | None = None
    risk_level: RiskLevel | None = None
    timeout_seconds: int | None = Field(default=None, ge=1, le=30)


class ToolOut(BaseModel):
    id: str
    name: str
    description: str
    upstream_url: str
    http_method: HttpMethod
    risk_level: RiskLevel
    timeout_seconds: int
    created_at: datetime