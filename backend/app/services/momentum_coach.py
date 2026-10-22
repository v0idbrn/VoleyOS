"""Module 26 - momentum coach with break-point and rotation pressure readings."""

from __future__ import annotations

from collections.abc import Sequence
from decimal import ROUND_HALF_UP, Decimal
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

CENT = Decimal("0.01")
HUNDRED = Decimal("100")


class MomentumRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    team: Literal["A", "B"] = "A"
    rally_winner_history: list[Literal["A", "B"]] = Field(min_length=1, max_length=200)
    rotation_history: list[int] = Field(default_factory=list, max_length=200)

    @model_validator(mode="after")
    def _check_rotations(self) -> Self:
        if self.rotation_history and len(self.rotation_history) != len(
            self.rally_winner_history
        ):
            raise ValueError("rotation_history must match rally_winner_history")
        if any(rotation < 1 or rotation > 6 for rotation in self.rotation_history):
            raise ValueError("rotations must be between 1 and 6")
        return self


class MomentumReport(BaseModel):
    team: str
    serving_now: str
    momentum_index: Decimal
    consecutive_breaks: int
    opponent_run: int
    worst_rotation: int | None
    worst_run: int
    recommendation: str
    sample_size: int
    message: str


def _trailing_run(history: Sequence[str], winner: str) -> int:
    run = 0
    for point in reversed(history):
        if point != winner:
            break
        run += 1
    return run


def _break_count(history: Sequence[str]) -> int:
    serving = "A"
    breaks = 0
    for winner in history:
        if winner != serving:
            breaks += 1
        serving = winner
    return breaks


def _worst_rotation(
    history: Sequence[str], rotations: Sequence[int], team: str
) -> tuple[int | None, int]:
    if not rotations:
        return None, 0
    pressure: dict[int, int] = {}
    for winner, rotation in zip(history, rotations, strict=True):
        if winner != team:
            pressure[rotation] = pressure.get(rotation, 0) + 1
    if not pressure:
        return None, 0
    rotation, run = max(pressure.items(), key=lambda item: (item[1], -item[0]))
    return rotation, run


def analyze_momentum(request: MomentumRequest) -> MomentumReport:
    history = request.rally_winner_history
    opponent = "B" if request.team == "A" else "A"
    window = history[-6:]
    team_points = window.count(request.team)
    opponent_points = len(window) - team_points
    index = (
        Decimal(team_points - opponent_points) * HUNDRED / Decimal(len(window))
    ).quantize(CENT, rounding=ROUND_HALF_UP)
    opponent_run = _trailing_run(history, opponent)
    worst_rotation, worst_run = _worst_rotation(
        history, request.rotation_history, request.team
    )
    if opponent_run >= 5:
        recommendation = "URGENT_TIMEOUT_OR_SUB_5_RUN"
        message = "Racha de 5 o más: tiempo muerto urgente o sustitución inmediata."
    elif opponent_run >= 3:
        recommendation = "CALL_TIMEOUT_NOW_3_RUN"
        message = "Racha de 3: pide tiempo muerto ahora para cortar el impulso."
    else:
        recommendation = "HOLD"
        message = "Sin racha crítica: mantén la rotación y el plan de saque."
    return MomentumReport(
        team=request.team,
        serving_now=history[-1],
        momentum_index=index,
        consecutive_breaks=_break_count(history),
        opponent_run=opponent_run,
        worst_rotation=worst_rotation,
        worst_run=worst_run,
        recommendation=recommendation,
        sample_size=len(window),
        message=message,
    )
