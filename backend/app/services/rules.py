"""FIVB court, score and human-physique bounds shared by all engines."""

from __future__ import annotations

from decimal import Decimal

COURT_WIDTH_M = Decimal("9.00")
COURT_LENGTH_M = Decimal("18.00")
HALF_COURT_LENGTH_M = Decimal("9.00")
COURT_WIDTH_CM = Decimal("900")
COURT_HALF_LENGTH_CM = Decimal("900")
MAX_VERTICAL_JUMP_CM = Decimal("150")


def validate_court_point(x: Decimal, y: Decimal, *, half_court: bool = False) -> None:
    """Reject any point outside the 9 m x 18 m court (9 m x 9 m per side)."""
    max_y = HALF_COURT_LENGTH_M if half_court else COURT_LENGTH_M
    if x < 0 or x > COURT_WIDTH_M:
        raise ValueError("x must be within 0.00-9.00 m")
    if y < 0 or y > max_y:
        raise ValueError(f"y must be within 0.00-{max_y} m")


def validate_half_court_cm(x: Decimal, y: Decimal) -> None:
    """Same bounds in centimetres for the tactical boards."""
    if x < 0 or x > COURT_WIDTH_CM:
        raise ValueError("x must be within 0-900 cm")
    if y < 0 or y > COURT_HALF_LENGTH_CM:
        raise ValueError("y must be within 0-900 cm")


def validate_vertical_jump(height_cm: Decimal) -> None:
    if height_cm > MAX_VERTICAL_JUMP_CM:
        raise ValueError("vertical jump exceeds the 150 cm human record")


def set_target(set_number: int, best_of: int) -> int:
    if best_of not in (1, 3, 5):
        raise ValueError("best_of must be 1, 3 or 5")
    if set_number < 1 or set_number > best_of:
        raise ValueError("set_number must be within the match")
    return 15 if set_number == best_of else 25


def is_set_closed(score_a: int, score_b: int, set_number: int = 1, best_of: int = 3) -> bool:
    """A set closes only at/above target with a two-point lead (25-24 is live)."""
    target = set_target(set_number, best_of)
    leader = max(score_a, score_b)
    gap = abs(score_a - score_b)
    return leader >= target and gap >= 2


def validate_set_score(score_a: int, score_b: int, set_number: int = 1, best_of: int = 3) -> None:
    """Reject negative or inconsistent finished sets; 25-24 is valid and live."""
    set_target(set_number, best_of)
    if score_a < 0 or score_b < 0:
        raise ValueError("scores cannot be negative")
    if score_a == score_b and score_a >= 25:
        raise ValueError("a set cannot be tied at or above the target")
