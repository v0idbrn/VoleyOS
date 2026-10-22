from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.momentum_coach import MomentumRequest, analyze_momentum


def test_momentum_calls_timeout_after_three_run() -> None:
    report = analyze_momentum(
        MomentumRequest(
            team="A",
            rally_winner_history=["A", "A", "B", "B", "B"],
            rotation_history=[1, 2, 3, 3, 3],
        )
    )
    assert report.recommendation == "CALL_TIMEOUT_NOW_3_RUN"
    assert report.consecutive_breaks == 1
    assert report.opponent_run == 3
    assert report.momentum_index == Decimal("-20.00")


def test_momentum_urgent_after_five_run() -> None:
    report = analyze_momentum(
        MomentumRequest(
            team="A",
            rally_winner_history=["A", "B", "B", "B", "B", "B"],
        )
    )
    assert report.recommendation == "URGENT_TIMEOUT_OR_SUB_5_RUN"
    assert report.opponent_run == 5


def test_momentum_holds_when_target_is_in_control() -> None:
    report = analyze_momentum(
        MomentumRequest(team="A", rally_winner_history=["A", "A", "B", "A", "A"])
    )
    assert report.recommendation == "HOLD"
    assert report.momentum_index == Decimal("60.00")
    assert report.opponent_run == 0


def test_momentum_identifies_worst_rotation() -> None:
    report = analyze_momentum(
        MomentumRequest(
            team="A",
            rally_winner_history=["B", "B", "B", "B"],
            rotation_history=[3, 3, 3, 2],
        )
    )
    assert report.worst_rotation == 3
    assert report.worst_run == 3


def test_momentum_rejects_mismatched_rotation_history() -> None:
    with pytest.raises(ValidationError):
        MomentumRequest(
            team="A",
            rally_winner_history=["A", "B"],
            rotation_history=[1],
        )


def test_momentum_rejects_empty_history() -> None:
    with pytest.raises(ValidationError):
        MomentumRequest(team="A", rally_winner_history=[])

