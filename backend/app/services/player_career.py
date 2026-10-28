"""Module 36 - player career progression and bottleneck index."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from pydantic import BaseModel, ConfigDict, Field

TENTH = Decimal("0.1")


class CareerMeasurement(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    period: str = Field(min_length=1, max_length=20)
    vertical_jump_cm: Decimal = Field(ge=Decimal("20"), le=Decimal("120"))
    attack_reach_cm: Decimal = Field(ge=Decimal("150"), le=Decimal("400"))
    serve_speed_kmh: Decimal = Field(ge=Decimal("20"), le=Decimal("160"))
    attack_efficiency_pct: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))
    reception_pct: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))


class CareerRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    player: str = Field(min_length=1, max_length=60)
    measurements: list[CareerMeasurement] = Field(min_length=2, max_length=24)


class CareerReport(BaseModel):
    player: str
    first_period: str
    last_period: str
    deltas: dict[str, Decimal]
    evolution_index: Decimal
    category: str
    next_category: str
    gap_to_next: Decimal
    bottleneck: str
    message: str


def _q1(value: Decimal) -> Decimal:
    return value.quantize(TENTH, rounding=ROUND_HALF_UP)


def _clamp(value: Decimal) -> Decimal:
    return max(Decimal("0"), min(Decimal("100"), value))


def _scores(last: CareerMeasurement) -> dict[str, Decimal]:
    return {
        "jump": _clamp(last.vertical_jump_cm / Decimal("80") * Decimal("100")),
        "reach": _clamp(
            (last.attack_reach_cm - Decimal("250")) / Decimal("100") * Decimal("100")
        ),
        "serve": _clamp(last.serve_speed_kmh / Decimal("120") * Decimal("100")),
        "attack": _clamp(last.attack_efficiency_pct),
        "reception": _clamp(last.reception_pct),
    }


def _category(index: Decimal) -> tuple[str, str, Decimal]:
    if index < Decimal("40"):
        return "DEVELOPMENT", "COMPETITIVE", Decimal("40") - index
    if index < Decimal("60"):
        return "COMPETITIVE", "ELITE", Decimal("60") - index
    if index < Decimal("80"):
        return "ELITE", "WORLD_CLASS", Decimal("80") - index
    return "WORLD_CLASS", "WORLD_CLASS", Decimal("0")


def build_career_report(request: CareerRequest) -> CareerReport:
    first = request.measurements[0]
    last = request.measurements[-1]
    deltas = {
        "jump_cm": _q1(last.vertical_jump_cm - first.vertical_jump_cm),
        "reach_cm": _q1(last.attack_reach_cm - first.attack_reach_cm),
        "serve_kmh": _q1(last.serve_speed_kmh - first.serve_speed_kmh),
        "attack_pct": _q1(
            last.attack_efficiency_pct - first.attack_efficiency_pct
        ),
        "reception_pct": _q1(last.reception_pct - first.reception_pct),
    }
    scores = _scores(last)
    absolute = sum(scores.values()) / Decimal("5")
    progress = _clamp(
        Decimal("50")
        + deltas["jump_cm"] * Decimal("2")
        + deltas["reach_cm"]
        + deltas["serve_kmh"]
        + deltas["attack_pct"] * Decimal("1.5")
        + deltas["reception_pct"]
    )
    index = _q1(_clamp(absolute * Decimal("0.7") + progress * Decimal("0.3")))
    category, next_category, gap = _category(index)
    bottleneck = min(scores, key=lambda key: scores[key])
    return CareerReport(
        player=request.player,
        first_period=first.period,
        last_period=last.period,
        deltas=deltas,
        evolution_index=index,
        category=category,
        next_category=next_category,
        gap_to_next=_q1(gap),
        bottleneck=bottleneck,
        message=(
            f"{request.player}: índice {index}/100 ({category}). Cuello de botella "
            f"actual: {bottleneck}; faltan {_q1(gap)} puntos para {next_category}."
        ),
    )
