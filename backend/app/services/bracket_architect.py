"""Module 57 - seeded single-elimination bracket (Decimal free)."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class BracketRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    teams: list[str] = Field(min_length=4, max_length=32)


class BracketMatch(BaseModel):
    slot: int
    home: str | None
    away: str | None
    bye: bool


class BracketRound(BaseModel):
    name: str
    matches: list[BracketMatch]


class BracketReport(BaseModel):
    bracket_size: int
    byes: int
    rounds: list[BracketRound]
    message: str


def analyze(request: BracketRequest) -> BracketReport:
    teams = [team.strip() for team in request.teams if team.strip()]
    if len(teams) != len(request.teams):
        raise ValueError("team names cannot be blank")
    if len(set(teams)) != len(teams):
        raise ValueError("team names must be unique")
    size = 4
    while size < len(teams):
        size *= 2
    byes = size - len(teams)
    first: list[BracketMatch] = []
    for index in range(size // 2):
        home = teams[index] if index < len(teams) else None
        away_index = size - 1 - index
        away = teams[away_index] if away_index < len(teams) else None
        first.append(
            BracketMatch(slot=index + 1, home=home, away=away, bye=home is None or away is None)
        )
    rounds = [BracketRound(name="R1", matches=first)]
    remaining = size // 2
    round_index = 2
    while remaining > 1:
        rounds.append(
            BracketRound(
                name=f"R{round_index}",
                matches=[
                    BracketMatch(slot=slot + 1, home=None, away=None, bye=False)
                    for slot in range(remaining // 2)
                ],
            )
        )
        remaining //= 2
        round_index += 1
    return BracketReport(
        bracket_size=size,
        byes=byes,
        rounds=rounds,
        message=f"Llave de {size} con {byes} byes y {len(rounds)} rondas.",
    )
