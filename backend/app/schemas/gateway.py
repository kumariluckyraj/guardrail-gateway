from typing import Any

from pydantic import BaseModel, Field


class ToolCallRequest(BaseModel):
    tool: str = Field(pattern=r"^[a-z][a-z0-9_]{1,49}$")
    arguments: dict[str, Any] = Field(default_factory=dict)