"""Module 39 - house rules validator for mixed, relojito and short-set nights."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

HouseFormat = Literal["mixed_6v6", "relojito", "short_sets"]
Gender = Literal["M", "F"]
BENCH_SLOTS = 6


class HouseRulesRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    format: HouseFormat
    team_a_genders: list[Gender] = Field(default_factory=list, max_length=10)
    team_b_genders: list[Gender] = Field(default_factory=list, max_length=10)
    bench_order: list[str] = Field(default_factory=list, max_length=12)
    score_a: int = Field(default=0, ge=0, le=30)
    score_b: int = Field(default=0, ge=0, le=30)


class HouseRulesReport(BaseModel):
    valid: bool
    violations: list[str]
    rotation_plan: list[str]
    target_score: int
    golden_point_required: bool
    min_contacts_per_gender: int
    message: str


def _mixed_violations(
    label: str, genders: list[Gender], violations: list[str]
) -> None:
    if len(genders) != 6:
        violations.append(f"Equipo {label}: se requieren 6 jugadores en cancha.")
    if genders.count("M") < 2 or genders.count("F") < 2:
        violations.append(f"Equipo {label}: minimo 2 M y 2 F en cancha.")


def _relojito_plan(bench_order: list[str]) -> list[str]:
    return [
        f"Z6->{bench_order[index % len(bench_order)] if bench_order else f'ROT{index + 1}'}"
        for index in range(BENCH_SLOTS)
    ]


def validate_house_rules(request: HouseRulesRequest) -> HouseRulesReport:
    violations: list[str] = []
    min_contacts = 0

    if request.format == "mixed_6v6":
        min_contacts = 2
        _mixed_violations("A", request.team_a_genders, violations)
        _mixed_violations("B", request.team_b_genders, violations)
    elif request.format == "relojito":
        roster = len(request.team_a_genders)
        if not 7 <= roster <= 10:
            violations.append("Relojito: el roster debe tener entre 7 y 10 jugadores.")

    target_score = 15 if request.format == "short_sets" else 25
    golden_point = (
        request.format == "short_sets"
        and request.score_a == 14
        and request.score_b == 14
    )
    rotation_plan = (
        _relojito_plan(request.bench_order)
        if request.format == "relojito"
        else [f"Z{zone}" for zone in range(1, BENCH_SLOTS + 1)]
    )
    valid = not violations
    return HouseRulesReport(
        valid=valid,
        violations=violations,
        rotation_plan=rotation_plan,
        target_score=target_score,
        golden_point_required=golden_point,
        min_contacts_per_gender=min_contacts,
        message=(
            "Reglas de la casa validas."
            if valid
            else f"{len(violations)} violacion(es) de las reglas de la casa."
        ),
    )
