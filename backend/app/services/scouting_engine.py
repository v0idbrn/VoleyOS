"""Module 3 — 3-click scouting, natural-language parser, heatmap and K1."""

from __future__ import annotations

import re
import unicodedata
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.services.mathx import ZERO, round2

SKILLS = {
    "saque": "serve",
    "serve": "serve",
    "bloqueo": "block",
    "block": "block",
    "defensa": "dig",
    "dig": "dig",
    "recepcion": "pass",
    "reception": "pass",
    "pase": "pass",
    "pass": "pass",
    "armado": "set",
    "set": "set",
    "ataque": "attack",
    "attack": "attack",
    "remate": "attack",
    "spike": "attack",
}
RESULTS = {
    "punto": "KILL",
    "kill": "KILL",
    "winner": "KILL",
    "mate": "KILL",
    "ace": "ACE",
    "error": "ERROR",
    "fuera": "ERROR",
    "bloqueado": "BLOCKED",
    "blocked": "BLOCKED",
    "defensa": "IN_PLAY",
    "dig": "IN_PLAY",
    "jugada": "IN_PLAY",
    "in play": "IN_PLAY",
}
DIRECTIONS = {
    "diagonal": "diagonal",
    "linea": "line",
    "line": "line",
    "paralela": "line",
    "corta": "short",
    "short": "short",
    "larga": "deep",
    "deep": "deep",
    "cruzada": "cross",
    "cross": "cross",
}


def _normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


class ScoutEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    player: int = Field(ge=0)
    skill: str = "attack"
    rotation: int = Field(default=1, ge=1, le=6)
    origin_zone: int | None = Field(default=None, ge=1, le=9)
    target_zone: int | None = Field(default=None, ge=1, le=9)
    direction: str = "unknown"
    result: str = "IN_PLAY"
    team: str = "A"
    side_out: bool = False


class ParsedPlay(BaseModel):
    player: int | None
    skill: str
    origin_zone: int | None
    target_zone: int | None
    direction: str
    result: str
    confidence: Decimal


class HeatCell(BaseModel):
    zone: int
    count: int
    share_pct: Decimal
    heat: str


class ScoutingReport(BaseModel):
    attempts: int
    kills: int
    errors: int
    blocked: int
    efficiency: Decimal
    heatmap: list[HeatCell]
    k1_by_rotation: dict[str, Decimal]
    worst_rotation: str | None
    warning: str | None


def _first_int(pattern: str, text: str) -> int | None:
    match = re.search(pattern, text)
    if match is None:
        return None
    value = match.group(1)
    return int(value) if value is not None else None


def parse_play(text: str) -> ParsedPlay:
    normalized = _normalize(text)

    skill = "attack"
    for keyword, mapped in SKILLS.items():
        if re.search(rf"\b{re.escape(keyword)}\b", normalized):
            skill = mapped
            break

    player = _first_int(r"(?:#|n(?:umero)?\.?\s*|jugador\s*|player\s*)(\d+)", normalized)
    if player is None:
        player = _first_int(r"\b(?:del|de la|de|from)\s+(\d+)\b", normalized)

    origin = _first_int(r"(?:por|desde|from|zona|zone)\s+(?:zona\s+|zone\s+)?(\d+)", normalized)
    target = _first_int(r"(?:al|a la|hacia|to|target)\s*(\d+)", normalized)

    direction = "unknown"
    for keyword, mapped in DIRECTIONS.items():
        if re.search(rf"\b{re.escape(keyword)}\b", normalized):
            direction = mapped
            break

    result = "IN_PLAY"
    for keyword, mapped in RESULTS.items():
        if re.search(rf"\b{re.escape(keyword)}\b", normalized):
            result = mapped
            break

    signals = sum(value is not None for value in (player, origin, target))
    confidence = round2(Decimal(50) + Decimal(signals) * Decimal(15))
    if player is not None and target is not None:
        confidence = round2(Decimal(90))
    return ParsedPlay(
        player=player,
        skill=skill,
        origin_zone=origin,
        target_zone=target,
        direction=direction,
        result=result,
        confidence=confidence,
    )


def efficiency(events: list[ScoutEvent]) -> Decimal:
    attacks = [event for event in events if event.skill == "attack"]
    attempts = len(attacks)
    if attempts == 0:
        return ZERO
    kills = sum(1 for event in attacks if event.result in {"KILL", "ACE"})
    errors = sum(1 for event in attacks if event.result == "ERROR")
    blocked = sum(1 for event in attacks if event.result == "BLOCKED")
    return round2(Decimal(kills - errors - blocked) / Decimal(attempts))


def heatmap(events: list[ScoutEvent]) -> list[HeatCell]:
    counts = {zone: 0 for zone in range(1, 10)}
    for event in events:
        zone = event.target_zone if event.target_zone is not None else event.origin_zone
        if zone is not None and zone in counts:
            counts[zone] += 1
    total = sum(counts.values())
    cells: list[HeatCell] = []
    for zone, count in counts.items():
        share = ZERO if total == 0 else round2(Decimal(count) * 100 / Decimal(total))
        if share >= 25:
            heat = "volcano"
        elif share >= 15:
            heat = "hot"
        elif share >= 5:
            heat = "warm"
        else:
            heat = "cold"
        cells.append(HeatCell(zone=zone, count=count, share_pct=share, heat=heat))
    return cells


def k1_by_rotation(events: list[ScoutEvent]) -> dict[str, Decimal]:
    result: dict[str, Decimal] = {}
    for rotation in range(1, 7):
        side_outs = [event for event in events if event.rotation == rotation and event.side_out]
        if side_outs:
            wins = sum(1 for event in side_outs if event.result in {"KILL", "ACE"})
            result[f"R{rotation}"] = round2(Decimal(wins) * 100 / Decimal(len(side_outs)))
            continue
        attacks = [
            event for event in events if event.rotation == rotation and event.skill == "attack"
        ]
        if attacks:
            wins = sum(1 for event in attacks if event.result == "KILL")
            result[f"R{rotation}"] = round2(Decimal(wins) * 100 / Decimal(len(attacks)))
    return result


def scouting_report(events: list[ScoutEvent]) -> ScoutingReport:
    attacks = [event for event in events if event.skill == "attack"]
    kills = sum(1 for event in attacks if event.result in {"KILL", "ACE"})
    errors = sum(1 for event in attacks if event.result == "ERROR")
    blocked = sum(1 for event in attacks if event.result == "BLOCKED")
    k1 = k1_by_rotation(events)
    worst = min(k1, key=lambda key: k1[key]) if k1 else None
    warning = None
    if worst is not None and k1[worst] < Decimal(40):
        warning = f"Rotación maldita: {worst} con side-out {k1[worst]}%."
    return ScoutingReport(
        attempts=len(attacks),
        kills=kills,
        errors=errors,
        blocked=blocked,
        efficiency=efficiency(events),
        heatmap=heatmap(events),
        k1_by_rotation=k1,
        worst_rotation=worst,
        warning=warning,
    )
