import pytest
from pydantic import ValidationError

from app.services.match_poster import MatchPosterRequest, PosterPeriod, build_match_poster


def request() -> MatchPosterRequest:
    return MatchPosterRequest(
        home_team="Tiburones",
        away_team="Condores",
        sets_home=3,
        sets_away=1,
        periods=[
            PosterPeriod(home=25, away=21),
            PosterPeriod(home=22, away=25),
            PosterPeriod(home=25, away=19),
            PosterPeriod(home=25, away=23),
        ],
        tournament="Copa Verano",
        mvp="Valentina",
        room_id="TIB-2026",
        theme="obsidian",
        format="story",
    )


def test_story_poster_has_svg_dimensions_and_data() -> None:
    report = build_match_poster(request())
    assert report.width == 1080
    assert report.height == 1920
    assert report.svg.startswith("<svg")
    assert "Tiburones" in report.svg
    assert "Condores" in report.svg
    assert "VOS-SEAL-" in report.svg
    assert "Copa Verano" in report.svg
    assert report.filename == "volleyos-match-poster-story.svg"


def test_feed_poster_is_square() -> None:
    report = build_match_poster(request().model_copy(update={"format": "feed"}))
    assert report.width == 1080
    assert report.height == 1080
    assert report.filename == "volleyos-match-poster-feed.svg"


def test_poster_escapes_malicious_names() -> None:
    payload = request().model_copy(
        update={"home_team": '"><script>alert(1)</script>'})
    report = build_match_poster(payload)
    assert "<script>" not in report.svg
    assert "&lt;script&gt;" in report.svg


def test_poster_includes_room_code_matrix() -> None:
    report = build_match_poster(request())
    assert len(report.room_matrix) == 25
    assert all(cell in {"0", "1"} for cell in report.room_matrix)


def test_poster_requires_periods() -> None:
    with pytest.raises(ValidationError):
        MatchPosterRequest(
            home_team="A",
            away_team="B",
            sets_home=0,
            sets_away=0,
            periods=[],
        )


def test_poster_rejects_too_many_periods() -> None:
    with pytest.raises(ValidationError):
        MatchPosterRequest(
            home_team="A",
            away_team="B",
            sets_home=3,
            sets_away=2,
            periods=[PosterPeriod(home=25, away=20) for _ in range(6)],
        )
