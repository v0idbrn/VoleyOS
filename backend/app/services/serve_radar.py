"""Module 31 - ballistic serve speed and receiver reaction radar."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CENT = Decimal("0.01")
NET_HEIGHT_M = Decimal("2.43")
AERO_FACTOR = Decimal("1.18")
KMH_PER_MPS = Decimal("3.6")
HUMAN_REACTION_MS = 250


class ServeRadarRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    origin_x_m: Decimal = Field(ge=Decimal("-9"), le=Decimal("9"))
    origin_y_m: Decimal = Field(ge=Decimal("-9"), le=Decimal("9"))
    target_x_m: Decimal = Field(ge=Decimal("-9"), le=Decimal("9"))
    target_y_m: Decimal = Field(ge=Decimal("-9"), le=Decimal("9"))
    flight_time_ms: int = Field(ge=250, le=3000)


class ServeRadarReport(BaseModel):
    horizontal_distance_m: Decimal
    arc_distance_m: Decimal
    average_speed_mps: Decimal
    initial_speed_kmh: Decimal
    classification: Literal[
        "FLOAT_TACTICAL",
        "HYBRID_FAST",
        "POWER_JUMP_SERVE",
        "WORLD_CLASS_BOMB",
    ]
    reaction_margin_ms: int
    message: str


def _q2(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _classify(speed: Decimal) -> Literal[
    "FLOAT_TACTICAL",
    "HYBRID_FAST",
    "POWER_JUMP_SERVE",
    "WORLD_CLASS_BOMB",
]:
    if speed < Decimal("65"):
        return "FLOAT_TACTICAL"
    if speed < Decimal("90"):
        return "HYBRID_FAST"
    if speed < Decimal("115"):
        return "POWER_JUMP_SERVE"
    return "WORLD_CLASS_BOMB"


def analyze_serve(request: ServeRadarRequest) -> ServeRadarReport:
    dx = request.target_x_m - request.origin_x_m
    dy = request.target_y_m - request.origin_y_m
    horizontal = (dx * dx + dy * dy).sqrt()
    arc = (horizontal * horizontal + NET_HEIGHT_M * NET_HEIGHT_M).sqrt()
    flight_s = Decimal(request.flight_time_ms) / Decimal("1000")
    average = arc / flight_s
    initial = average * AERO_FACTOR * KMH_PER_MPS
    classification = _classify(initial)
    margin = max(0, request.flight_time_ms - HUMAN_REACTION_MS)
    labels = {
        "FLOAT_TACTICAL": "flotado tactico",
        "HYBRID_FAST": "hibrido rapido",
        "POWER_JUMP_SERVE": "jump serve de poder",
        "WORLD_CLASS_BOMB": "bomba de clase mundial",
    }
    return ServeRadarReport(
        horizontal_distance_m=_q2(horizontal),
        arc_distance_m=_q2(arc),
        average_speed_mps=_q2(average),
        initial_speed_kmh=_q2(initial),
        classification=classification,
        reaction_margin_ms=margin,
        message=(
            f"Saque {labels[classification]} a {_q2(initial)} km/h; "
            f"el receptor tiene {margin} ms de margen."
        ),
    )
