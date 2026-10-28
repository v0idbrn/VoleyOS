"""Module 32 - ball aerodynamics, knuckleball crisis and Magnus descent."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.services.mathx import cos, radians, sin

CENT = Decimal("0.01")
BALL_DIAMETER_M = Decimal("0.21")
KINEMATIC_VISCOSITY_M2_S = Decimal("0.000015")
KMH_PER_MPS = Decimal("3.6")
GRAVITY_MPS2 = Decimal("9.81")
COURT_LENGTH_M = Decimal("18")
CM_PER_M = Decimal("100")

Regime = Literal["FLYING_FLOAT_CRISIS", "MAGNUS_DESCENT", "STABLE_DRIVE"]


class BallAeroRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    speed_kmh: Decimal = Field(ge=Decimal("52"), le=Decimal("140"))
    spin_rps: Decimal = Field(ge=Decimal("0"), le=Decimal("15"))
    launch_angle_deg: Decimal = Field(ge=Decimal("0"), le=Decimal("80"))
    impact_height_m: Decimal = Field(ge=Decimal("0.5"), le=Decimal("3.0"))


class BallAeroReport(BaseModel):
    reynolds_number: int
    regime: Regime
    lateral_deviation_cm: Decimal
    vertical_drop_cm: Decimal
    landing_distance_m: Decimal
    lands_in_court: bool
    message: str


def _q2(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _regime(speed: Decimal, spin: Decimal) -> Regime:
    if Decimal("52") <= speed <= Decimal("74") and spin <= Decimal("1.2"):
        return "FLYING_FLOAT_CRISIS"
    if spin >= Decimal("5.0"):
        return "MAGNUS_DESCENT"
    return "STABLE_DRIVE"


def _lateral_cm(speed: Decimal, spin: Decimal, regime: Regime) -> Decimal:
    if regime == "FLYING_FLOAT_CRISIS":
        return (
            Decimal("8")
            + (Decimal("74") - speed) * Decimal("0.9")
            + (Decimal("1.2") - spin) * Decimal("6")
        )
    if regime == "MAGNUS_DESCENT":
        return spin * Decimal("3")
    return (Decimal("140") - speed) * Decimal("0.05")


def analyze_aerodynamics(request: BallAeroRequest) -> BallAeroReport:
    speed_mps = request.speed_kmh / KMH_PER_MPS
    reynolds = int(
        (speed_mps * BALL_DIAMETER_M / KINEMATIC_VISCOSITY_M2_S).quantize(
            Decimal("1"), rounding=ROUND_HALF_UP
        )
    )
    regime = _regime(request.speed_kmh, request.spin_rps)
    angle = radians(request.launch_angle_deg)
    horizontal_speed = speed_mps * cos(angle)
    vertical_speed = speed_mps * sin(angle)
    discriminant = (
        vertical_speed * vertical_speed
        + Decimal("2") * GRAVITY_MPS2 * request.impact_height_m
    ).sqrt()
    flight_time = (vertical_speed + discriminant) / GRAVITY_MPS2
    landing_distance = horizontal_speed * flight_time
    gravity_drop_cm = (
        Decimal("0.5") * GRAVITY_MPS2 * flight_time * flight_time * CM_PER_M
    )
    magnus_drop_cm = request.spin_rps * Decimal("4") if regime == "MAGNUS_DESCENT" else Decimal("0")
    lateral_cm = _lateral_cm(request.speed_kmh, request.spin_rps, regime)
    lands_in_court = Decimal("0") < landing_distance <= COURT_LENGTH_M
    labels = {
        "FLYING_FLOAT_CRISIS": "flotado en crisis",
        "MAGNUS_DESCENT": "descenso Magnus",
        "STABLE_DRIVE": "drive estable",
    }
    return BallAeroReport(
        reynolds_number=reynolds,
        regime=regime,
        lateral_deviation_cm=_q2(lateral_cm),
        vertical_drop_cm=_q2(gravity_drop_cm + magnus_drop_cm),
        landing_distance_m=_q2(landing_distance),
        lands_in_court=lands_in_court,
        message=(
            f"Vuelo {labels[regime]} con Re={reynolds}; "
            f"desvío lateral {_q2(lateral_cm)} cm y caída {_q2(landing_distance)} m."
        ),
    )
