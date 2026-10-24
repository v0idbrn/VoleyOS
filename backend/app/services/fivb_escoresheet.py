"""Module 50 - printable FIVB scoresheet summary (Decimal free)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class SetScore(BaseModel):
    model_config = ConfigDict(extra="forbid")

    a: int = Field(ge=0, le=99)
    b: int = Field(ge=0, le=99)


class ScoresheetRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    match_no: str = "M-001"
    team_a: str
    team_b: str
    sets: list[SetScore] = Field(min_length=2, max_length=5)
    substitutions: int = Field(default=0, ge=0, le=36)
    sanctions: int = Field(default=0, ge=0, le=10)


class ScoresheetReport(BaseModel):
    sets_a: int
    sets_b: int
    winner: str
    total_points: int
    lines: list[str]
    complete: bool
    message: str


def analyze(request: ScoresheetRequest) -> ScoresheetReport:
    sets_a = sum(1 for item in request.sets if item.a > item.b)
    sets_b = sum(1 for item in request.sets if item.b > item.a)
    winner = request.team_a if sets_a > sets_b else request.team_b
    total = sum(item.a + item.b for item in request.sets)
    complete = max(sets_a, sets_b) >= 2 or len(request.sets) == 5
    lines = [
        f"FIVB {request.match_no} | {request.team_a} vs {request.team_b}",
        *[f"Set {index + 1}: {item.a}-{item.b}" for index, item in enumerate(request.sets)],
        f"Sets: {sets_a}-{sets_b} | Cambios: {request.substitutions}"
        f" | Sanciones: {request.sanctions}",
        f"Ganador: {winner}",
    ]
    return ScoresheetReport(
        sets_a=sets_a,
        sets_b=sets_b,
        winner=winner,
        total_points=total,
        lines=lines,
        complete=complete,
        message=f"Acta A4 con {len(request.sets)} sets y {total} puntos.",
    )
