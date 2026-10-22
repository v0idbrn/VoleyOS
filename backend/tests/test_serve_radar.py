from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.serve_radar import ServeRadarRequest, analyze_serve


def test_flat_serve_is_tactical_float() -> None:
    report = analyze_serve(
        ServeRadarRequest(
            origin_x_m=Decimal("0"),
            origin_y_m=Decimal("0"),
            target_x_m=Decimal("9"),
            target_y_m=Decimal("9"),
            flight_time_ms=1000,
        )
    )
    assert report.horizontal_distance_m == Decimal("12.73")
    assert report.arc_distance_m > report.horizontal_distance_m
    assert report.classification == "FLOAT_TACTICAL"
    assert report.reaction_margin_ms == 750
    assert report.initial_speed_kmh < Decimal("65")


def test_power_serve_hits_world_class_band() -> None:
    report = analyze_serve(
        ServeRadarRequest(
            origin_x_m=Decimal("0"),
            origin_y_m=Decimal("0"),
            target_x_m=Decimal("9"),
            target_y_m=Decimal("9"),
            flight_time_ms=400,
        )
    )
    assert report.classification == "WORLD_CLASS_BOMB"
    assert report.initial_speed_kmh > Decimal("115")
    assert report.reaction_margin_ms == 150


def test_short_flight_leaves_no_reaction_margin() -> None:
    report = analyze_serve(
        ServeRadarRequest(
            origin_x_m=Decimal("1"),
            origin_y_m=Decimal("1"),
            target_x_m=Decimal("8"),
            target_y_m=Decimal("8"),
            flight_time_ms=250,
        )
    )
    assert report.reaction_margin_ms == 0


def test_flight_time_outside_range_is_rejected() -> None:
    with pytest.raises(ValidationError):
        ServeRadarRequest(
            origin_x_m=Decimal("0"),
            origin_y_m=Decimal("0"),
            target_x_m=Decimal("9"),
            target_y_m=Decimal("9"),
            flight_time_ms=100,
        )


def test_unknown_field_is_rejected() -> None:
    with pytest.raises(ValidationError):
        ServeRadarRequest(
            origin_x_m=Decimal("0"),
            origin_y_m=Decimal("0"),
            target_x_m=Decimal("9"),
            target_y_m=Decimal("9"),
            flight_time_ms=1000,
            radar="x",
        )
