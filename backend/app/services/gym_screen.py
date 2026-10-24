"""Module 49 - gym giant screen payload (Decimal free)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class GymScreenRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = "Gym Scoreboard"
    score_a: int = Field(default=0, ge=0, le=99)
    score_b: int = Field(default=0, ge=0, le=99)
    set_a: int = Field(default=0, ge=0, le=3)
    set_b: int = Field(default=0, ge=0, le=3)
    serving: Literal["A", "B"] = "A"
    timer: str = "00:00"
    setter: str = ""


class GymScreenReport(BaseModel):
    title: str
    score_a: int
    score_b: int
    set_a: int
    set_b: int
    serving: Literal["A", "B"]
    timer: str
    setter: str
    full_screen: bool
    message: str


def analyze(request: GymScreenRequest) -> GymScreenReport:
    if request.timer.count(":") != 1:
        raise ValueError("timer must be mm:ss")
    return GymScreenReport(
        **request.model_dump(),
        full_screen=True,
        message=(
            f"{request.title}: {request.score_a}-{request.score_b}"
            f" set {request.set_a}-{request.set_b}."
        ),
    )
