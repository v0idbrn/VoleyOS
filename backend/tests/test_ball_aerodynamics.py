from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.ball_aerodynamics import BallAeroRequest, analyze_aerodynamics


def test_low_speed_low_spin_triggers_float_crisis() -> None:
    report = analyze_aerodynamics(
        BallAeroRequest(
            speed_kmh=Decimal("60"),
            spin_rps=Decimal("0"),
            launch_angle_deg=Decimal("0"),
            impact_height_m=Decimal("2.0"),
        )
    )
    assert report.regime == "FLYING_FLOAT_CRISIS"
    assert report.reynolds_number == 233333
    assert report.lateral_deviation_cm == Decimal("27.80")
    assert report.vertical_drop_cm > Decimal("0")
    assert report.lands_in_court is True


def test_high_spin_triggers_magnus_descent() -> None:
    report = analyze_aerodynamics(
        BallAeroRequest(
            speed_kmh=Decimal("100"),
            spin_rps=Decimal("8"),
            launch_angle_deg=Decimal("10"),
            impact_height_m=Decimal("2.0"),
        )
    )
    assert report.regime == "MAGNUS_DESCENT"
    assert report.lateral_deviation_cm == Decimal("24.00")
    assert report.vertical_drop_cm > Decimal("32")


def test_mid_speed_without_spin_is_stable_drive() -> None:
    report = analyze_aerodynamics(
        BallAeroRequest(
            speed_kmh=Decimal("90"),
            spin_rps=Decimal("0.5"),
            launch_angle_deg=Decimal("0"),
            impact_height_m=Decimal("2.0"),
        )
    )
    assert report.regime == "STABLE_DRIVE"
    assert report.lands_in_court is True


def test_crisis_boundaries_are_inclusive() -> None:
    report = analyze_aerodynamics(
        BallAeroRequest(
            speed_kmh=Decimal("52"),
            spin_rps=Decimal("1.2"),
            launch_angle_deg=Decimal("0"),
            impact_height_m=Decimal("0.5"),
        )
    )
    assert report.regime == "FLYING_FLOAT_CRISIS"


def test_speed_below_range_is_rejected() -> None:
    with pytest.raises(ValidationError):
        BallAeroRequest(
            speed_kmh=Decimal("51.9"),
            spin_rps=Decimal("0"),
            launch_angle_deg=Decimal("0"),
            impact_height_m=Decimal("2.0"),
        )


def test_unknown_field_is_rejected() -> None:
    with pytest.raises(ValidationError):
        BallAeroRequest(
            speed_kmh=Decimal("100"),
            spin_rps=Decimal("2"),
            launch_angle_deg=Decimal("10"),
            impact_height_m=Decimal("2.0"),
            humidity_pct=Decimal("50"),
        )
