"""Module 37 - margin-weighted Elo rating update in Decimal."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EloResult = Literal["3-0", "3-1", "3-2", "2-3", "1-3", "0-3"]

CENT = Decimal("0.01")
TEN_THOUSANDTH = Decimal("0.0001")
RATING_SPAN = Decimal("400")
BASE = Decimal("10")


class EloRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    team_a_rating: Decimal = Field(ge=Decimal("0"), le=Decimal("5000"))
    team_b_rating: Decimal = Field(ge=Decimal("0"), le=Decimal("5000"))
    k_weight: Decimal = Field(ge=Decimal("10"), le=Decimal("60"))
    result: EloResult


class EloReport(BaseModel):
    expected_a: Decimal
    score_a: Decimal
    margin_factor: Decimal
    delta_a: Decimal
    delta_b: Decimal
    message: str


def _q2(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _q4(value: Decimal) -> Decimal:
    return value.quantize(TEN_THOUSANDTH, rounding=ROUND_HALF_UP)


def _score(result: EloResult) -> Decimal:
    if result.startswith("3"):
        return Decimal("1")
    if result.startswith("0"):
        return Decimal("0")
    return Decimal("0.5")


def _margin_factor(result: EloResult) -> Decimal:
    if result in ("3-0", "0-3"):
        return Decimal("1.0")
    if result in ("3-1", "1-3"):
        return Decimal("0.9")
    return Decimal("0.8")


def _expected(rating_a: Decimal, rating_b: Decimal) -> Decimal:
    ratio = BASE ** ((rating_b - rating_a) / RATING_SPAN)
    return _q4(Decimal("1") / (Decimal("1") + ratio))


def calculate_elo(request: EloRequest) -> EloReport:
    expected_a = _expected(request.team_a_rating, request.team_b_rating)
    score_a = _score(request.result)
    margin = _margin_factor(request.result)
    delta_a = _q2(request.k_weight * margin * (score_a - expected_a))
    delta_b = -delta_a
    return EloReport(
        expected_a=expected_a,
        score_a=score_a,
        margin_factor=margin,
        delta_a=delta_a,
        delta_b=delta_b,
        message=(
            f"Elo actualizado por margen {margin}: equipo A {delta_a:+.2f}, "
            f"equipo B {delta_b:+.2f}."
        ),
    )
