"""Module 19 - FIVB referee card console with Rule 21 texts and 8s/30s clocks."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CardKind = Literal[
    "WARNING_YELLOW",
    "PENALTY_RED",
    "EXPULSION_JOINT",
    "DISQUALIFICATION_SEPARATE",
    "DELAY_WARNING",
    "DELAY_PENALTY",
]

CONDUCT_KINDS = {
    "WARNING_YELLOW",
    "PENALTY_RED",
    "EXPULSION_JOINT",
    "DISQUALIFICATION_SEPARATE",
}
DELAY_KINDS = {"DELAY_WARNING", "DELAY_PENALTY"}

RULE_TEXT: dict[str, str] = {
    "WARNING_YELLOW": (
        "Amonestacion verbal con tarjeta amarilla: se advierte al jugador, "
        "sin consecuencia en el marcador (Regla FIVB 21.1)."
    ),
    "PENALTY_RED": (
        "Castigo con tarjeta roja: se concede un punto y el saque al equipo "
        "contrario (Regla FIVB 21.2)."
    ),
    "EXPULSION_JOINT": (
        "Expulsion con tarjeta amarilla y roja juntas: el jugador debe abandonar "
        "el set y permanecer en el banquillo (Regla FIVB 21.3)."
    ),
    "DISQUALIFICATION_SEPARATE": (
        "Descalificacion con tarjeta amarilla y roja separadas: el jugador debe "
        "abandonar el partido y el area de juego (Regla FIVB 21.4)."
    ),
    "DELAY_WARNING": (
        "Advertencia por demora: primera demora del equipo en el partido, sin "
        "consecuencia en el marcador (Regla FIVB 21.5)."
    ),
    "DELAY_PENALTY": (
        "Castigo por demora: segunda o posterior demora del equipo concede punto "
        "y saque al rival (Regla FIVB 21.6)."
    ),
}


class CardEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    team: str
    player: int | None = Field(default=None, ge=1, le=99)
    kind: CardKind


class RefereeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    events: list[CardEvent] = Field(default_factory=list)
    score_a: int = Field(default=0, ge=0, le=99)
    score_b: int = Field(default=0, ge=0, le=99)
    serving: str = "A"
    set_number: int = Field(default=1, ge=1, le=5)


class Sanction(BaseModel):
    index: int
    team: str
    player: int | None
    requested: str
    applied: str
    escalated: bool
    score_a: int
    score_b: int
    serving: str
    player_out_set: bool
    player_out_match: bool
    text: str


class RefereeReport(BaseModel):
    sanctions: list[Sanction]
    score_a: int
    score_b: int
    serving: str
    warnings: int
    penalties: int
    expulsions: int
    disqualifications: int
    delay_warnings: int
    delay_penalties: int
    serve_seconds: int = 8
    timeout_seconds: int = 30
    message: str


def _other(team: str) -> str:
    return "B" if team == "A" else "A"


def referee_report(request: RefereeRequest) -> RefereeReport:
    if request.serving not in {"A", "B"}:
        raise ValueError("serving team must be A or B")
    score = {"A": request.score_a, "B": request.score_b}
    serving = request.serving
    warned_players: set[tuple[str, int]] = set()
    delay_counts: dict[str, int] = {"A": 0, "B": 0}
    counts = {
        "WARNING_YELLOW": 0,
        "PENALTY_RED": 0,
        "EXPULSION_JOINT": 0,
        "DISQUALIFICATION_SEPARATE": 0,
        "DELAY_WARNING": 0,
        "DELAY_PENALTY": 0,
    }
    sanctions: list[Sanction] = []

    for index, event in enumerate(request.events, start=1):
        if event.team not in {"A", "B"}:
            raise ValueError("team must be A or B")
        if event.kind in CONDUCT_KINDS and event.player is None:
            raise ValueError("individual conduct cards require a player number")

        applied: str = event.kind
        escalated = False
        if event.kind == "WARNING_YELLOW" and event.player is not None:
            key = (event.team, event.player)
            if key in warned_players:
                applied = "PENALTY_RED"
                escalated = True
            else:
                warned_players.add(key)
        if event.kind in DELAY_KINDS:
            delay_counts[event.team] += 1
            if delay_counts[event.team] > 1:
                applied = "DELAY_PENALTY"
                escalated = event.kind == "DELAY_WARNING"

        if applied in {"PENALTY_RED", "DELAY_PENALTY"}:
            score[_other(event.team)] += 1
            serving = _other(event.team)
        counts[applied] += 1

        player_out_set = applied in {"EXPULSION_JOINT", "DISQUALIFICATION_SEPARATE"}
        player_out_match = applied == "DISQUALIFICATION_SEPARATE"
        sanctions.append(
            Sanction(
                index=index,
                team=event.team,
                player=event.player,
                requested=event.kind,
                applied=applied,
                escalated=escalated,
                score_a=score["A"],
                score_b=score["B"],
                serving=serving,
                player_out_set=player_out_set,
                player_out_match=player_out_match,
                text=RULE_TEXT[applied],
            )
        )

    summary = (
        f"{len(sanctions)} sanciones procesadas. Marcador {score['A']}-{score['B']}, "
        f"saque {serving}."
    )
    return RefereeReport(
        sanctions=sanctions,
        score_a=score["A"],
        score_b=score["B"],
        serving=serving,
        warnings=counts["WARNING_YELLOW"],
        penalties=counts["PENALTY_RED"],
        expulsions=counts["EXPULSION_JOINT"],
        disqualifications=counts["DISQUALIFICATION_SEPARATE"],
        delay_warnings=counts["DELAY_WARNING"],
        delay_penalties=counts["DELAY_PENALTY"],
        message=summary,
    )
