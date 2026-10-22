from __future__ import annotations

from decimal import Decimal

from app.services.referee_console import CardEvent, RefereeRequest, referee_report


def test_warning_has_no_score_consequence() -> None:
    report = referee_report(
        RefereeRequest(events=[CardEvent(team="A", player=7, kind="WARNING_YELLOW")])
    )
    assert report.score_a == 0
    assert report.score_b == 0
    assert report.sanctions[0].applied == "WARNING_YELLOW"
    assert report.sanctions[0].player_out_set is False


def test_second_warning_escalates_to_penalty_point() -> None:
    report = referee_report(
        RefereeRequest(
            events=[
                CardEvent(team="A", player=7, kind="WARNING_YELLOW"),
                CardEvent(team="A", player=7, kind="WARNING_YELLOW"),
            ]
        )
    )
    second = report.sanctions[1]
    assert second.applied == "PENALTY_RED"
    assert second.escalated is True
    assert report.score_b == 1
    assert report.serving == "B"
    assert "21.2" in second.text


def test_expulsion_and_disqualification_scope() -> None:
    report = referee_report(
        RefereeRequest(
            events=[
                CardEvent(team="B", player=3, kind="EXPULSION_JOINT"),
                CardEvent(team="B", player=9, kind="DISQUALIFICATION_SEPARATE"),
            ]
        )
    )
    assert report.sanctions[0].player_out_set is True
    assert report.sanctions[0].player_out_match is False
    assert report.sanctions[1].player_out_match is True
    assert report.expulsions == 1
    assert report.disqualifications == 1


def test_first_delay_warning_then_delay_penalty() -> None:
    report = referee_report(
        RefereeRequest(
            events=[
                CardEvent(team="A", kind="DELAY_WARNING"),
                CardEvent(team="A", kind="DELAY_WARNING"),
                CardEvent(team="B", kind="DELAY_WARNING"),
            ]
        )
    )
    assert report.sanctions[0].applied == "DELAY_WARNING"
    assert report.sanctions[1].applied == "DELAY_PENALTY"
    assert report.score_b == 1
    assert report.sanctions[2].applied == "DELAY_WARNING"
    assert report.delay_penalties == 1


def test_referee_exposes_fivb_timers() -> None:
    report = referee_report(RefereeRequest(events=[]))
    assert report.serve_seconds == 8
    assert report.timeout_seconds == 30
    assert Decimal("0") == report.score_a


def test_team_cannot_start_with_illegal_card() -> None:
    request = RefereeRequest(events=[CardEvent(team="C", player=1, kind="WARNING_YELLOW")])
    try:
        referee_report(request)
    except ValueError as error:
        assert "team" in str(error)
    else:
        raise AssertionError("illegal team accepted")
