"""Module 52 - three-phase playbook animator (Decimal only)."""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.services.mathx import round2

Phase = Literal["serve", "transition", "attack"]
PHASE_ORDER: tuple[Phase, Phase, Phase] = ("serve", "transition", "attack")


class PlayerPosition(BaseModel):
    model_config = ConfigDict(extra="forbid")

    number: int = Field(ge=1, le=99)
    x: Decimal = Field(ge=0, le=100)
    y: Decimal = Field(ge=0, le=100)


class PlaybookPhase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    phase: Phase
    duration_ms: int = Field(gt=0)
    target_zone: int = Field(ge=1, le=9)
    players: list[PlayerPosition] = Field(min_length=1)


class PlaybookRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    phases: list[PlaybookPhase] = Field(min_length=3, max_length=3)


class PhaseVector(BaseModel):
    number: int
    dx: Decimal
    dy: Decimal
    distance: Decimal


class PhaseFrame(BaseModel):
    order: int
    phase: Phase
    start_ms: int
    end_ms: int
    target_zone: int
    vectors: list[PhaseVector]


class PlaybookReport(BaseModel):
    total_duration_ms: int
    keyframes: int
    phases: list[PhaseFrame]
    message: str


def analyze(request: PlaybookRequest) -> PlaybookReport:
    order = tuple(phase.phase for phase in request.phases)
    if order != PHASE_ORDER:
        raise ValueError("phases must be serve, transition and attack in order")

    frames: list[PhaseFrame] = []
    cursor = 0
    previous: dict[int, PlayerPosition] | None = None
    for index, phase in enumerate(request.phases):
        seen: set[int] = set()
        for player in phase.players:
            if player.number in seen:
                raise ValueError(f"duplicate player #{player.number} in {phase.phase}")
            seen.add(player.number)
        vectors: list[PhaseVector] = []
        if previous is not None:
            for player in phase.players:
                before = previous.get(player.number)
                if before is None:
                    continue
                dx = round2(player.x - before.x)
                dy = round2(player.y - before.y)
                vectors.append(
                    PhaseVector(
                        number=player.number,
                        dx=dx,
                        dy=dy,
                        distance=round2((dx * dx + dy * dy).sqrt()),
                    )
                )
        frames.append(
            PhaseFrame(
                order=index + 1,
                phase=phase.phase,
                start_ms=cursor,
                end_ms=cursor + phase.duration_ms,
                target_zone=phase.target_zone,
                vectors=vectors,
            )
        )
        cursor += phase.duration_ms
        previous = {player.number: player for player in phase.players}

    return PlaybookReport(
        total_duration_ms=cursor,
        keyframes=sum(len(phase.players) for phase in request.phases),
        phases=frames,
        message=f"Jugada de {cursor} ms en 3 fases lista para reproducir sin conexion.",
    )
