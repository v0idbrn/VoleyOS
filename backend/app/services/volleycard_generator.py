"""Module 10 — VolleyCard reach calculator + hexagon radar data."""

from __future__ import annotations

import hashlib
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.services.mathx import round2

POSITIONS = {
    "armador",
    "punta",
    "central",
    "opuesto",
    "libero",
    "universal",
    "setter",
    "outside",
    "middle",
    "opposite",
}
ARCHETYPES = {
    "attack": "Francotirador Aéreo",
    "reception": "Ancla de Recepción",
    "serve": "Cañón de Saque",
    "block": "Muro Carmesí",
    "defense": "Guardián del Suelo",
    "setting": "Director de Orquesta",
}


class SixAttributes(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    attack: int = Field(ge=0, le=100)
    reception: int = Field(ge=0, le=100)
    serve: int = Field(ge=0, le=100)
    block: int = Field(ge=0, le=100)
    defense: int = Field(ge=0, le=100)
    setting: int = Field(ge=0, le=100)


class VolleyCardRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=40)
    position: str = "universal"
    height_cm: Decimal = Field(gt=Decimal(100), lt=Decimal(260))
    standing_reach_cm: Decimal = Field(gt=Decimal(100), lt=Decimal(330))
    jump_cm: Decimal = Field(ge=Decimal(0), le=Decimal(150))
    attributes: SixAttributes


class VolleyCard(BaseModel):
    name: str
    position: str
    height_cm: Decimal
    standing_reach_cm: Decimal
    jump_cm: Decimal
    spike_reach_cm: Decimal
    block_reach_cm: Decimal
    attack_apex_cm: Decimal
    attributes: SixAttributes
    radar: dict[str, int]
    archetype: str
    rarity: str
    card_id: str


def _rarity(spike_reach: Decimal) -> str:
    if spike_reach >= 350:
        return "LEGEND"
    if spike_reach >= 330:
        return "ELITE"
    if spike_reach >= 310:
        return "PRO"
    return "ROOKIE"


def build_volleycard(request: VolleyCardRequest) -> VolleyCard:
    if request.position.lower() not in POSITIONS:
        raise ValueError(f"unknown position: {request.position}")
    if request.standing_reach_cm < request.height_cm:
        raise ValueError("standing reach cannot be lower than height")
    if request.standing_reach_cm - request.height_cm > Decimal(80):
        raise ValueError("standing reach looks unrealistic (>80 cm over height)")

    spike = round2(request.standing_reach_cm + request.jump_cm)
    block = round2(request.standing_reach_cm + request.jump_cm * Decimal("0.92"))
    attributes = request.attributes
    scores = {
        "attack": attributes.attack,
        "reception": attributes.reception,
        "serve": attributes.serve,
        "block": attributes.block,
        "defense": attributes.defense,
        "setting": attributes.setting,
    }
    best = max(scores, key=lambda key: scores[key])
    digest = hashlib.sha256(f"{request.name}|{request.position}|{spike}".encode()).hexdigest()[:12]
    return VolleyCard(
        name=request.name,
        position=request.position.lower(),
        height_cm=request.height_cm,
        standing_reach_cm=request.standing_reach_cm,
        jump_cm=request.jump_cm,
        spike_reach_cm=spike,
        block_reach_cm=block,
        attack_apex_cm=spike,
        attributes=attributes,
        radar=scores,
        archetype=ARCHETYPES[best],
        rarity=_rarity(spike),
        card_id=digest,
    )
