"""Module 53 - shot heatmap over a 3x3 court grid (Decimal only)."""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.services.mathx import HUNDRED, round2

ShotResult = Literal["kill", "error", "blocked", "in_play"]


class Shot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    x: Decimal = Field(ge=0, le=100)
    y: Decimal = Field(ge=0, le=100)
    result: ShotResult = "kill"


class ShotRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    shots: list[Shot] = Field(min_length=1)


class HeatCell(BaseModel):
    zone: int
    count: int
    share_pct: Decimal


class ShotHeatmapReport(BaseModel):
    total: int
    kills: int
    errors: int
    blocked: int
    efficiency_pct: Decimal
    hot_zone: int
    cells: list[HeatCell]
    message: str


def _zone(x: Decimal, y: Decimal) -> int:
    column = min(2, int(x * 3 / HUNDRED))
    row = min(2, int(y * 3 / HUNDRED))
    return row * 3 + column + 1


def analyze(request: ShotRequest) -> ShotHeatmapReport:
    counts = {zone: 0 for zone in range(1, 10)}
    for shot in request.shots:
        counts[_zone(shot.x, shot.y)] += 1
    total = len(request.shots)
    kills = sum(1 for shot in request.shots if shot.result == "kill")
    errors = sum(1 for shot in request.shots if shot.result == "error")
    blocked = sum(1 for shot in request.shots if shot.result == "blocked")
    hot_zone = max(counts, key=lambda zone: (counts[zone], -zone))
    cells = [
        HeatCell(
            zone=zone,
            count=count,
            share_pct=round2(Decimal(count) * HUNDRED / Decimal(total)),
        )
        for zone, count in counts.items()
    ]
    efficiency = round2(Decimal(kills - errors - blocked) * HUNDRED / Decimal(total))
    return ShotHeatmapReport(
        total=total,
        kills=kills,
        errors=errors,
        blocked=blocked,
        efficiency_pct=efficiency,
        hot_zone=hot_zone,
        cells=cells,
        message=f"Zona caliente {hot_zone} con {counts[hot_zone]} de {total} remates.",
    )
