"""Module 37 - inclusive adaptive rulebook for mini and sitting volleyball."""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Mode = Literal["mini_2v2", "mini_3v3", "mini_4v4", "sitting"]
Sex = Literal["male", "female"]

MINI_COURTS: dict[str, tuple[Decimal, Decimal, Decimal, int, int]] = {
    "mini_2v2": (Decimal("9.00"), Decimal("4.50"), Decimal("2.00"), 2, 4),
    "mini_3v3": (Decimal("12.00"), Decimal("6.00"), Decimal("2.05"), 3, 6),
    "mini_4v4": (Decimal("14.00"), Decimal("7.00"), Decimal("2.10"), 4, 8),
}


class AdaptiveRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    mode: Mode
    sex: Sex = "male"
    players: int = Field(ge=2, le=12)


class AdaptiveReport(BaseModel):
    mode: str
    court_length_m: Decimal
    court_width_m: Decimal
    net_height_m: Decimal
    attack_line_m: Decimal | None
    min_players: int
    max_players: int
    serving_legal: bool
    block_serve_legal: bool
    pelvis_contact_required: bool
    rules: list[str]
    message: str


def _mini_rules(mode: str) -> list[str]:
    return [
        "Saque por debajo del hombro para mantener el intercambio.",
        "Rotacion obligatoria cada vez que el equipo recupera el saque.",
        "Todos los jugadores rotan y atacan: sin especializacion temprana.",
        f"Formato {mode}: cancha reducida y red adaptada a la edad.",
    ]


def _sitting_rules() -> list[str]:
    return [
        "Contacto de gluteos o pelvis con el suelo en todo momento.",
        "El bloqueo del saque esta prohibido (FIVB sitting).",
        "Se permite empujar el balon con manos abiertas en defensa.",
        "La linea de ataque esta a 2.00 m de la red y limita el remate de zaga.",
    ]


def build_adaptive_rulebook(request: AdaptiveRequest) -> AdaptiveReport:
    if request.mode == "sitting":
        net_height = Decimal("1.15") if request.sex == "male" else Decimal("1.05")
        return AdaptiveReport(
            mode=request.mode,
            court_length_m=Decimal("10.00"),
            court_width_m=Decimal("6.00"),
            net_height_m=net_height,
            attack_line_m=Decimal("2.00"),
            min_players=2,
            max_players=6,
            serving_legal=True,
            block_serve_legal=False,
            pelvis_contact_required=True,
            rules=_sitting_rules(),
            message=(
                f"Sitting volleyball: 10.00 x 6.00 m, red {net_height} m, "
                "contacto de pelvis obligatorio."
            ),
        )

    length, width, net_height, min_players, max_players = MINI_COURTS[request.mode]
    return AdaptiveReport(
        mode=request.mode,
        court_length_m=length,
        court_width_m=width,
        net_height_m=net_height,
        attack_line_m=None,
        min_players=min_players,
        max_players=max_players,
        serving_legal=True,
        block_serve_legal=False,
        pelvis_contact_required=False,
        rules=_mini_rules(request.mode),
        message=(
            f"{request.mode}: {length} x {width} m, red {net_height} m, "
            f"{min_players}-{max_players} jugadores."
        ),
    )
