"""Module 34 - timed practice planner for real group sizes."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

FOCUS = Literal[
    "k1_reception",
    "block_defense_transition",
    "serve_pressure",
    "setter_tempo",
]
DURATION = Literal[60, 90, 120]

BLOCKS: dict[int, list[tuple[str, int]]] = {
    60: [
        ("Activación", 10),
        ("Técnica", 15),
        ("Táctica", 15),
        ("Juego", 15),
        ("Cierre", 5),
    ],
    90: [
        ("Activación", 12),
        ("Técnica", 23),
        ("Táctica", 25),
        ("Juego", 25),
        ("Cierre", 5),
    ],
    120: [
        ("Activación", 15),
        ("Técnica", 30),
        ("Táctica", 35),
        ("Juego", 35),
        ("Cierre", 5),
    ],
}
FOCUS_PLAN: dict[str, tuple[str, str, str]] = {
    "k1_reception": (
        "Estabilizar K1 y primera transición",
        "Servicio dirigido a zonas 1/5 con recepción a blanco",
        "3 recepciones positivas por rotación",
    ),
    "block_defense_transition": (
        "Cerrar bloqueo y reciclar defensa",
        "Bloqueo de dos con lectura de brazo y cobertura de rebote",
        "2 bloqueos-untos o defensas controladas por serie",
    ),
    "serve_pressure": (
        "Presionar saque bajo fatiga",
        "Series de saque a zona corta y profunda con reloj",
        "70% de saques dentro con 2 errores máximos",
    ),
    "setter_tempo": (
        "Acelerar decisión y tempo del armador",
        "Combinaciones quick-shoot-pipe con recepción imperfecta",
        "5 ataques en tempo por rotación",
    ),
}


class PracticeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    players: int = Field(ge=4, le=24)
    duration_min: DURATION
    focus: FOCUS


class PracticeBlock(BaseModel):
    label: str
    start_min: int
    end_min: int
    minutes: int
    groups: list[int]
    objective: str
    drill: str
    scoring_target: str


class PracticeReport(BaseModel):
    players: int
    duration_min: int
    focus: str
    groups: list[int]
    active_courts: int
    blocks: list[PracticeBlock]
    message: str


def _split_players(players: int) -> list[int]:
    courts = (players + 5) // 6
    base = players // courts
    remainder = players % courts
    return [base + 1] * remainder + [base] * (courts - remainder)


def plan_practice(request: PracticeRequest) -> PracticeReport:
    groups = _split_players(request.players)
    objective, drill, target = FOCUS_PLAN[request.focus]
    blocks: list[PracticeBlock] = []
    start = 0
    for label, minutes in BLOCKS[request.duration_min]:
        blocks.append(
            PracticeBlock(
                label=label,
                start_min=start,
                end_min=start + minutes,
                minutes=minutes,
                groups=groups,
                objective=objective,
                drill=drill,
                scoring_target=target,
            )
        )
        start += minutes
    return PracticeReport(
        players=request.players,
        duration_min=request.duration_min,
        focus=request.focus,
        groups=groups,
        active_courts=len(groups),
        blocks=blocks,
        message=(
            f"Plan de {request.duration_min} min para {request.players} jugadores "
            f"en {len(groups)} grupos activos, sin tiempos muertos."
        ),
    )
