from datetime import date, timedelta
from decimal import Decimal

import pytest

from app.services.jump_load_monitor import DailyJump, jump_load


def series(last_week: int, previous: int = 100) -> list[DailyJump]:
    end = date(2026, 10, 22)
    days = []
    for offset in range(28):
        stamp = end - timedelta(days=27 - offset)
        jumps = last_week if stamp > end - timedelta(days=7) else previous
        days.append(DailyJump(date=stamp.isoformat(), jumps=jumps))
    return days


def test_optimal_zone() -> None:
    report = jump_load(series(100))
    assert report.acute_7d == 700
    assert report.chronic_weekly == Decimal("700.00")
    assert report.ratio == Decimal("1.00")
    assert report.zone == "ÓPTIMA"
    assert report.color == "emerald"


def test_high_load_amber() -> None:
    report = jump_load(series(180))
    assert report.ratio == Decimal("1.50")
    assert report.color == "amber"


def test_danger_zone() -> None:
    report = jump_load(series(220))
    assert report.ratio > Decimal("1.50")
    assert report.color == "crimson"
    assert "tendinopatía" in report.recommendation


def test_low_load_crimson() -> None:
    report = jump_load(series(0))
    assert report.ratio == 0
    assert report.color == "crimson"


def test_reference_date_pins_window() -> None:
    days = series(100)
    report = jump_load(days, reference_date="2026-10-20")
    assert report.reference_date == "2026-10-20"


def test_empty_data_rejected() -> None:
    with pytest.raises(ValueError, match="at least one day"):
        jump_load([])


def test_duplicate_dates_rejected() -> None:
    with pytest.raises(ValueError, match="duplicate"):
        jump_load([DailyJump(date="2026-10-22", jumps=10)] * 2)


def test_invalid_date_rejected() -> None:
    with pytest.raises(ValueError, match="invalid ISO date"):
        jump_load([DailyJump(date="22/10/2026", jumps=10)])


def test_no_data_in_window() -> None:
    with pytest.raises(ValueError, match="last 28 days"):
        jump_load([DailyJump(date="2020-01-01", jumps=10)], reference_date="2026-10-22")


def test_zero_chronic_rejected() -> None:
    with pytest.raises(ValueError, match="chronic load is zero"):
        jump_load([DailyJump(date="2026-10-22", jumps=0)])
