"""Auto-generated service for module."""
from __future__ import annotations

from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class Request(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data: dict[str, Any] = Field(default_factory=dict)


class Report(BaseModel):
    ok: bool = True
    message: str = "ok"
    result: dict[str, Any] = Field(default_factory=dict)


def analyze(request: Request) -> Report:
    return Report(ok=True, message="ok", result={"data": request.data})
