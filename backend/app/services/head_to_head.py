"""Module 59 - head-to-head history (Decimal free)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class H2HMatch(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sets_a: int = Field(ge=0, le=5)
    sets_b: int = Field(ge=0, le=5)


class H2HRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    team_a: str
    team_b: str
    matches: list[H2HMatch] = Field(min_length=1)


class H2HReport(BaseModel):
    wins_a: int
    wins_b: int
    sets_a: int
    sets_b: int
    leader: str
    streak: str
    message: str


def analyze(request: H2HRequest) -> H2HReport:
    if not request.team_a.strip() or not request.team_b.strip():
        raise ValueError("both team names are required")
    wins_a = sum(1 for match in request.matches if match.sets_a > match.sets_b)
    wins_b = sum(1 for match in request.matches if match.sets_b > match.sets_a)
    sets_a = sum(match.sets_a for match in request.matches)
    sets_b = sum(match.sets_b for match in request.matches)
    leader = request.team_a if wins_a >= wins_b else request.team_b
    last = request.matches[-1]
    streak_team = request.team_a if last.sets_a > last.sets_b else request.team_b
    streak = 1
    for match in reversed(request.matches[:-1]):
        winner = request.team_a if match.sets_a > match.sets_b else request.team_b
        if winner != streak_team:
            break
        streak += 1
    return H2HReport(
        wins_a=wins_a,
        wins_b=wins_b,
        sets_a=sets_a,
        sets_b=sets_b,
        leader=leader,
        streak=f"{streak_team} x{streak}",
        message=(
            f"{leader} lidera {max(wins_a, wins_b)}-{min(wins_a, wins_b)}"
            f" en {len(request.matches)} partidos."
        ),
    )
