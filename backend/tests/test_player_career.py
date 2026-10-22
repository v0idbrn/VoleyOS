from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.player_career import CareerMeasurement, CareerRequest, build_career_report


def measurements() -> list[CareerMeasurement]:
    return [
        CareerMeasurement(
            period="2026-01",
            vertical_jump_cm=Decimal("52"),
            attack_reach_cm=Decimal("305"),
            serve_speed_kmh=Decimal("78"),
            attack_efficiency_pct=Decimal("38"),
            reception_pct=Decimal("52"),
        ),
        CareerMeasurement(
            period="2026-06",
            vertical_jump_cm=Decimal("61"),
            attack_reach_cm=Decimal("318"),
            serve_speed_kmh=Decimal("92"),
            attack_efficiency_pct=Decimal("47"),
            reception_pct=Decimal("61"),
        ),
    ]


def test_career_report_tracks_positive_deltas() -> None:
    report = build_career_report(
        CareerRequest(player="Valentina", measurements=measurements())
    )
    assert report.deltas["jump_cm"] == Decimal("9.0")
    assert report.deltas["reach_cm"] == Decimal("13.0")
    assert report.deltas["serve_kmh"] == Decimal("14.0")
    assert report.deltas["attack_pct"] == Decimal("9.0")
    assert report.deltas["reception_pct"] == Decimal("9.0")
    assert Decimal("0") <= report.evolution_index <= Decimal("100")


def test_evolution_index_classifies_category() -> None:
    report = build_career_report(
        CareerRequest(player="Valentina", measurements=measurements())
    )
    assert report.category in {"DEVELOPMENT", "COMPETITIVE", "ELITE", "WORLD_CLASS"}
    assert report.next_category
    assert report.gap_to_next >= Decimal("0")


def test_bottleneck_is_a_known_dimension() -> None:
    report = build_career_report(
        CareerRequest(player="Valentina", measurements=measurements())
    )
    assert report.bottleneck in {"jump", "reach", "serve", "attack", "reception"}


def test_regression_lowers_evolution_index() -> None:
    improved = build_career_report(
        CareerRequest(player="Valentina", measurements=measurements())
    )
    regressed = build_career_report(
        CareerRequest(
            player="Valentina",
            measurements=[
                measurements()[1],
                measurements()[0],
            ],
        )
    )
    assert regressed.evolution_index < improved.evolution_index
    assert regressed.deltas["jump_cm"] < Decimal("0")


def test_at_least_two_measurements_are_required() -> None:
    with pytest.raises(ValidationError):
        CareerRequest(player="Valentina", measurements=[measurements()[0]])


def test_measurement_ranges_are_enforced() -> None:
    with pytest.raises(ValidationError):
        CareerMeasurement(
            period="2026-01",
            vertical_jump_cm=Decimal("5"),
            attack_reach_cm=Decimal("305"),
            serve_speed_kmh=Decimal("78"),
            attack_efficiency_pct=Decimal("38"),
            reception_pct=Decimal("52"),
        )
