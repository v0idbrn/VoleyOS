from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.elo_ranking import EloRequest, calculate_elo


def test_equal_ratings_sweep_pays_full_k() -> None:
    report = calculate_elo(
        EloRequest(
            team_a_rating=Decimal("1500"),
            team_b_rating=Decimal("1500"),
            k_weight=Decimal("20"),
            result="3-0",
        )
    )
    assert report.expected_a == Decimal("0.5000")
    assert report.score_a == Decimal("1")
    assert report.margin_factor == Decimal("1.0")
    assert report.delta_a == Decimal("10.00")
    assert report.delta_b == Decimal("-10.00")
    assert report.delta_a + report.delta_b == Decimal("0.00")


def test_five_set_win_uses_point_eight_margin() -> None:
    report = calculate_elo(
        EloRequest(
            team_a_rating=Decimal("1800"),
            team_b_rating=Decimal("1500"),
            k_weight=Decimal("30"),
            result="3-2",
        )
    )
    assert report.score_a == Decimal("1")
    assert report.margin_factor == Decimal("0.8")
    assert report.expected_a == Decimal("0.8490")
    assert report.delta_a == Decimal("3.62")
    assert report.delta_b == Decimal("-3.62")


def test_upset_gives_points_to_underdog() -> None:
    report = calculate_elo(
        EloRequest(
            team_a_rating=Decimal("1600"),
            team_b_rating=Decimal("1400"),
            k_weight=Decimal("20"),
            result="0-3",
        )
    )
    assert report.expected_a == Decimal("0.7597")
    assert report.score_a == Decimal("0")
    assert report.delta_a < 0
    assert report.delta_b > 0
    assert report.delta_a + report.delta_b == Decimal("0.00")


def test_expected_a_is_rounded_to_four_places() -> None:
    report = calculate_elo(
        EloRequest(
            team_a_rating=Decimal("1600"),
            team_b_rating=Decimal("1400"),
            k_weight=Decimal("20"),
            result="3-1",
        )
    )
    assert report.expected_a.as_tuple().exponent == -4


def test_k_weight_below_range_is_rejected() -> None:
    with pytest.raises(ValidationError):
        EloRequest(
            team_a_rating=Decimal("1500"),
            team_b_rating=Decimal("1500"),
            k_weight=Decimal("5"),
            result="3-0",
        )


def test_rating_above_range_and_unknown_field_are_rejected() -> None:
    with pytest.raises(ValidationError):
        EloRequest(
            team_a_rating=Decimal("5001"),
            team_b_rating=Decimal("1500"),
            k_weight=Decimal("20"),
            result="3-0",
        )
    with pytest.raises(ValidationError):
        EloRequest(
            team_a_rating=Decimal("1500"),
            team_b_rating=Decimal("1500"),
            k_weight=Decimal("20"),
            result="3-0",
            court="9",
        )
