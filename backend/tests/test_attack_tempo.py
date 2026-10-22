import pytest

from app.services.attack_tempo import classify_timing, tempo_plan, tempo_window


def test_first_tempo_window() -> None:
    window = tempo_window("first", contact_ms=1000)
    assert window.ideal_start_ms == 820
    assert window.window_start_ms == 790
    assert window.window_end_ms == 850


def test_second_tempo_ideal_zero_offset() -> None:
    assert tempo_window("second").ideal_start_ms == 0


def test_third_tempo_positive_offset() -> None:
    window = tempo_window("third")
    assert window.ideal_start_ms == 350
    assert window.tolerance_ms == 60


@pytest.mark.parametrize(
    ("code", "offset", "status"),
    [
        ("first", -180, "PERFECT"),
        ("first", -220, "EARLY"),
        ("first", -100, "LATE"),
        ("second", 30, "PERFECT"),
        ("second", -60, "EARLY"),
        ("third", 400, "PERFECT"),
        ("third", 450, "LATE"),
    ],
)
def test_classify_timing(code: str, offset: int, status: str) -> None:
    assert classify_timing(code, offset).status == status


def test_unknown_tempo() -> None:
    with pytest.raises(ValueError, match="unknown tempo"):
        tempo_window("fourth")


def test_tempo_plan_covers_four() -> None:
    plan = tempo_plan(500)
    assert len(plan) == 4
    assert {item.code for item in plan} == {"first", "second", "pipe", "third"}
    assert all(item.contact_ms == 500 for item in plan)
