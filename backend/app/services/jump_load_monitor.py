"""Module 12 — ACWR jump-load monitor (Decimal ratio, tendon traffic light)."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.services.mathx import round2


class DailyJump(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    date: str
    jumps: int = Field(ge=0)


class AcwrReport(BaseModel):
    acute_7d: int
    chronic_4w_total: int
    chronic_weekly: Decimal
    ratio: Decimal
    zone: str
    color: str
    recommendation: str
    reference_date: str


def _parse(day: DailyJump) -> date:
    try:
        return date.fromisoformat(day.date)
    except ValueError as error:
        raise ValueError(f"invalid ISO date: {day.date}") from error


def jump_load(days: list[DailyJump], reference_date: str | None = None) -> AcwrReport:
    if not days:
        raise ValueError("at least one day of jump data is required")
    parsed = [(_parse(day), day.jumps) for day in days]
    duplicates = len({stamp for stamp, _ in parsed}) != len(parsed)
    if duplicates:
        raise ValueError("duplicate dates are not allowed")
    reference = (
        date.fromisoformat(reference_date) if reference_date else max(stamp for stamp, _ in parsed)
    )
    window_start = reference - timedelta(days=27)
    recent = [(stamp, jumps) for stamp, jumps in parsed if window_start <= stamp <= reference]
    if not recent:
        raise ValueError("no jump data in the last 28 days")

    acute_start = reference - timedelta(days=6)
    acute = sum(jumps for stamp, jumps in recent if stamp >= acute_start)
    chronic_total = sum(jumps for _, jumps in recent)
    chronic_weekly = round2(Decimal(chronic_total) / Decimal(4))
    if chronic_weekly == 0:
        raise ValueError("chronic load is zero: collect more jump data")
    ratio = round2(Decimal(acute) / chronic_weekly)

    if ratio < Decimal("0.80"):
        zone = "BAJA CARGA"
        color = "amber"
        recommendation = (
            "Carga aguda baja: vigila desentrenamiento y reintroduce saltos progresivamente."
        )
        if ratio < Decimal("0.70"):
            color = "crimson"
            recommendation = (
                "ACWR < 0.70: riesgo de desentrenamiento y rebote lesivo. Sube carga gradual."
            )
    elif ratio <= Decimal("1.30"):
        zone = "ÓPTIMA"
        color = "emerald"
        recommendation = "Zona segura: mantén la progresión actual (0.80-1.30)."
    elif ratio <= Decimal("1.50"):
        zone = "FATIGA ACUMULADA"
        color = "amber"
        recommendation = "Precaución: reduce 20-30% los saltos y prioriza recuperación."
    else:
        zone = "PELIGRO"
        color = "crimson"
        recommendation = (
            "ACWR > 1.50: riesgo de tendinopatía rotuliana y manguito rotador. Descarga ya."
        )

    return AcwrReport(
        acute_7d=acute,
        chronic_4w_total=chronic_total,
        chronic_weekly=chronic_weekly,
        ratio=ratio,
        zone=zone,
        color=color,
        recommendation=recommendation,
        reference_date=reference.isoformat(),
    )
