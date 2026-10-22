import pytest
from pydantic import ValidationError

from app.services.practice_planner import PracticeRequest, plan_practice


def test_seven_players_get_two_active_groups() -> None:
    report = plan_practice(
        PracticeRequest(players=7, duration_min=90, focus="k1_reception")
    )
    assert sum(block.minutes for block in report.blocks) == 90
    assert report.groups == [4, 3]
    assert all(len(block.groups) == 2 for block in report.blocks)
    assert all(sum(block.groups) == 7 for block in report.blocks)


def test_twenty_four_players_fill_four_courts() -> None:
    report = plan_practice(
        PracticeRequest(players=24, duration_min=120, focus="serve_pressure")
    )
    assert report.groups == [6, 6, 6, 6]
    assert sum(block.minutes for block in report.blocks) == 120


def test_odd_player_counts_never_leave_idle_players() -> None:
    for players in (9, 11, 13):
        report = plan_practice(
            PracticeRequest(players=players, duration_min=60, focus="setter_tempo")
        )
        assert sum(report.groups) == players
        assert all(size >= 2 for size in report.groups)
        assert all(sum(block.groups) == players for block in report.blocks)


def test_all_focus_areas_generate_scoring_targets() -> None:
    for focus in (
        "k1_reception",
        "block_defense_transition",
        "serve_pressure",
        "setter_tempo",
    ):
        report = plan_practice(
            PracticeRequest(players=12, duration_min=60, focus=focus)
        )
        assert all(block.scoring_target for block in report.blocks)


def test_invalid_duration_is_rejected() -> None:
    with pytest.raises(ValidationError):
        PracticeRequest(players=7, duration_min=75, focus="k1_reception")


def test_player_bounds_are_enforced() -> None:
    with pytest.raises(ValidationError):
        PracticeRequest(players=3, duration_min=60, focus="k1_reception")
    with pytest.raises(ValidationError):
        PracticeRequest(players=25, duration_min=60, focus="k1_reception")
