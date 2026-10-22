"""Module 29 - net height and ball pressure inspector in Decimal units."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CENT = Decimal("0.01")
PSI_PER_KGF = Decimal("14.2233")
KPA_PER_KGF = Decimal("98.0665")
BALL_DIAMETER_CM = Decimal("21.0")
TOLERANCE_CM = Decimal("2")

EXPECTED_HEIGHT_CM: dict[str, Decimal] = {
    "men_indoor": Decimal("243"),
    "women_indoor": Decimal("224"),
    "mixed_recreational": Decimal("235"),
    "u18_boys": Decimal("235"),
    "u18_girls": Decimal("218"),
    "newcom_senior": Decimal("243"),
}

PRESSURE_RANGE: dict[str, tuple[Decimal, Decimal]] = {
    "indoor": (Decimal("0.300"), Decimal("0.325")),
    "beach": (Decimal("0.175"), Decimal("0.225")),
}


class EquipmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    category: Literal[
        "men_indoor",
        "women_indoor",
        "mixed_recreational",
        "u18_boys",
        "u18_girls",
        "newcom_senior",
    ]
    center_height_cm: Decimal = Field(ge=Decimal("100"), le=Decimal("400"))
    side_a_height_cm: Decimal = Field(ge=Decimal("100"), le=Decimal("400"))
    side_b_height_cm: Decimal = Field(ge=Decimal("100"), le=Decimal("400"))
    ball_pressure_kgf_cm2: Decimal = Field(
        ge=Decimal("0.010"), le=Decimal("1.000")
    )
    surface: Literal["indoor", "beach"] = "indoor"


class NetReport(BaseModel):
    expected_cm: Decimal
    center_deviation_cm: Decimal
    max_deviation_cm: Decimal
    ok: bool


class BallReport(BaseModel):
    pressure_kgf_cm2: Decimal
    pressure_psi: Decimal
    pressure_kpa: Decimal
    min_kgf_cm2: Decimal
    max_kgf_cm2: Decimal
    status: str
    ok: bool


class StackReport(BaseModel):
    diameter_cm: Decimal
    balls_stacked: Decimal


class EquipmentReport(BaseModel):
    category: str
    surface: str
    net: NetReport
    ball: BallReport
    stack: StackReport
    checks: list[str]
    status: str
    message: str


def _quantize(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _ball_status(pressure: Decimal, surface: str) -> tuple[str, bool]:
    low, high = PRESSURE_RANGE[surface]
    if pressure < low:
        return "Desinflada", False
    if pressure > high:
        return "Demasiado dura (rebote descontrolado)", False
    return "Óptima FIVB", True


def inspect_equipment(request: EquipmentRequest) -> EquipmentReport:
    expected = EXPECTED_HEIGHT_CM[request.category]
    dev_a = abs(request.side_a_height_cm - request.center_height_cm)
    dev_b = abs(request.side_b_height_cm - request.center_height_cm)
    max_deviation = max(dev_a, dev_b)
    center_deviation = abs(request.center_height_cm - expected)
    net_ok = max_deviation <= TOLERANCE_CM and center_deviation <= TOLERANCE_CM
    low, high = PRESSURE_RANGE[request.surface]
    status_text, ball_ok = _ball_status(
        request.ball_pressure_kgf_cm2, request.surface
    )
    checks = [
        "red_a_2cm" if dev_a <= TOLERANCE_CM else "red_a_fuera_de_tolerancia",
        "red_b_2cm" if dev_b <= TOLERANCE_CM else "red_b_fuera_de_tolerancia",
        "altura_oficial" if center_deviation <= TOLERANCE_CM else "altura_no_oficial",
        "presion_ok" if ball_ok else "presion_fuera_de_rango",
    ]
    if not net_ok:
        status = "NET_OUT_OF_TOLERANCE"
        message = "Red fuera de tolerancia: corrige la tensión y vuelve a medir."
    elif not ball_ok:
        status = "BALL_OUT_OF_RANGE"
        message = "Balón fuera de rango: ajusta la presión antes de jugar."
    else:
        status = "OK"
        message = "Red y balón conformes: equipo listo para el partido."
    return EquipmentReport(
        category=request.category,
        surface=request.surface,
        net=NetReport(
            expected_cm=expected,
            center_deviation_cm=_quantize(center_deviation),
            max_deviation_cm=_quantize(max_deviation),
            ok=net_ok,
        ),
        ball=BallReport(
            pressure_kgf_cm2=_quantize(request.ball_pressure_kgf_cm2),
            pressure_psi=_quantize(request.ball_pressure_kgf_cm2 * PSI_PER_KGF),
            pressure_kpa=_quantize(request.ball_pressure_kgf_cm2 * KPA_PER_KGF),
            min_kgf_cm2=low,
            max_kgf_cm2=high,
            status=status_text,
            ok=ball_ok,
        ),
        stack=StackReport(
            diameter_cm=BALL_DIAMETER_CM,
            balls_stacked=_quantize(
                request.center_height_cm / BALL_DIAMETER_CM
            ),
        ),
        checks=checks,
        status=status,
        message=message,
    )
