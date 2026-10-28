"""Module 33 - rally clip planner with chapters, ffmpeg commands and EDL."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

CENT = Decimal("0.01")
FPS = Decimal("30")

Skill = Literal["spike", "block", "ace", "dig"]


class Rally(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    start_sec: Decimal = Field(ge=Decimal("0"))
    end_sec: Decimal = Field(gt=Decimal("0"))
    player_number: int = Field(ge=1, le=99)
    skill: Skill
    outcome: str = Field(min_length=1, max_length=40)

    @model_validator(mode="after")
    def _end_after_start(self) -> Rally:
        if self.end_sec <= self.start_sec:
            raise ValueError("end_sec must be greater than start_sec")
        return self


class ClipRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    rallies: list[Rally] = Field(min_length=1, max_length=500)
    player_number: int = Field(ge=1, le=99)
    min_duration_sec: Decimal = Field(default=Decimal("3"), ge=Decimal("0"))


class ClipReport(BaseModel):
    rallies: list[Rally]
    net_play_sec: Decimal
    dead_time_sec: Decimal
    net_play_pct: Decimal
    selected: list[Rally]
    chapters: list[str]
    ffmpeg_command: str
    edl: list[str]
    message: str


def _q2(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _duration(rally: Rally) -> Decimal:
    return rally.end_sec - rally.start_sec


def _mmss(seconds: Decimal) -> str:
    total = int(seconds)
    return f"{total // 60:02d}:{total % 60:02d}"


def _timecode(seconds: Decimal) -> str:
    frames_total = int(
        (seconds * FPS).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    )
    frames = frames_total % 30
    total_seconds = frames_total // 30
    return (
        f"{total_seconds // 3600:02d}:"
        f"{(total_seconds // 60) % 60:02d}:"
        f"{total_seconds % 60:02d}:"
        f"{frames:02d}"
    )


def build_clip_plan(request: ClipRequest) -> ClipReport:
    selected = [
        rally
        for rally in request.rallies
        if rally.player_number == request.player_number
        and _duration(rally) >= request.min_duration_sec
    ]
    span_start = min(rally.start_sec for rally in request.rallies)
    span_end = max(rally.end_sec for rally in request.rallies)
    total_span = max(Decimal("0"), span_end - span_start)
    net_play = sum((_duration(rally) for rally in selected), Decimal("0"))
    dead_time = max(Decimal("0"), total_span - net_play)
    net_pct = (
        _q2(net_play / total_span * Decimal("100")) if total_span > Decimal("0") else Decimal("0")
    )

    chapters: list[str] = []
    if selected:
        chapters.append("00:00")
        cursor = Decimal("0")
        for rally in selected[:-1]:
            cursor += _duration(rally)
            chapters.append(_mmss(cursor))

    commands: list[str] = []
    edl: list[str] = []
    cursor = Decimal("0")
    for index, rally in enumerate(selected, start=1):
        start = _q2(rally.start_sec)
        end = _q2(rally.end_sec)
        commands.append(
            f"ffmpeg -ss {start} -to {end} -i input.mp4 -c copy clip_{index:03d}.mp4"
        )
        start_tc = _timecode(cursor)
        cursor += _duration(rally)
        end_tc = _timecode(cursor)
        edl.append(
            f"{index:03d}  {start_tc} {end_tc}  V  C  "
            f"{rally.player_number} {rally.skill}"
        )

    return ClipReport(
        rallies=request.rallies,
        net_play_sec=_q2(net_play),
        dead_time_sec=_q2(dead_time),
        net_play_pct=net_pct,
        selected=selected,
        chapters=chapters,
        ffmpeg_command="\n".join(commands),
        edl=edl,
        message=(
            f"{len(selected)} jugada(s) del jugador {request.player_number}; "
            f"{_q2(net_play)} s de juego neto ({net_pct}%)."
            if selected
            else f"Sin jugadas del jugador {request.player_number} con el mínimo pedido."
        ),
    )
