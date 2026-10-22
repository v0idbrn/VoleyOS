from __future__ import annotations

from app.services.substitution_tracker import SubEvent, SubstitutionRequest, track_substitutions


def _request(events: list[SubEvent]) -> SubstitutionRequest:
    return SubstitutionRequest(set_number=1, substitutions=events)


def test_starter_out_and_reentry_by_same_substitute() -> None:
    report = track_substitutions(
        _request(
            [
                SubEvent(team="A", out_number=7, in_number=12, position=4),
                SubEvent(team="A", out_number=12, in_number=7, position=4),
            ]
        )
    )
    assert [row.status for row in report.events] == ["LEGAL", "LEGAL"]
    assert report.events[0].remaining_subs == 5
    assert report.events[1].remaining_subs == 4
    assert report.pairs[0].status == "closed"


def test_substitute_cannot_reenter_the_same_set() -> None:
    report = track_substitutions(
        _request(
            [
                SubEvent(team="A", out_number=7, in_number=12, position=4),
                SubEvent(team="A", out_number=12, in_number=7, position=4),
                SubEvent(team="A", out_number=7, in_number=12, position=4),
            ]
        )
    )
    assert report.events[2].status == "ILLEGAL_SUBSTITUTION"
    assert "cannot re-enter" in report.events[2].reason


def test_seventh_substitution_is_illegal() -> None:
    events = [
        SubEvent(
            team="A",
            out_number=index + 1,
            in_number=index + 20,
            position=index % 6 + 1,
        )
        for index in range(7)
    ]
    report = track_substitutions(_request(events))
    assert [row.status for row in report.events[:6]] == ["LEGAL"] * 6
    assert report.events[6].status == "ILLEGAL_SUBSTITUTION"
    assert report.events[6].remaining_subs == 0
    assert "six substitutions" in report.events[6].reason


def test_exceptional_injury_substitution_does_not_consume_limit() -> None:
    report = track_substitutions(
        _request([SubEvent(team="B", out_number=3, in_number=15, position=2, exceptional=True)])
    )
    assert report.events[0].status == "LEGAL"
    assert report.events[0].remaining_subs == 6
    assert report.events[0].exceptional is True


def test_pair_is_bound_to_position() -> None:
    report = track_substitutions(
        _request(
            [
                SubEvent(team="A", out_number=7, in_number=12, position=4),
                SubEvent(team="A", out_number=12, in_number=7, position=5),
            ]
        )
    )
    assert report.events[1].status == "ILLEGAL_SUBSTITUTION"
    assert "position" in report.events[1].reason


def test_remaining_subs_tracks_both_teams() -> None:
    report = track_substitutions(
        _request(
            [
                SubEvent(team="A", out_number=1, in_number=11, position=1),
                SubEvent(team="A", out_number=2, in_number=12, position=2),
                SubEvent(team="B", out_number=3, in_number=13, position=3),
            ]
        )
    )
    assert report.remaining_subs == {"A": 4, "B": 5}
