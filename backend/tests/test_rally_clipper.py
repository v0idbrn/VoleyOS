from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.rally_clipper import ClipRequest, Rally, build_clip_plan


def _rally(
    start: str, end: str, player: int = 7, skill: str = "spike", outcome: str = "kill"
) -> Rally:
    return Rally(
        start_sec=Decimal(start),
        end_sec=Decimal(end),
        player_number=player,
        skill=skill,
        outcome=outcome,
    )


def _request() -> ClipRequest:
    return ClipRequest(
        rallies=[
            _rally("0", "5"),
            _rally("10", "12", skill="dig"),
            _rally("20", "26", skill="block"),
            _rally("30", "40", player=8),
        ],
        player_number=7,
        min_duration_sec=Decimal("3"),
    )


def test_plan_filters_by_player_and_duration() -> None:
    report = build_clip_plan(_request())
    assert len(report.selected) == 2
    assert len(report.rallies) == 4
    assert report.net_play_sec == Decimal("11.00")
    assert report.dead_time_sec == Decimal("29.00")
    assert report.net_play_pct == Decimal("27.50")


def test_chapters_and_edl_use_non_drop_frame_timecode() -> None:
    report = build_clip_plan(_request())
    assert report.chapters == ["00:00", "00:05"]
    assert report.edl[0] == "001  00:00:00:00 00:00:05:00  V  C  7 spike"
    assert report.edl[1] == "002  00:00:05:00 00:00:11:00  V  C  7 block"


def test_ffmpeg_command_only_uses_numeric_bounds() -> None:
    report = build_clip_plan(_request())
    assert "-ss 0.00 -to 5.00" in report.ffmpeg_command
    assert "-ss 20.00 -to 26.00" in report.ffmpeg_command
    assert "-c copy" in report.ffmpeg_command


def test_empty_selection_returns_empty_lists_not_an_error() -> None:
    request = _request()
    request = ClipRequest(
        rallies=request.rallies,
        player_number=9,
        min_duration_sec=Decimal("3"),
    )
    report = build_clip_plan(request)
    assert report.selected == []
    assert report.chapters == []
    assert report.edl == []
    assert report.ffmpeg_command == ""
    assert report.net_play_sec == Decimal("0.00")


def test_end_must_be_after_start() -> None:
    with pytest.raises(ValidationError):
        _rally("5", "5")


def test_invalid_skill_is_rejected() -> None:
    with pytest.raises(ValidationError):
        _rally("0", "4", skill="serve")
