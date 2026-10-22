"""Module 8 — pocket VAR: FIVB rule decision tree + crypto coin toss."""

from __future__ import annotations

import secrets
import unicodedata
from collections.abc import Sequence

from pydantic import BaseModel

SCENARIOS = (
    {
        "keywords": ("libero", "dedos", "linea de 3", "3 metros", "front"),
        "title": "Líbero armando de dedos delante de la línea de 3 m",
        "citation": "FIVB 13.3.4 / 19.3.1",
        "verdict": "FALTA",
        "explanation": (
            "El líbero no puede completar un golpe de ataque desde arriba de la red ni "
            "armar de dedos en la zona delantera cuando la jugada termina en ataque."
        ),
    },
    {
        "keywords": ("red", "net", "banda", "cabello", "antena"),
        "title": "Toque de red: banda superior blanca vs cabello o antena",
        "citation": "FIVB 11.3",
        "verdict": (
            "FALTA si toca banda superior/antena; NO es falta si toca cabello o partes sueltas"
        ),
        "explanation": (
            "Cualquier contacto con la banda superior blanca o la antena es falta. El "
            "cabello y las partes sueltas del uniforme no cuentan como contacto."
        ),
    },
    {
        "keywords": ("invasion", "invasión", "pie", "linea central", "línea central"),
        "title": "Invasión por debajo de la red",
        "citation": "FIVB 11.2.2",
        "verdict": "FALTA",
        "explanation": (
            "Es falta si el pie cruza completamente la línea central y toca el campo "
            "contrario. Parte del pie sobre la línea sigue siendo legal."
        ),
    },
    {
        "keywords": ("manos", "bloqueo", "block", "sobre la red"),
        "title": "Manos sobre la red en bloqueo",
        "citation": "FIVB 14.3",
        "verdict": "LEGAL tras el ataque rival; FALTA si interfiere antes",
        "explanation": (
            "El bloqueador puede pasar las manos sobre la red después de que el rival "
            "ejecutó su golpe de ataque, siempre que no interfiera con la jugada."
        ),
    },
    {
        "keywords": ("pantalla", "screen", "saque", "serve"),
        "title": "Pantalla en el saque",
        "citation": "FIVB 12.5",
        "verdict": "FALTA",
        "explanation": (
            "Los jugadores del equipo sacador no pueden impedir la visión del receptor "
            "mediante una pantalla individual o colectiva."
        ),
    },
    {
        "keywords": ("rotacion", "rotación", "orden", "position", "posicion"),
        "title": "Falta de orden de rotación",
        "citation": "FIVB 7.7",
        "verdict": "FALTA",
        "explanation": (
            "Si un equipo saca fuera del orden de rotación, se concede un punto y el "
            "saque al rival, y se corrige la posición."
        ),
    },
)


def _normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFKD", text.lower())
    return "".join(char for char in decomposed if not unicodedata.combining(char))


class VarDecision(BaseModel):
    title: str
    citation: str
    verdict: str
    explanation: str
    matched: bool


class TossResult(BaseModel):
    choice: str
    side: str
    entropy_hex: str


class SoundCue(BaseModel):
    kind: str
    duration_ms: int
    label: str


def analyze_play(text: str) -> VarDecision:
    normalized = _normalize(text)
    best: dict[str, Sequence[str]] | None = None
    best_hits = 0
    for scenario in SCENARIOS:
        hits = sum(1 for keyword in scenario["keywords"] if _normalize(keyword) in normalized)
        if hits > best_hits:
            best = scenario
            best_hits = hits
    if best is None:
        return VarDecision(
            title="Jugada no reconocida",
            citation="FIVB Rules of the Game 2025-2028",
            verdict="REVISAR VIDEO",
            explanation=(
                "Describe la jugada con m\u00e1s detalle "
                "(l\u00edbero, red, invasi\u00f3n, bloqueo, pantalla, rotaci\u00f3n)."
            ),
            matched=False,
        )
    return VarDecision(
        title=str(best["title"]),
        citation=str(best["citation"]),
        verdict=str(best["verdict"]),
        explanation=str(best["explanation"]),
        matched=True,
    )


def toss_coin() -> TossResult:
    entropy = secrets.token_hex(16)
    first = secrets.randbelow(2)
    choice = "SAQUE" if first == 0 else "LADO"
    side = "DERECHA" if secrets.randbelow(2) == 0 else "IZQUIERDA"
    return TossResult(choice=choice, side=side, entropy_hex=entropy)


def whistle() -> SoundCue:
    return SoundCue(kind="whistle", duration_ms=900, label="Silbato arbitral FIVB")
