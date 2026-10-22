"""Module 27 - snake captain draft with a balance audit."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

CENT = Decimal("0.01")
Role = Literal["setter", "outside", "middle", "opposite", "libero"]
DEPARTMENTS: dict[str, str] = {
    "setter": "setting",
    "outside": "reception",
    "middle": "attack",
    "opposite": "attack",
    "libero": "reception",
}


class DraftPlayer(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=80)
    role: Role
    level: Decimal = Field(ge=Decimal("1"), le=Decimal("5"))


class DraftRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    captains: list[str] = Field(min_length=2, max_length=4)
    players: list[DraftPlayer] = Field(min_length=1, max_length=60)

    @model_validator(mode="after")
    def _unique_captains(self) -> Self:
        if len(set(self.captains)) != len(self.captains):
            raise ValueError("captain names must be unique")
        return self


class DraftPick(BaseModel):
    pick: int
    captain: str
    player: DraftPlayer


class DraftTeam(BaseModel):
    captain: str
    players: list[DraftPlayer]
    count: int
    total_level: Decimal
    average_level: Decimal
    departments: dict[str, int]
    weakest_department: str | None
    balanced: bool


class DraftReport(BaseModel):
    captains: list[str]
    pick_order: list[DraftPick]
    teams: list[DraftTeam]
    bench: list[DraftPlayer]
    total_level: Decimal
    best_balance: str
    message: str


def snake_draft(request: DraftRequest) -> DraftReport:
    ordered = sorted(request.players, key=lambda player: (-player.level, player.name))
    total = len(ordered)
    captains = request.captains
    picks: list[DraftPick] = []
    teams: dict[str, list[DraftPlayer]] = {captain: [] for captain in captains}
    cursor = 0
    round_index = 0
    while cursor < total:
        order = list(range(len(captains)))
        if round_index % 2 == 1:
            order.reverse()
        for team_index in order:
            if cursor >= total:
                break
            captain = captains[team_index]
            teams[captain].append(ordered[cursor])
            picks.append(
                DraftPick(pick=cursor + 1, captain=captain, player=ordered[cursor])
            )
            cursor += 1
        round_index += 1
    rows: list[DraftTeam] = []
    for captain in captains:
        roster = teams[captain]
        level = sum((player.level for player in roster), Decimal("0"))
        departments: dict[str, int] = {}
        for player in roster:
            department = DEPARTMENTS[player.role]
            departments[department] = departments.get(department, 0) + 1
        weakest = next(
            (
                department
                for department in ("setting", "reception", "attack")
                if departments.get(department, 0) == 0
            ),
            None,
        )
        rows.append(
            DraftTeam(
                captain=captain,
                players=roster,
                count=len(roster),
                total_level=level,
                average_level=(
                    level / Decimal(len(roster)) if roster else Decimal("0")
                ).quantize(CENT, rounding=ROUND_HALF_UP),
                departments=departments,
                weakest_department=weakest,
                balanced=weakest is None,
            )
        )
    best = next((team.captain for team in rows if team.balanced), rows[0].captain)
    return DraftReport(
        captains=captains,
        pick_order=picks,
        teams=rows,
        bench=ordered[cursor:],
        total_level=sum((player.level for player in ordered), Decimal("0")),
        best_balance=best,
        message=(
            "Draft serpiente generado: el orden invierte cada ronda para que el "
            "último turno recupere ventaja y el plantel quede auditado por departamento."
        ),
    )
