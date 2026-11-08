from datetime import datetime

from pydantic import BaseModel, Field


class AgentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: str = Field(default="", max_length=500)


class AgentOut(BaseModel):
    id: str
    name: str
    description: str
    key_prefix: str
    status: str  # "active" | "revoked"
    created_at: datetime
    last_used_at: datetime | None = None


class AgentWithKey(AgentOut):
    api_key: str  # returned ONLY on create and rotate