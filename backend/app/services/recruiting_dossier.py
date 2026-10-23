"""Module 34 - recruiting dossier with normalized score and HMAC seal."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
from decimal import ROUND_HALF_UP, Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

Position = Literal["outside", "opposite", "middle", "setter", "libero"]
Tier = Literal["DIV_I", "DIV_II", "NATIONAL", "U21"]


class RecruitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    graduation_year: int = Field(ge=2026, le=2032)
    position: Position
    height_cm: Decimal = Field(ge=Decimal("150"), le=Decimal("220"))
    reach_one_hand_cm: Decimal
    reach_two_hand_cm: Decimal
    vertical_jump_cm: Decimal
    attack_reach_cm: Decimal
    kills: int = Field(ge=0, le=500)
    attack_efficiency_pct: Decimal = Field(ge=Decimal("0"), le=Decimal("100"))


class RecruitReport(BaseModel):
    score: int
    tier: Tier
    strengths: list[str]
    gaps: list[str]
    seal: str
    message: str


def _q2(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _normalize(value: Decimal, low: Decimal, high: Decimal) -> Decimal:
    if high <= low:
        return Decimal("0")
    scaled = (value - low) / (high - low) * Decimal("100")
    return max(Decimal("0"), min(Decimal("100"), scaled))


def _tier(score: int) -> Tier:
    if score >= 85:
        return "NATIONAL"
    if score >= 70:
        return "DIV_I"
    if score >= 55:
        return "DIV_II"
    return "U21"


def _seal_secret() -> str:
    return os.environ.get("INTEGRITY_SEAL_SECRET", "volleyos-dev-seal")


def _canonical(payload: dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)


def _seal(payload: dict[str, Any]) -> str:
    canonical = _canonical(payload)
    digest = hmac.new(_seal_secret().encode(), canonical.encode(), hashlib.sha256).hexdigest()
    return f"VOS-SEAL-{digest[:16].upper()}"


def build_recruiting_dossier(request: RecruitRequest) -> RecruitReport:
    height_norm = _normalize(request.height_cm, Decimal("150"), Decimal("220"))
    reach_norm = _normalize(request.attack_reach_cm, Decimal("250"), Decimal("380"))
    jump_norm = _normalize(request.vertical_jump_cm, Decimal("20"), Decimal("120"))
    kills_norm = _normalize(Decimal(request.kills), Decimal("0"), Decimal("500"))
    weighted = (
        height_norm * Decimal("0.15")
        + reach_norm * Decimal("0.25")
        + jump_norm * Decimal("0.20")
        + request.attack_efficiency_pct * Decimal("0.25")
        + kills_norm * Decimal("0.15")
    )
    score = max(0, min(100, int(_q2(weighted).quantize(Decimal("1"), rounding=ROUND_HALF_UP))))
    tier = _tier(score)

    strengths: list[str] = []
    gaps: list[str] = []
    if request.height_cm >= Decimal("190"):
        strengths.append("Altura de elite para el bloqueo y el ataque por las bandas.")
    if request.vertical_jump_cm >= Decimal("80"):
        strengths.append("Salto vertical explosivo con buen tiempo de ataque.")
    if request.attack_efficiency_pct >= Decimal("45"):
        strengths.append("Eficiencia de ataque por encima de la media de la categoria.")
    if request.kills >= 250:
        strengths.append("Volumen de puntos probado en competencia.")
    if request.height_cm < Decimal("180"):
        gaps.append("Altura limitada: proyectar a posiciones de defensa y recepcion.")
    if request.vertical_jump_cm < Decimal("50"):
        gaps.append("Salto por debajo del umbral: plan de fuerza y pliometria.")
    if request.attack_efficiency_pct < Decimal("25"):
        gaps.append("Eficiencia de ataque baja: revisar seleccion de golpe y errores.")
    if request.kills < 50:
        gaps.append("Poco volumen de kills: necesita mas muestra competitiva.")
    if not strengths:
        strengths.append("Perfil equilibrado sin un rasgo dominante.")
    if not gaps:
        gaps.append("Sin brechas criticas: mantener seguimiento y desarrollo tecnico.")

    seal = _seal(request.model_dump())
    return RecruitReport(
        score=score,
        tier=tier,
        strengths=strengths,
        gaps=gaps,
        seal=seal,
        message=(
            f"Dossier {tier} con score {score}/100 para {request.position}; "
            f"sello {seal}."
        ),
    )
