"""Module 5 — lightning tournaments, FIVB ranking and playoff brackets."""

from __future__ import annotations

from datetime import datetime, timedelta
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.services.mathx import ZERO, round2


class Team(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str
    club: str = ""


class MatchResult(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    home: str
    away: str
    home_sets: int = Field(ge=0, le=3)
    away_sets: int = Field(ge=0, le=3)
    home_points: int = Field(default=0, ge=0)
    away_points: int = Field(default=0, ge=0)
    court: str | None = None
    start: str | None = None


class Standing(BaseModel):
    position: int
    team: str
    played: int
    matches_won: int
    matches_lost: int
    ranking_points: int
    sets_won: int
    sets_lost: int
    sets_ratio: Decimal
    points_for: int
    points_against: int
    points_ratio: Decimal


class Fixture(BaseModel):
    round: int
    home: str
    away: str
    court: str | None = None
    start: str | None = None


def ranking_points(home_sets: int, away_sets: int) -> tuple[int, int]:
    """FIVB 3-2-1-0 table points."""
    if home_sets == 3 and away_sets in (0, 1):
        return (3, 0)
    if home_sets == 3 and away_sets == 2:
        return (2, 1)
    if away_sets == 3 and home_sets in (0, 1):
        return (0, 3)
    if away_sets == 3 and home_sets == 2:
        return (1, 2)
    raise ValueError(f"invalid final score {home_sets}-{away_sets}")


def _ratio(won: int, lost: int) -> Decimal:
    if lost == 0:
        return round2(Decimal(won)) if won else ZERO
    return round2(Decimal(won) / Decimal(lost))


def standings(team_names: list[str], matches: list[MatchResult]) -> list[Standing]:
    if len(set(team_names)) != len(team_names):
        raise ValueError("duplicate team names")
    table: dict[str, dict[str, int]] = {
        name: {
            "played": 0,
            "won": 0,
            "lost": 0,
            "points": 0,
            "sets_won": 0,
            "sets_lost": 0,
            "pf": 0,
            "pa": 0,
        }
        for name in team_names
    }
    for match in matches:
        if match.home not in table or match.away not in table:
            raise ValueError(f"unknown team in match {match.home} vs {match.away}")
        home_points, away_points = ranking_points(match.home_sets, match.away_sets)
        home = table[match.home]
        away = table[match.away]
        home["played"] += 1
        away["played"] += 1
        home["sets_won"] += match.home_sets
        home["sets_lost"] += match.away_sets
        away["sets_won"] += match.away_sets
        away["sets_lost"] += match.home_sets
        home["pf"] += match.home_points
        home["pa"] += match.away_points
        away["pf"] += match.away_points
        away["pa"] += match.home_points
        home["points"] += home_points
        away["points"] += away_points
        if match.home_sets > match.away_sets:
            home["won"] += 1
            away["lost"] += 1
        else:
            away["won"] += 1
            home["lost"] += 1

    rows = [
        Standing(
            position=0,
            team=name,
            played=row["played"],
            matches_won=row["won"],
            matches_lost=row["lost"],
            ranking_points=row["points"],
            sets_won=row["sets_won"],
            sets_lost=row["sets_lost"],
            sets_ratio=_ratio(row["sets_won"], row["sets_lost"]),
            points_for=row["pf"],
            points_against=row["pa"],
            points_ratio=_ratio(row["pf"], row["pa"]),
        )
        for name, row in table.items()
    ]
    rows.sort(
        key=lambda row: (
            -row.matches_won,
            -row.ranking_points,
            -row.sets_ratio,
            -row.points_ratio,
            row.team,
        )
    )
    for index, row in enumerate(rows, start=1):
        row.position = index
    return rows


def round_robin(teams: list[str]) -> list[Fixture]:
    if len(teams) < 2:
        raise ValueError("need at least two teams")
    if len(set(teams)) != len(teams):
        raise ValueError("duplicate team names")
    roster: list[str | None] = list(teams)
    if len(roster) % 2 == 1:
        roster.append(None)
    size = len(roster)
    fixtures: list[Fixture] = []
    for round_index in range(size - 1):
        for index in range(size // 2):
            home = roster[index]
            away = roster[size - 1 - index]
            if home is not None and away is not None:
                fixtures.append(Fixture(round=round_index + 1, home=home, away=away))
        roster = [roster[0], roster[-1], *roster[1:-1]]
    return fixtures


def schedule(
    fixtures: list[Fixture],
    courts: list[str],
    start: str = "09:00",
    slot_minutes: int = 45,
) -> list[Fixture]:
    if not courts:
        raise ValueError("at least one court is required")
    if slot_minutes <= 0:
        raise ValueError("slot_minutes must be positive")
    anchor = datetime.strptime(start, "%H:%M")
    rounds = sorted({fixture.round for fixture in fixtures})
    scheduled: list[Fixture] = []
    for round_position, round_number in enumerate(rounds):
        batch = [fixture for fixture in fixtures if fixture.round == round_number]
        for index, fixture in enumerate(batch):
            court = courts[index % len(courts)]
            wave = index // len(courts)
            moment = anchor + timedelta(minutes=slot_minutes * (round_position + wave))
            scheduled.append(
                fixture.model_copy(update={"court": court, "start": moment.strftime("%H:%M")})
            )
    return scheduled


def playoff_bracket(table: list[Standing], qualifiers: int = 4) -> dict[str, list[tuple[str, str]]]:
    if qualifiers not in (4, 8):
        raise ValueError("qualifiers must be 4 or 8")
    if len(table) < qualifiers:
        raise ValueError("not enough teams for the requested bracket")
    seeded = [row.team for row in table[:qualifiers]]
    if qualifiers == 4:
        return {
            "semifinals": [(seeded[0], seeded[3]), (seeded[1], seeded[2])],
            "final": [("Winner SF1", "Winner SF2")],
        }
    return {
        "quarterfinals": [
            (seeded[0], seeded[7]),
            (seeded[3], seeded[4]),
            (seeded[1], seeded[6]),
            (seeded[2], seeded[5]),
        ],
        "semifinals": [
            ("Winner QF1", "Winner QF2"),
            ("Winner QF3", "Winner QF4"),
        ],
        "final": [("Winner SF1", "Winner SF2")],
    }
