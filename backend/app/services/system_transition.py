"""Module 35 - offensive system transition planner (4-2, 6-2, 5-1)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

SystemName = Literal["4-2", "6-2", "5-1"]

FRONT_ATTACKERS: dict[SystemName, list[int]] = {
    "4-2": [2, 2, 2, 2, 2, 2],
    "6-2": [3, 3, 3, 3, 3, 3],
    "5-1": [3, 3, 3, 2, 2, 2],
}

DESCRIPTIONS: dict[SystemName, str] = {
    "4-2": "Dos armadores que alternan entre delantera y zaga; siempre dos atacantes al frente.",
    "6-2": "Dos armadores con el de zaga penetrando; tres atacantes al frente en cada rotación.",
    "5-1": "Un armador fijo: tres atacantes al frente en R1-R3 y dos en R4-R6.",
}

INFILTRATION: dict[SystemName, tuple[str, ...]] = {
    "4-2": (
        "El armador delantero juega en red y el de zaga cubre defensa.",
        "El armador de Z6 penetra solo si el delantero ataca.",
        "El armador de Z5 defiende; el delantero arma en Z3.",
        "El armador delantero arma desde Z4.",
        "El armador delantero arma desde Z3.",
        "El armador delantero arma desde Z2.",
    ),
    "6-2": (
        "El armador de Z1 penetra desde la zaga derecha.",
        "El armador de Z6 penetra desde el centro de la zaga.",
        "El armador de Z5 penetra desde la zaga izquierda.",
        "El armador de Z4 penetra desde la banda izquierda.",
        "El armador de Z3 penetra desde el centro de la red.",
        "El armador de Z2 penetra desde la banda derecha.",
    ),
    "5-1": (
        "El armador fijo penetra desde Z1 y libera tres atacantes.",
        "El armador fijo penetra desde Z6 y libera tres atacantes.",
        "El armador fijo penetra desde Z5 y libera tres atacantes.",
        "El armador queda en red en Z4: dos atacantes delanteros.",
        "El armador queda en red en Z3: dos atacantes delanteros.",
        "El armador queda en red en Z2: dos atacantes delanteros.",
    ),
}

ROTATIONS = ("R1", "R2", "R3", "R4", "R5", "R6")


class SystemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    setters: int = Field(ge=0, le=2)
    pure_hitters: int = Field(ge=0, le=6)
    transition_read_grade: int = Field(ge=1, le=10)
    rotation: int = Field(ge=1, le=6)


class SystemOption(BaseModel):
    name: SystemName
    front_attackers_by_rotation: list[int] = Field(min_length=6, max_length=6)
    description: str


class SystemReport(BaseModel):
    systems: list[SystemOption]
    recommended: str
    infiltration_map: dict[str, str]
    message: str


def _base_recommendation(setters: int, pure_hitters: int) -> SystemName:
    if setters >= 1 and pure_hitters >= 4:
        return "5-1"
    if setters >= 2 and pure_hitters >= 3:
        return "6-2"
    return "4-2"


def _adjust(recommendation: SystemName, request: SystemRequest) -> SystemName:
    if request.transition_read_grade <= 4:
        return "6-2" if request.setters >= 2 else "4-2"
    return recommendation


def analyze_system(request: SystemRequest) -> SystemReport:
    systems = [
        SystemOption(
            name=name,
            front_attackers_by_rotation=list(FRONT_ATTACKERS[name]),
            description=DESCRIPTIONS[name],
        )
        for name in ("4-2", "6-2", "5-1")
    ]
    recommended = _adjust(
        _base_recommendation(request.setters, request.pure_hitters), request
    )
    infiltration_map = {
        rotation: f"{rotation}: {INFILTRATION[recommended][index]}"
        for index, rotation in enumerate(ROTATIONS)
    }
    return SystemReport(
        systems=systems,
        recommended=recommended,
        infiltration_map=infiltration_map,
        message=(
            f"Sistema recomendado {recommended} con {request.pure_hitters} atacantes puros "
            f"y lectura de transición {request.transition_read_grade}/10."
        ),
    )
