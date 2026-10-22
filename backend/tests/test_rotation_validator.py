from decimal import Decimal

import pytest

from app.services.rotation_validator import (
    default_positions,
    formation_for_rotation,
    quiz_questions,
    score_quiz,
    validate_overlap,
)


@pytest.mark.parametrize("rotation", [1, 2, 3, 4, 5, 6])
def test_default_positions_are_legal(rotation: int) -> None:
    report = validate_overlap(default_positions(rotation), rotation)
    assert report.valid is True
    assert report.faults == []


def test_formation_r1() -> None:
    assert formation_for_rotation(1) == {1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6}


def test_setter_rotations() -> None:
    assert formation_for_rotation(2)[6] == 1
    assert formation_for_rotation(3)[5] == 1
    assert formation_for_rotation(6)[2] == 1


def test_invalid_rotation() -> None:
    with pytest.raises(ValueError):
        formation_for_rotation(0)


def test_missing_zone_raises() -> None:
    positions = default_positions(1)
    del positions[3]
    with pytest.raises(ValueError, match="missing zones"):
        validate_overlap(positions)


def test_front_row_behind_back_row_detected() -> None:
    positions = default_positions(1)
    positions[4] = (Decimal(150), Decimal(600))
    report = validate_overlap(positions, 1)
    assert report.valid is False
    fault = next(item for item in report.faults if item.pair == "Z4/Z5")
    assert fault.offender == 4
    assert fault.correction_cm["dy"] < 0


def test_left_order_violation_detected() -> None:
    positions = default_positions(1)
    positions[4] = (Decimal(800), Decimal(150))
    report = validate_overlap(positions, 1)
    assert any(item.pair == "Z4/Z3" for item in report.faults)


def test_back_row_order_violation_detected() -> None:
    positions = default_positions(1)
    positions[5] = (Decimal(800), Decimal(450))
    report = validate_overlap(positions, 1)
    assert any(item.pair == "Z5/Z6" for item in report.faults)


def test_quiz_has_five_questions() -> None:
    questions = quiz_questions()
    assert len(questions) == 5
    assert all(0 <= question.answer < len(question.options) for question in questions)


def test_quiz_perfect_score() -> None:
    answers = [question.answer for question in quiz_questions()]
    result = score_quiz(answers)
    assert result.score == 5
    assert result.streak == 5


def test_quiz_wrong_answers_break_streak() -> None:
    questions = quiz_questions()
    answers = [question.answer for question in questions]
    answers[1] = (answers[1] + 1) % len(questions[1].options)
    result = score_quiz(answers)
    assert result.score == 4
    assert result.streak == 3
    assert any("incorrecto" in line for line in result.feedback)


def test_quiz_length_validated() -> None:
    with pytest.raises(ValueError):
        score_quiz([0])
