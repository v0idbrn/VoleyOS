from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.inclusive_adaptive import AdaptiveRequest, build_adaptive_rulebook


def test_mini_four_v_four_uses_wide_short_court() -> None:
    report = build_adaptive_rulebook(
        AdaptiveRequest(mode="mini_4v4", sex="female", players=8)
    )
    assert report.court_length_m == Decimal("14.00")
    assert report.court_width_m == Decimal("7.00")
    assert report.net_height_m == Decimal("2.10")
    assert report.attack_line_m is None
    assert report.min_players == 4
    assert report.max_players == 8
    assert report.pelvis_contact_required is False


def test_mini_two_v_two_uses_narrow_court() -> None:
    report = build_adaptive_rulebook(AdaptiveRequest(mode="mini_2v2", players=4))
    assert report.court_length_m == Decimal("9.00")
    assert report.court_width_m == Decimal("4.50")
    assert report.net_height_m == Decimal("2.00")


def test_sitting_male_net_and_pelvis_rule() -> None:
    report = build_adaptive_rulebook(AdaptiveRequest(mode="sitting", sex="male", players=6))
    assert report.court_length_m == Decimal("10.00")
    assert report.court_width_m == Decimal("6.00")
    assert report.net_height_m == Decimal("1.15")
    assert report.attack_line_m == Decimal("2.00")
    assert report.block_serve_legal is False
    assert report.pelvis_contact_required is True


def test_sitting_female_net_is_lower() -> None:
    report = build_adaptive_rulebook(
        AdaptiveRequest(mode="sitting", sex="female", players=6)
    )
    assert report.net_height_m == Decimal("1.05")


def test_player_bounds_are_accepted() -> None:
    low = build_adaptive_rulebook(AdaptiveRequest(mode="mini_2v2", players=2))
    high = build_adaptive_rulebook(AdaptiveRequest(mode="mini_2v2", players=12))
    assert low.min_players == 2
    assert high.max_players == 4


def test_invalid_mode_and_player_count_are_rejected() -> None:
    with pytest.raises(ValidationError):
        AdaptiveRequest(mode="beach_2v2", players=4)
    with pytest.raises(ValidationError):
        AdaptiveRequest(mode="mini_2v2", players=13)
