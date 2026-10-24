"""Module 54 - tournament day nutrition planning (Decimal only)."""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.services.mathx import round2

THOUSAND = Decimal("1000")


class NutritionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    weight_kg: Decimal = Field(gt=0, le=200)
    matches: int = Field(default=1, ge=1, le=6)
    minutes_per_match: int = Field(default=90, ge=10, le=300)
    temp_c: Decimal = Field(default=Decimal("24"), ge=-10, le=45)
    sweat_rate_lh: Decimal = Field(default=Decimal("0.8"), gt=0, le=3)


class NutritionReport(BaseModel):
    carbs_g: Decimal
    fluid_ml: Decimal
    sodium_mg: Decimal
    carbs_per_hour: Decimal
    fluid_per_hour_ml: Decimal
    heat_note: str
    message: str


def analyze(request: NutritionRequest) -> NutritionReport:
    total_minutes = Decimal(request.minutes_per_match * request.matches)
    carbs = round2(request.weight_kg * Decimal("1.2") * Decimal(request.matches))
    fluid = round2(
        request.sweat_rate_lh * total_minutes / Decimal(60) * THOUSAND
        + Decimal(500) * request.matches
    )
    hours = total_minutes / Decimal(60)
    heat_note = (
        "Calor alto: suma 300 ml y electrolitos."
        if request.temp_c >= 30
        else "Clima templado: plan base."
    )
    return NutritionReport(
        carbs_g=carbs,
        fluid_ml=fluid,
        sodium_mg=round2(fluid / THOUSAND * Decimal(500)),
        carbs_per_hour=round2(carbs / hours),
        fluid_per_hour_ml=round2(fluid / hours),
        heat_note=heat_note,
        message=f"{request.matches} partidos: {carbs} g de carbohidratos y {fluid} ml de liquido.",
    )
