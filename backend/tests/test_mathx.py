from decimal import Decimal

import pytest

from app.services.mathx import (
    PI,
    acos,
    angle_at,
    cos,
    degrees,
    distance,
    radians,
    round2,
    sin,
)


def test_sin_cos_known_values() -> None:
    assert abs(sin(Decimal(0))) < Decimal("1e-28")
    assert abs(sin(PI / 2) - 1) < Decimal("1e-20")
    assert abs(cos(Decimal(0)) - 1) < Decimal("1e-28")
    assert abs(cos(PI) + 1) < Decimal("1e-15")


def test_acos_inverse() -> None:
    assert abs(degrees(acos(Decimal(0))) - 90) < Decimal("1e-15")
    assert abs(degrees(acos(Decimal("0.5"))) - 60) < Decimal("1e-15")
    assert acos(Decimal(1)) == 0
    assert degrees(acos(Decimal(-1))) == degrees(PI)


def test_angle_at_right_angle() -> None:
    assert angle_at(
        (Decimal(0), Decimal(1)), (Decimal(0), Decimal(0)), (Decimal(1), Decimal(0))
    ) == Decimal("90.00")


def test_angle_at_straight_line() -> None:
    assert angle_at(
        (Decimal(-1), Decimal(0)), (Decimal(0), Decimal(0)), (Decimal(1), Decimal(0))
    ) == Decimal("180.00")


def test_angle_at_degenerate() -> None:
    assert (
        angle_at((Decimal(0), Decimal(0)), (Decimal(0), Decimal(0)), (Decimal(1), Decimal(0))) == 0
    )


def test_distance_and_rounding() -> None:
    assert distance((Decimal(0), Decimal(0)), (Decimal(3), Decimal(4))) == 5
    assert round2(Decimal("1.005")) == Decimal("1.00")
    assert abs(radians(Decimal(180)) - PI) < Decimal("1e-20")


@pytest.mark.parametrize(
    ("angle", "expected"),
    [(0, "0"), (30, "0.5"), (90, "1")],
)
def test_sin_table(angle: int, expected: str) -> None:
    assert abs(sin(radians(Decimal(angle))) - Decimal(expected)) < Decimal("1e-20")
