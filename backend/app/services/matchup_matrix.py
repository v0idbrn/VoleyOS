"""Module 32 - 6x6 starting-rotation matchup matrix."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

CENT = Decimal("0.01")


class MatchupRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    opponent_attack: list[Decimal] = Field(min_length=6, max_length=6)
    own_block: list[Decimal] = Field(min_length=6, max_length=6)

    @field_validator("opponent_attack", "own_block")
    @classmethod
    def _power_range(cls, values: list[Decimal]) -> list[Decimal]:
        if any(value < 0 or value > 100 for value in values):
            raise ValueError("power values must be between 0 and 100")
        return values


class MatchupReport(BaseModel):
    matrix: list[list[Decimal]]
    best_starting_rotation: str
    opponent_alignment: str
    best_differential: Decimal
    worst_starting_rotation: str
    worst_differential: Decimal
    top_attacker_index: int
    best_vs_top_attacker: str
    neutralization_margin: Decimal
    message: str


def _q2(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def build_matchup_matrix(request: MatchupRequest) -> MatchupReport:
    attack = request.opponent_attack
    block = request.own_block
    matrix: list[list[Decimal]] = []
    for own in range(6):
        row: list[Decimal] = []
        for rival in range(6):
            differential = sum(
                (block[(own + index) % 6] - attack[(rival + index) % 6])
                for index in range(6)
            ) / Decimal("6")
            row.append(_q2(differential))
        matrix.append(row)
    best_own, best_rival = max(
        ((own, rival) for own in range(6) for rival in range(6)),
        key=lambda pair: matrix[pair[0]][pair[1]],
    )
    worst_own = min(range(6), key=lambda own: min(matrix[own]))
    top_attacker = max(range(6), key=lambda index: attack[index])
    best_vs_top = max(
        range(6),
        key=lambda own: block[(own + top_attacker) % 6],
    )
    margin = block[(best_vs_top + top_attacker) % 6] - attack[top_attacker]
    return MatchupReport(
        matrix=matrix,
        best_starting_rotation=f"R{best_own + 1}",
        opponent_alignment=f"R{best_rival + 1}",
        best_differential=matrix[best_own][best_rival],
        worst_starting_rotation=f"R{worst_own + 1}",
        worst_differential=min(matrix[worst_own]),
        top_attacker_index=top_attacker,
        best_vs_top_attacker=f"R{best_vs_top + 1}",
        neutralization_margin=_q2(margin),
        message=(
            f"Inicia en R{best_own + 1} contra la R{best_rival + 1} rival; "
            f"evita R{worst_own + 1}. Mejor bloqueo contra el atacante top: "
            f"R{best_vs_top + 1} ({_q2(margin)} de margen)."
        ),
    )
