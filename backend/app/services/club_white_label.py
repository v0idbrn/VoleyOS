"""Club white-label theme validation (Decimal only)."""

from __future__ import annotations

import re
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

HEX = re.compile(r"^#[0-9a-fA-F]{6}$")
THOUSAND = Decimal("1000")


class WhiteLabelRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    club: str = Field(min_length=2, max_length=40)
    primary: str
    secondary: str
    accent: str


class WhiteLabelReport(BaseModel):
    club: str
    css_vars: dict[str, str]
    text_on_primary: str
    readable: bool
    message: str


def _brightness(color: str) -> Decimal:
    red = int(color[1:3], 16)
    green = int(color[3:5], 16)
    blue = int(color[5:7], 16)
    return (
        Decimal(red) * Decimal(299) + Decimal(green) * Decimal(587) + Decimal(blue) * Decimal(114)
    ) / THOUSAND


def analyze(request: WhiteLabelRequest) -> WhiteLabelReport:
    for color in (request.primary, request.secondary, request.accent):
        if not HEX.match(color):
            raise ValueError("colors must be #rrggbb")
    brightness = _brightness(request.primary)
    text = "#070709" if brightness >= Decimal(140) else "#f7f6f4"
    readable = brightness >= Decimal(140) or brightness <= Decimal(80)
    quality = "válido" if readable else "ajustable"
    return WhiteLabelReport(
        club=request.club.strip(),
        css_vars={
            "--club-primary": request.primary,
            "--club-secondary": request.secondary,
            "--club-accent": request.accent,
            "--club-text": text,
        },
        text_on_primary=text,
        readable=readable,
        message=f"Tema de {request.club.strip()} listo con contraste {quality}.",
    )
