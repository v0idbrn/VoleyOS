from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.matchup_matrix import MatchupRequest, build_matchup_matrix

ATTACK = [Decimal(value) for value in ("90", "70", "60", "50", "40", "30")]
BLOCK = [Decimal(value) for value in ("50", "55", "60", "65", "70", "75")]


def test_matrix_has_all_thirty_six_combinations() -> None:
    report = build_matchup_matrix(
        MatchupRequest(opponent_attack=ATTACK, own_block=BLOCK)
    )
    assert len(report.matrix) == 6
    assert all(len(row) == 6 for row in report.matrix)
    assert report.best_starting_rotation in {f"R{index}" for index in range(1, 7)}
    assert report.worst_starting_rotation in {f"R{index}" for index in range(1, 7)}
    assert report.best_differential >= report.worst_differential


def test_best_rotation_puts_top_blocker_on_top_attacker() -> None:
    report = build_matchup_matrix(
        MatchupRequest(opponent_attack=ATTACK, own_block=BLOCK)
    )
    assert report.top_attacker_index == 0
    assert report.best_vs_top_attacker == "R6"


def test_matrix_values_are_decimal() -> None:
    report = build_matchup_matrix(
        MatchupRequest(opponent_attack=ATTACK, own_block=BLOCK)
    )
    assert all(isinstance(cell, Decimal) for row in report.matrix for cell in row)


def test_six_values_are_required() -> None:
    with pytest.raises(ValidationError):
        MatchupRequest(opponent_attack=ATTACK[:5], own_block=BLOCK)


def test_out_of_range_power_is_rejected() -> None:
    with pytest.raises(ValidationError):
        MatchupRequest(
            opponent_attack=[Decimal("101")] + ATTACK[1:],
            own_block=BLOCK,
        )
