from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.arena_dj import ArenaEventRequest, build_arena_cue


def test_monster_block_has_descending_square_tones() -> None:
    report = build_arena_cue(ArenaEventRequest(event="MONSTER_BLOCK"))
    assert report.frequencies_hz == [Decimal("110"), Decimal("82"), Decimal("55")]
    assert report.durations_ms == [180, 180, 260]
    assert report.waveform == "square"
    assert report.intensity == 5
    assert report.visual_banner_text["es"] == "MURO TOTAL"


def test_ace_siren_is_trilingual() -> None:
    report = build_arena_cue(ArenaEventRequest(event="ACE_SIREN"))
    assert report.frequencies_hz == [Decimal("660"), Decimal("880"), Decimal("1320")]
    assert set(report.visual_banner_text) == {"es", "en", "pt"}
    assert report.visual_banner_text["pt"] == "ACE DIRETO"


def test_challenge_suspense_uses_triangle_pulse() -> None:
    report = build_arena_cue(
        ArenaEventRequest(event="VIDEO_CHALLENGE_SUSPENSE")
    )
    assert report.waveform == "triangle"
    assert report.frequencies_hz == [Decimal("220")] * 3
    assert report.durations_ms[-1] == 440


def test_set_point_heartbeat_frequency_pair() -> None:
    report = build_arena_cue(ArenaEventRequest(event="SET_POINT_HEARTBEAT"))
    assert report.frequencies_hz == [Decimal("60"), Decimal("55"), Decimal("60")]
    assert report.visual_banner_text["en"] == "SET POINT"


def test_every_event_keeps_parallel_lists() -> None:
    events = [
        "MONSTER_BLOCK",
        "SUPER_SPIKE",
        "ACE_SIREN",
        "VIDEO_CHALLENGE_SUSPENSE",
        "SET_POINT_HEARTBEAT",
    ]
    for event in events:
        report = build_arena_cue(ArenaEventRequest(event=event))
        assert len(report.frequencies_hz) == len(report.durations_ms)
        assert 1 <= report.intensity <= 5
        assert set(report.visual_banner_text) == {"es", "en", "pt"}


def test_unknown_event_is_rejected() -> None:
    with pytest.raises(ValidationError):
        ArenaEventRequest(event="AIR_HORN")
    with pytest.raises(ValidationError):
        ArenaEventRequest(event="ACE_SIREN", volume=5)
