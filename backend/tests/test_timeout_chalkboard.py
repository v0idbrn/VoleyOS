from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.timeout_chalkboard import (
    ChalkboardRequest,
    Point,
    Stroke,
    build_chalkboard,
)


def test_chalkboard_returns_two_cues_and_thirty_seconds() -> None:
    report = build_chalkboard(
        ChalkboardRequest(
            reason="stop_serve_run",
            rotation=4,
            score_a=18,
            score_b=21,
            serving="B",
            strokes=[
                Stroke(points=[Point(x="1", y="1"), Point(x="5", y="7")]),
                Stroke(points=[Point(x="6", y="12"), Point(x="8", y="16")]),
            ],
        )
    )
    assert report.seconds == Decimal("30.0")
    assert len(report.cues) == 2
    assert report.strokes[0].length_m > Decimal("0")
    assert report.strokes[0].arrowhead == Point(x="5", y="7")
    assert report.total_length_m > Decimal("0")


def test_chalkboard_rejects_stroke_outside_court() -> None:
    with pytest.raises(ValidationError):
        Stroke(points=[Point(x="9.5", y="2"), Point(x="4", y="4")])


def test_chalkboard_rejects_single_point_stroke() -> None:
    with pytest.raises(ValidationError):
        Stroke(points=[Point(x="1", y="2")])


def test_chalkboard_uses_reason_specific_cues() -> None:
    report = build_chalkboard(
        ChalkboardRequest(reason="match_point_defense", rotation=6, serving="A")
    )
    codes = {cue.code for cue in report.cues}
    assert codes == {"block_line", "backcourt_cover"}
    assert all(cue.priority in {"HIGH", "CRITICAL"} for cue in report.cues)


def test_chalkboard_marks_degenerate_stroke_as_zero_length() -> None:
    report = build_chalkboard(
        ChalkboardRequest(
            reason="organize_sideout",
            rotation=1,
            strokes=[Stroke(points=[Point(x="2", y="2"), Point(x="2", y="2")])],
        )
    )
    assert report.strokes[0].length_m == Decimal("0")
    assert report.strokes[0].valid is True
