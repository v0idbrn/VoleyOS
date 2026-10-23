from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.deception_reader import DeceptionRequest, read_deception


def test_percentages_sum_to_exactly_one_hundred() -> None:
    report = read_deception(
        DeceptionRequest(
            approach_speed_kmh=Decimal("20"),
            elbow_height_cm=Decimal("150"),
            ball_front_offset_cm=Decimal("0"),
            setter_front_zone_jump=True,
            blockers_committed=2,
        )
    )
    assert report.hard_swing_pct == Decimal("49.0")
    assert report.off_speed_tip_pct == Decimal("31.5")
    assert report.setter_dump_pct == Decimal("19.5")
    assert (
        report.hard_swing_pct + report.off_speed_tip_pct + report.setter_dump_pct
        == Decimal("100.0")
    )


def test_setter_dump_is_boosted_by_jump_and_blockers() -> None:
    base = read_deception(
        DeceptionRequest(
            approach_speed_kmh=Decimal("22"),
            elbow_height_cm=Decimal("140"),
            ball_front_offset_cm=Decimal("5"),
            setter_front_zone_jump=False,
            blockers_committed=0,
        )
    )
    loaded = read_deception(
        DeceptionRequest(
            approach_speed_kmh=Decimal("22"),
            elbow_height_cm=Decimal("140"),
            ball_front_offset_cm=Decimal("5"),
            setter_front_zone_jump=True,
            blockers_committed=3,
        )
    )
    assert loaded.setter_dump_pct > base.setter_dump_pct


def test_primary_defender_follows_ball_side() -> None:
    left = read_deception(
        DeceptionRequest(
            approach_speed_kmh=Decimal("18"),
            elbow_height_cm=Decimal("130"),
            ball_front_offset_cm=Decimal("-20"),
            setter_front_zone_jump=False,
            blockers_committed=2,
        )
    )
    right = read_deception(
        DeceptionRequest(
            approach_speed_kmh=Decimal("18"),
            elbow_height_cm=Decimal("130"),
            ball_front_offset_cm=Decimal("20"),
            setter_front_zone_jump=False,
            blockers_committed=2,
        )
    )
    assert left.primary_defender == "left_back"
    assert right.primary_defender == "right_back"


def test_front_zone_jump_puts_libero_on_dump_duty() -> None:
    report = read_deception(
        DeceptionRequest(
            approach_speed_kmh=Decimal("12"),
            elbow_height_cm=Decimal("110"),
            ball_front_offset_cm=Decimal("0"),
            setter_front_zone_jump=True,
            blockers_committed=1,
        )
    )
    assert report.primary_defender == "libero"


def test_approach_speed_below_range_is_rejected() -> None:
    with pytest.raises(ValidationError):
        DeceptionRequest(
            approach_speed_kmh=Decimal("4.9"),
            elbow_height_cm=Decimal("150"),
            ball_front_offset_cm=Decimal("0"),
            setter_front_zone_jump=False,
            blockers_committed=0,
        )


def test_blockers_outside_range_is_rejected() -> None:
    with pytest.raises(ValidationError):
        DeceptionRequest(
            approach_speed_kmh=Decimal("20"),
            elbow_height_cm=Decimal("150"),
            ball_front_offset_cm=Decimal("0"),
            setter_front_zone_jump=False,
            blockers_committed=4,
        )
