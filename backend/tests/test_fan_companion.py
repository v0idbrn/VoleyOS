from __future__ import annotations

import pytest

from app.services.fan_companion import FanRequest, fan_report


def test_decode_returns_trilingual_official_call() -> None:
    report = fan_report(FanRequest(action="decode", gesture="four_fingers"))
    assert report.decision is not None
    assert report.decision.gesture == "four_fingers"
    assert "cuatro" in report.decision.call["es"].lower()
    assert "four" in report.decision.call["en"].lower()
    assert "quatro" in report.decision.call["pt"].lower()
    assert report.decision.rule


@pytest.mark.parametrize(
    "gesture",
    [
        "two_fingers_up",
        "forearm_touch",
        "crossed_arms",
        "four_fingers",
        "hands_twirling",
        "touch_top_net",
        "point_court_line",
        "thumbs_up_out",
    ],
)
def test_every_referee_gesture_is_documented(gesture: str) -> None:
    report = fan_report(FanRequest(action="decode", gesture=gesture))
    assert report.decision is not None
    assert report.decision.why["es"]
    assert report.decision.example["pt"]


def test_trivia_without_answers_returns_questions() -> None:
    report = fan_report(FanRequest(action="trivia"))
    assert report.trivia is not None
    assert len(report.trivia.questions) >= 4
    assert report.trivia.score == 0
    assert report.trivia.rank == "TRIBUNA_NOVATA"


def test_trivia_scores_correct_answers() -> None:
    questions = fan_report(FanRequest(action="trivia")).trivia
    assert questions is not None
    answers = [question.correct for question in questions.questions]
    report = fan_report(FanRequest(action="trivia", answers=answers))
    assert report.trivia is not None
    assert report.trivia.score == len(answers)
    assert report.trivia.rank == "ORACULO_DE_TRIBUNA"


def test_trivia_penalises_wrong_answers() -> None:
    report = fan_report(FanRequest(action="trivia", answers=[0, 0, 0, 0, 0]))
    assert report.trivia is not None
    assert report.trivia.score < 5


def test_unknown_gesture_is_rejected() -> None:
    with pytest.raises(ValueError):
        fan_report(FanRequest(action="decode", gesture="air_guitar"))
