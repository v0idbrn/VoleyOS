"""Module 55 - shoulder and knee prehab risk (Decimal only)."""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.services.mathx import round2

HUNDRED = Decimal("100")


class PrehabRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    weekly_jumps: int = Field(ge=0, le=1000)
    weekly_spikes: int = Field(ge=0, le=1500)
    sleep_hours: Decimal = Field(ge=0, le=14)
    knee_pain: int = Field(default=0, ge=0, le=10)
    shoulder_pain: int = Field(default=0, ge=0, le=10)
    prior_injury: bool = False


class PrehabReport(BaseModel):
    risk_score: Decimal
    risk: str
    jump_limit: int
    drills: list[str]
    message: str


def analyze(request: PrehabRequest) -> PrehabReport:
    score = HUNDRED
    if request.weekly_jumps > 300:
        score -= Decimal(min(25, (request.weekly_jumps - 300) // 10))
    if request.weekly_spikes > 150:
        score -= Decimal(min(20, (request.weekly_spikes - 150) // 15))
    if request.sleep_hours < 7:
        score -= round2((Decimal(7) - request.sleep_hours) * Decimal(4))
    score -= Decimal(request.knee_pain * 6 + request.shoulder_pain * 6)
    if request.prior_injury:
        score -= Decimal(10)
    score = max(Decimal(0), min(HUNDRED, score))
    drills = ["Movilidad de tobillo y cadera", "Face pull y rotadores externos"]
    if request.knee_pain >= 3:
        drills.append("Isometrico de cuadriceps y control de aterrizaje")
    if request.shoulder_pain >= 3:
        drills.append("Scapular push-up y sleeper stretch")
    risk = "BAJO" if score >= 80 else "MEDIO" if score >= 55 else "ALTO"
    jump_limit = max(0, 350 - request.weekly_jumps // 20)
    return PrehabReport(
        risk_score=round2(score),
        risk=risk,
        jump_limit=jump_limit,
        drills=drills,
        message=f"Riesgo {risk}: score {round2(score)}/100. Limite sugerido {jump_limit} saltos.",
    )
