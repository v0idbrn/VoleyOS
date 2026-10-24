"""Module 60 - peripheral reaction test scoring (Decimal only)."""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.services.mathx import round2

HUNDRED = Decimal("100")


class ReflexRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    times_ms: list[int] = Field(min_length=1, max_length=50)


class ReflexReport(BaseModel):
    mean_ms: Decimal
    best_ms: int
    spread_ms: Decimal
    consistency_pct: Decimal
    rating: str
    message: str


def analyze(request: ReflexRequest) -> ReflexReport:
    for value in request.times_ms:
        if not 80 <= value <= 1200:
            raise ValueError("reaction times must be between 80 and 1200 ms")
    mean = Decimal(sum(request.times_ms)) / Decimal(len(request.times_ms))
    spread = max(request.times_ms) - min(request.times_ms)
    consistency = max(Decimal(0), min(HUNDRED, HUNDRED - Decimal(spread) * Decimal(100) / mean))
    rating = "ELITE" if mean <= 220 and consistency >= 85 else "ALTO" if mean <= 280 else "MEDIO"
    return ReflexReport(
        mean_ms=round2(mean),
        best_ms=min(request.times_ms),
        spread_ms=Decimal(spread),
        consistency_pct=round2(consistency),
        rating=rating,
        message=(
            f"{len(request.times_ms)} tests: {round2(mean)} ms"
            f" y consistencia {round2(consistency)}%."
        ),
    )
