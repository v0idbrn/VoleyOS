from __future__ import annotations

import pytest

from app.services.mvp_awards import MvpRequest, PlayerStats, award_mvp


def _request() -> MvpRequest:
    return MvpRequest(
        match="Tiburones 3-1 Condores",
        players=[
            PlayerStats(
                name="Valentina",
                team="Tiburones",
                points=24,
                blocks=2,
                aces=3,
                digs=5,
                assists=1,
                pressure_points=5,
                votes=8,
            ),
            PlayerStats(
                name="Micaela",
                team="Tiburones",
                points=12,
                blocks=6,
                aces=0,
                digs=3,
                assists=0,
                pressure_points=2,
                votes=2,
            ),
            PlayerStats(
                name="Carla",
                team="Condores",
                points=9,
                blocks=1,
                aces=4,
                digs=2,
                assists=1,
                pressure_points=1,
                votes=1,
            ),
            PlayerStats(
                name="Renata",
                team="Tiburones",
                points=2,
                blocks=0,
                aces=0,
                digs=18,
                assists=1,
                pressure_points=0,
                votes=0,
                is_libero=True,
            ),
            PlayerStats(
                name="Sofia",
                team="Tiburones",
                points=3,
                blocks=0,
                aces=0,
                digs=1,
                assists=32,
                pressure_points=1,
                votes=1,
            ),
            PlayerStats(
                name="Daniela",
                team="Condores",
                points=8,
                blocks=0,
                aces=1,
                digs=4,
                assists=0,
                pressure_points=4,
                votes=0,
            ),
        ],
    )


def test_awards_cover_every_trophy() -> None:
    report = award_mvp(_request())
    keys = {award.key for award in report.awards}
    assert keys == {"MVP", "WALL", "LOCK", "SNIPER", "BUILDER", "ICE"}


def test_mvp_uses_weighted_decimal_score() -> None:
    report = award_mvp(_request())
    mvp = next(award for award in report.awards if award.key == "MVP")
    assert mvp.winner == "Valentina"
    assert mvp.metric == "score"


def test_specialists_win_their_department() -> None:
    report = award_mvp(_request())
    by_key = {award.key: award for award in report.awards}
    assert by_key["WALL"].winner == "Micaela"
    assert by_key["LOCK"].winner == "Renata"
    assert by_key["SNIPER"].winner == "Carla"
    assert by_key["BUILDER"].winner == "Sofia"
    assert by_key["ICE"].winner == "Valentina"


def test_card_is_sealed_and_shareable() -> None:
    report = award_mvp(_request())
    assert report.seal.startswith("VOS-SEAL-")
    assert "MVP" in report.card
    assert report.share_text
    assert len(report.sha256) == 64


def test_empty_match_is_rejected() -> None:
    with pytest.raises(ValueError):
        award_mvp(MvpRequest(players=[]))
