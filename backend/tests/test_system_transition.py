import pytest
from pydantic import ValidationError

from app.services.system_transition import SystemRequest, analyze_system


def test_full_setter_and_hitters_recommends_five_one() -> None:
    report = analyze_system(
        SystemRequest(
            setters=2,
            pure_hitters=5,
            transition_read_grade=7,
            rotation=1,
        )
    )
    assert report.recommended == "5-1"
    assert [option.name for option in report.systems] == ["4-2", "6-2", "5-1"]
    assert report.systems[0].front_attackers_by_rotation == [2, 2, 2, 2, 2, 2]
    assert report.systems[1].front_attackers_by_rotation == [3, 3, 3, 3, 3, 3]
    assert report.systems[2].front_attackers_by_rotation == [3, 3, 3, 2, 2, 2]


def test_two_setters_three_hitters_recommends_six_two() -> None:
    report = analyze_system(
        SystemRequest(
            setters=2,
            pure_hitters=3,
            transition_read_grade=8,
            rotation=2,
        )
    )
    assert report.recommended == "6-2"
    assert set(report.infiltration_map) == {"R1", "R2", "R3", "R4", "R5", "R6"}


def test_low_read_grade_downgrades_complex_system() -> None:
    report = analyze_system(
        SystemRequest(
            setters=1,
            pure_hitters=4,
            transition_read_grade=3,
            rotation=3,
        )
    )
    assert report.recommended == "4-2"


def test_no_setters_falls_back_to_four_two() -> None:
    report = analyze_system(
        SystemRequest(
            setters=0,
            pure_hitters=2,
            transition_read_grade=9,
            rotation=6,
        )
    )
    assert report.recommended == "4-2"


def test_setters_outside_range_is_rejected() -> None:
    with pytest.raises(ValidationError):
        SystemRequest(
            setters=3,
            pure_hitters=4,
            transition_read_grade=7,
            rotation=1,
        )


def test_rotation_outside_range_is_rejected() -> None:
    with pytest.raises(ValidationError):
        SystemRequest(
            setters=1,
            pure_hitters=3,
            transition_read_grade=7,
            rotation=7,
        )
