from decimal import Decimal

import pytest

from app.services.biomechanics import vertical_jump_cm
from app.services.rotation_validator import CourtPosition, default_positions, validate_overlap
from app.services.rules import is_set_closed, validate_court_point
from app.services.scoreboard_engine import Player, award_point, new_match


def _match():
    return new_match(
        [Player(number=index + 1) for index in range(6)],
        [Player(number=index + 7) for index in range(6)],
        best_of=3,
    )


def test_25_24_stays_live_and_26_24_closes_set() -> None:
    state = _match().model_copy(update={"score_a": 24, "score_b": 24, "serving": "A"})
    first = award_point(state, "A")
    assert first.state.score_a == 25
    assert first.set_finished is False
    assert is_set_closed(25, 24) is False
    second = award_point(first.state, "A")
    assert second.set_finished is True
    assert second.state.sets_a == 1
    assert is_set_closed(26, 24) is True


def test_25_24_is_not_a_finished_set_but_24_26_is() -> None:
    assert is_set_closed(25, 24) is False
    assert is_set_closed(26, 24) is True
    assert is_set_closed(15, 13, set_number=3, best_of=3) is True
    assert is_set_closed(15, 14, set_number=3, best_of=3) is False


def test_court_coordinates_outside_9x9_are_rejected() -> None:
    with pytest.raises(ValueError):
        validate_court_point(Decimal("9.01"), Decimal("4.00"))
    with pytest.raises(ValueError):
        validate_court_point(Decimal("4.00"), Decimal("9.01"), half_court=True)
    with pytest.raises(ValueError):
        CourtPosition(zone=4, x=Decimal("901"), y=Decimal("100"))
    with pytest.raises(ValueError):
        validate_overlap({**default_positions(1), 4: (Decimal("-1"), Decimal("100"))})


def test_vertical_jump_over_human_record_is_rejected() -> None:
    with pytest.raises(ValueError):
        vertical_jump_cm(0, 1200)
    assert vertical_jump_cm(0, 540) == Decimal("35.76")
