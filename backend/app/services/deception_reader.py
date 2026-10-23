"""Module 36 - deception reader for hard swing, tip and setter dump."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TENTH = Decimal("0.1")
HUNDRED = Decimal("100")

Defender = Literal["left_back", "middle_back", "right_back", "libero"]


class DeceptionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    approach_speed_kmh: Decimal = Field(ge=Decimal("5"), le=Decimal("30"))
    elbow_height_cm: Decimal = Field(ge=Decimal("80"), le=Decimal("220"))
    ball_front_offset_cm: Decimal = Field(ge=Decimal("-40"), le=Decimal("40"))
    setter_front_zone_jump: bool
    blockers_committed: int = Field(ge=0, le=3)


class DeceptionReport(BaseModel):
    hard_swing_pct: Decimal
    off_speed_tip_pct: Decimal
    setter_dump_pct: Decimal
    primary_defender: Defender
    message: str


def _q1(value: Decimal) -> Decimal:
    return value.quantize(TENTH, rounding=ROUND_HALF_UP)


def _normalize(value: Decimal, low: Decimal, high: Decimal) -> Decimal:
    return (value - low) / (high - low) * HUNDRED


def _clamp(value: Decimal) -> Decimal:
    return max(Decimal("0"), min(HUNDRED, value))


def _defender(request: DeceptionRequest) -> Defender:
    if request.setter_front_zone_jump and request.blockers_committed <= 1:
        return "libero"
    if request.ball_front_offset_cm < Decimal("-10"):
        return "left_back"
    if request.ball_front_offset_cm > Decimal("10"):
        return "right_back"
    return "middle_back"


def read_deception(request: DeceptionRequest) -> DeceptionReport:
    speed_norm = _normalize(request.approach_speed_kmh, Decimal("5"), Decimal("30"))
    elbow_norm = _normalize(request.elbow_height_cm, Decimal("80"), Decimal("220"))
    offset_norm = _normalize(request.ball_front_offset_cm, Decimal("-40"), Decimal("40"))
    blockers = Decimal(request.blockers_committed)

    hard = (
        Decimal("35")
        + speed_norm * Decimal("0.30")
        + elbow_norm * Decimal("0.10")
        + offset_norm * Decimal("0.10")
    )
    tip = (
        Decimal("25")
        + (HUNDRED - elbow_norm) * Decimal("0.10")
        + blockers * Decimal("4")
        + (HUNDRED - offset_norm) * Decimal("0.05")
    )
    dump = (
        Decimal("5")
        + (Decimal("10") if request.setter_front_zone_jump else Decimal("0"))
        + blockers * Decimal("4")
        + (HUNDRED - speed_norm) * Decimal("0.05")
    )

    total = hard + tip + dump
    hard_pct = _q1(_clamp(hard / total * HUNDRED))
    tip_pct = _q1(_clamp(tip / total * HUNDRED))
    dump_pct = (HUNDRED - hard_pct - tip_pct).quantize(TENTH, rounding=ROUND_HALF_UP)
    defender = _defender(request)

    return DeceptionReport(
        hard_swing_pct=hard_pct,
        off_speed_tip_pct=tip_pct,
        setter_dump_pct=dump_pct,
        primary_defender=defender,
        message=(
            f"Lectura: swing {hard_pct}%, tip {tip_pct}%, dump {dump_pct}%; "
            f"responsable principal {defender}."
        ),
    )
