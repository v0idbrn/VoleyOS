from __future__ import annotations

import pytest

from app.services.setter_signals import (
    SetterSignalRequest,
    SignalAssignment,
    build_signal_sheet,
)


def test_valid_signal_sheet_lists_every_play() -> None:
    report = build_signal_sheet(
        SetterSignalRequest(
            team="Tiburones",
            assignments=[
                SignalAssignment(gesture="index_finger", play="A"),
                SignalAssignment(gesture="two_fingers", play="B/Shoot"),
                SignalAssignment(gesture="fist", play="C/7"),
                SignalAssignment(gesture="open_hand", play="Pipe"),
            ],
        )
    )
    assert report.valid is True
    assert report.collisions == []
    assert "Tiburones" in report.sheet
    assert "Pipe" in report.sheet


def test_duplicate_gesture_is_a_collision() -> None:
    report = build_signal_sheet(
        SetterSignalRequest(
            assignments=[
                SignalAssignment(gesture="index_finger", play="A"),
                SignalAssignment(gesture="index_finger", play="D/Atras"),
            ]
        )
    )
    assert report.valid is False
    assert report.collisions[0].gesture == "index_finger"
    assert set(report.collisions[0].plays) == {"A", "D/Atras"}


def test_duplicate_play_is_reported() -> None:
    report = build_signal_sheet(
        SetterSignalRequest(
            assignments=[
                SignalAssignment(gesture="index_finger", play="A"),
                SignalAssignment(gesture="two_fingers", play="A"),
            ]
        )
    )
    assert report.duplicate_plays
    assert report.valid is False


def test_all_seven_gestures_are_supported() -> None:
    gestures = [
        "index_finger",
        "two_fingers",
        "three_fingers",
        "fist",
        "open_hand",
        "pinky",
        "thumb_up",
    ]
    plays = ["A", "B/Shoot", "C/7", "D/Atras", "Pipe", "Doble (Cruce)", "Doble (Cruce)"]
    request = SetterSignalRequest(
        assignments=[
            SignalAssignment(gesture=gesture, play=play)
            for gesture, play in zip(gestures, plays, strict=True)
        ]
    )
    report = build_signal_sheet(request)
    assert len(report.assignments) == 7
    assert report.valid is False


def test_invalid_play_is_rejected() -> None:
    with pytest.raises(ValueError):
        build_signal_sheet(
            SetterSignalRequest(
                assignments=[SignalAssignment(gesture="fist", play="Moonball")]
            )
        )
