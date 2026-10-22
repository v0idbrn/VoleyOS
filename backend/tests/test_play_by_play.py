import pytest
from pydantic import ValidationError

from app.services.play_by_play import MatchEvent, PlayByPlayRequest, build_play_by_play


def events() -> list[MatchEvent]:
    return [
        MatchEvent(
            kind="point", team="home", player="Valentina",
            score_home=1, score_away=0, set_number=1,
        ),
        MatchEvent(
            kind="point", team="away", player="Carla",
            score_home=1, score_away=2, set_number=1,
        ),
        MatchEvent(
            kind="point", team="home", player="Sofia",
            score_home=3, score_away=2, set_number=1,
        ),
        MatchEvent(
            kind="timeout", team="away",
            score_home=20, score_away=20, set_number=3,
        ),
        MatchEvent(
            kind="point", team="home", player="Renata",
            score_home=21, score_away=21, set_number=3,
        ),
        MatchEvent(
            kind="card", team="away", player="Carla",
            score_home=21, score_away=21, set_number=3,
        ),
    ]


def test_feed_is_chronological_and_enriched() -> None:
    report = build_play_by_play(
        PlayByPlayRequest(home_team="Tiburones", away_team="Condores", events=events())
    )
    assert len(report.feed) == 6
    assert [entry.index for entry in report.feed] == [1, 2, 3, 4, 5, 6]
    assert all(entry.headline for entry in report.feed)
    assert all(entry.commentary for entry in report.feed)


def test_clutch_point_is_flagged_from_twenty_twenty() -> None:
    report = build_play_by_play(
        PlayByPlayRequest(home_team="Tiburones", away_team="Condores", events=events())
    )
    clutch = [entry for entry in report.feed if entry.clutch]
    assert len(clutch) == 1
    assert clutch[0].score == "21-21"
    assert report.clutch_points == 1


def test_lead_changes_are_counted() -> None:
    report = build_play_by_play(
        PlayByPlayRequest(home_team="Tiburones", away_team="Condores", events=events())
    )
    assert report.lead_changes == 2


def test_summary_exists_in_three_languages() -> None:
    report = build_play_by_play(
        PlayByPlayRequest(home_team="Tiburones", away_team="Condores", events=events())
    )
    assert set(report.summary) == {"es", "en", "pt"}
    assert "Tiburones" in report.summary["es"]
    assert "Condores" in report.summary["en"]
    assert "Tiburones" in report.summary["pt"]


def test_empty_events_are_rejected() -> None:
    with pytest.raises(ValidationError):
        PlayByPlayRequest(home_team="A", away_team="B", events=[])


def test_invalid_event_kind_is_rejected() -> None:
    with pytest.raises(ValidationError):
        MatchEvent(kind="dance", team="home", score_home=1, score_away=0, set_number=1)
