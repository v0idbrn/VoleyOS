"""Decimal-only geometry helpers.

No binary floats anywhere: trigonometry is implemented with Decimal Taylor
series and bisection so biomechanical angles stay exact end to end.
"""

from __future__ import annotations

from decimal import Decimal

PI = Decimal("3.14159265358979323846264338327950288419716939937510")
TWO_PI = PI * 2
HALF_PI = PI / 2
ZERO = Decimal("0")
ONE = Decimal("1")
HUNDRED = Decimal("100")


def sin(x: Decimal) -> Decimal:
    x = x % TWO_PI
    if x > PI:
        x -= TWO_PI
    term = x
    total = x
    n = 1
    while True:
        term *= -x * x / Decimal((2 * n) * (2 * n + 1))
        total += term
        n += 1
        if abs(term) < Decimal("1e-30") or n > 80:
            return total


def cos(x: Decimal) -> Decimal:
    x = x % TWO_PI
    if x > PI:
        x -= TWO_PI
    term = ONE
    total = ONE
    n = 1
    while True:
        term *= -x * x / Decimal((2 * n - 1) * (2 * n))
        total += term
        n += 1
        if abs(term) < Decimal("1e-30") or n > 80:
            return total


def acos(x: Decimal) -> Decimal:
    if x <= -ONE:
        return PI
    if x >= ONE:
        return ZERO
    low = ZERO
    high = PI
    for _ in range(90):
        mid = (low + high) / 2
        if cos(mid) > x:
            low = mid
        else:
            high = mid
    return (low + high) / 2


def degrees(radians: Decimal) -> Decimal:
    return radians * 180 / PI


def radians(degrees_value: Decimal) -> Decimal:
    return degrees_value * PI / 180


def round2(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"))


def point(x: Decimal | int | str, y: Decimal | int | str) -> tuple[Decimal, Decimal]:
    return (Decimal(x), Decimal(y))


def distance(a: tuple[Decimal, Decimal], b: tuple[Decimal, Decimal]) -> Decimal:
    dx = a[0] - b[0]
    dy = a[1] - b[1]
    return (dx * dx + dy * dy).sqrt()


def angle_at(
    a: tuple[Decimal, Decimal],
    b: tuple[Decimal, Decimal],
    c: tuple[Decimal, Decimal],
) -> Decimal:
    """Angle ABC in degrees, b is the vertex."""
    v1 = (a[0] - b[0], a[1] - b[1])
    v2 = (c[0] - b[0], c[1] - b[1])
    n1 = (v1[0] * v1[0] + v1[1] * v1[1]).sqrt()
    n2 = (v2[0] * v2[0] + v2[1] * v2[1]).sqrt()
    if n1 == 0 or n2 == 0:
        return ZERO
    cosine = (v1[0] * v2[0] + v1[1] * v2[1]) / (n1 * n2)
    cosine = max(-ONE, min(ONE, cosine))
    return round2(degrees(acos(cosine)))


def signed_angle_from_vertical(
    origin: tuple[Decimal, Decimal],
    target: tuple[Decimal, Decimal],
) -> Decimal:
    """Degrees from vertical (+y up), positive when target is to the right."""
    dx = target[0] - origin[0]
    dy = target[1] - origin[1]
    if dx == 0 and dy == 0:
        return ZERO
    return round2(
        degrees(acos(max(-ONE, min(ONE, dy / distance(origin, target))))) * (1 if dx >= 0 else -1)
    )
