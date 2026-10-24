"""Module 58 - sponsor value deck (Decimal only)."""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.services.mathx import round2

THOUSAND = Decimal("1000")


class SponsorRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    impressions: int = Field(ge=0)
    reach: int = Field(ge=0)
    cpm: Decimal = Field(ge=0)
    engagement_pct: Decimal = Field(default=Decimal("0"), ge=0, le=100)
    currency: str = "USD"


class SponsorReport(BaseModel):
    value: Decimal
    effective_cpm: Decimal
    engagement_value: Decimal
    tier: str
    message: str


def analyze(request: SponsorRequest) -> SponsorReport:
    value = round2(Decimal(request.impressions) / THOUSAND * request.cpm)
    effective = (
        round2(value / (Decimal(request.reach) / THOUSAND)) if request.reach else Decimal("0.00")
    )
    engagement = round2(value * request.engagement_pct / Decimal(100))
    tier = "ORO" if value >= 1000 else "PLATA" if value >= 400 else "BRONCE"
    return SponsorReport(
        value=value,
        effective_cpm=effective,
        engagement_value=engagement,
        tier=tier,
        message=f"Deck {tier}: {request.currency} {value} por {request.impressions} impresiones.",
    )
