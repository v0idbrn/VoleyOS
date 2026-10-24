"""Module 56 - decider and golden point command (Decimal only)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Side = Literal["A", "B"]


class TiebreakRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    score_a: int = Field(ge=0, le=99)
    score_b: int = Field(ge=0, le=99)
    serving: Side = "A"
    best_of: int = 3
    golden_point: bool = False


class TiebreakReport(BaseModel):
    target: int
    phase: str
    match_point: bool
    side_switch_due: bool
    recommendation: str
    message: str


def analyze(request: TiebreakRequest) -> TiebreakReport:
    if request.best_of not in (3, 5):
        raise ValueError("best_of must be 3 or 5")
    tied = request.score_a == request.score_b
    phase = "golden_point" if tied and request.score_a >= 14 and request.golden_point else "normal"
    target = 15 if phase == "golden_point" else 15
    own = request.score_a if request.serving == "A" else request.score_b
    rival = request.score_b if request.serving == "A" else request.score_a
    match_point = own >= target - 1 and own > rival
    side_switch_due = request.score_a + request.score_b == 8
    if phase == "golden_point":
        recommendation = f"Punto de oro: saque agresivo de {request.serving} y bloqueo 1-1."
    elif match_point:
        recommendation = (
            f"Match point {request.serving}: saque al mejor receptor y cobertura lista."
        )
    else:
        recommendation = "Jugar saque seguro, cerrar con pipe y defender la diagonal."
    return TiebreakReport(
        target=target,
        phase=phase,
        match_point=match_point,
        side_switch_due=side_switch_due,
        recommendation=recommendation,
        message=f"{request.score_a}-{request.score_b} desde 15, fase {phase}.",
    )
