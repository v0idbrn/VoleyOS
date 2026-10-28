"""Module 15 - setter distribution predictability auditor (Decimal only)."""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.services.mathx import ZERO, round2

Target = Literal["Z4", "Z3-Quick", "Z2-Back", "Pipe-Z6", "Setter-Dump"]
Quality = Literal["#", "+", "!", "-"]
TARGETS: tuple[Target, ...] = ("Z4", "Z3-Quick", "Z2-Back", "Pipe-Z6", "Setter-Dump")


class SetDistribution(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    rotation: int = Field(ge=1, le=6)
    quality: Quality
    target: Target
    count: int = Field(ge=1, le=500)


class SetterIQRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    distributions: list[SetDistribution] = Field(min_length=1, max_length=60)

    @model_validator(mode="after")
    def _quality_counts(self) -> SetterIQRequest:
        if sum(item.count for item in self.distributions) > 2000:
            raise ValueError("too many sets for one match")
        return self


class TargetShare(BaseModel):
    target: str
    count: int
    share_pct: Decimal


class SetterIQReport(BaseModel):
    total_sets: int
    unpredictability: Decimal
    hhi: Decimal
    bias: str | None
    bias_share_pct: Decimal | None
    targets: list[TargetShare]
    by_rotation: dict[str, dict[str, Decimal]]
    recommendations: list[str]
    message: str


def compute_setter_iq(request: SetterIQRequest) -> SetterIQReport:
    total = sum(item.count for item in request.distributions)
    counts: dict[str, int] = {target: 0 for target in TARGETS}
    by_rotation_counts: dict[str, dict[str, int]] = {
        f"R{rotation}": {target: 0 for target in TARGETS} for rotation in range(1, 7)
    }
    for item in request.distributions:
        counts[item.target] += item.count
        by_rotation_counts[f"R{item.rotation}"][item.target] += item.count
    shares = {target: Decimal(count) / Decimal(total) for target, count in counts.items()}
    hhi = round2(sum(share * share for share in shares.values()) * Decimal("100"))
    floor = Decimal(1) / Decimal(len(TARGETS))
    unpredictability = round2(
        (Decimal(1) - hhi / Decimal("100")) / (Decimal(1) - floor) * Decimal("100")
    )
    unpredictability = max(ZERO, min(Decimal("100"), unpredictability))
    bias: str | None = None
    bias_share: Decimal | None = None
    plus_total = sum(item.count for item in request.distributions if item.quality == "+")
    if plus_total:
        plus_counts: dict[str, int] = {target: 0 for target in TARGETS}
        for item in request.distributions:
            if item.quality == "+":
                plus_counts[item.target] += item.count
        leader = max(TARGETS, key=lambda target: plus_counts[target])
        share = round2(Decimal(plus_counts[leader]) / Decimal(plus_total) * Decimal("100"))
        if share > Decimal("65"):
            bias = leader
            bias_share = share
    target_rows = [
        TargetShare(
            target=target, count=counts[target], share_pct=round2(shares[target] * Decimal("100"))
        )
        for target in TARGETS
    ]
    by_rotation: dict[str, dict[str, Decimal]] = {}
    for rotation, rotation_counts in by_rotation_counts.items():
        rotation_total = sum(rotation_counts.values())
        if rotation_total == 0:
            continue
        by_rotation[rotation] = {
            target: round2(Decimal(count) / Decimal(rotation_total) * Decimal("100"))
            for target, count in rotation_counts.items()
        }
    recommendations: list[str] = []
    if unpredictability < Decimal("45"):
        recommendations.append("Distribuci?n predecible: entrena Pipe y Setter-Dump con pase '+'.")
    if bias:
        recommendations.append(
            f"El rival puede cargar el bloqueo a {bias}: {bias_share}% de los pases '+' van all?."
        )
    if len([row for row in target_rows if row.count == 0]) >= 2:
        recommendations.append("Dos salidas sin uso: introduce Quick y Back para abrir el bloqueo.")
    if not recommendations:
        recommendations.append("Distribuci?n sana: mant?n la dispersi?n y revisa por rotaci?n.")
    return SetterIQReport(
        total_sets=total,
        unpredictability=unpredictability,
        hhi=hhi,
        bias=bias,
        bias_share_pct=bias_share,
        targets=target_rows,
        by_rotation=by_rotation,
        recommendations=recommendations,
        message=(
            f"?ndice de imprevisibilidad {unpredictability}/100 con {total} armados. "
            + (f"Sesgo crítico a {bias} ({bias_share}%)." if bias else "Sin sesgo > 65%.")
        ),
    )
