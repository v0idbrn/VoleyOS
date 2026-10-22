import pytest
from pydantic import ValidationError

from app.services.roster_pass import (
    RosterPlayer,
    RosterRequest,
    build_roster_pass,
    verify_roster_pass,
)


def roster() -> RosterRequest:
    return RosterRequest(
        team="Tiburones",
        tournament="Copa Verano",
        players=[
            RosterPlayer(name="Sofia", number=1, role="setter", is_captain=True),
            RosterPlayer(name="Valentina", number=4, role="outside"),
            RosterPlayer(name="Micaela", number=7, role="outside"),
            RosterPlayer(name="Renata", number=9, role="middle"),
            RosterPlayer(name="Carla", number=11, role="opposite"),
            RosterPlayer(name="Julieta", number=14, role="middle"),
            RosterPlayer(name="Martina", number=21, role="libero", is_libero=True),
            RosterPlayer(name="Lucia", number=22, role="libero", is_libero=True),
        ],
    )


def test_roster_pass_is_verifiable_and_prefixed() -> None:
    request = roster()
    report = build_roster_pass(request)
    assert report.pass_code.startswith("VOS-ROSTER-")
    assert report.liberos == 2
    assert report.captain == "Sofia"
    assert report.sha256
    assert verify_roster_pass(request, report.pass_code) is True


def test_roster_pass_rejects_tampered_code() -> None:
    request = roster()
    build_roster_pass(request)
    assert verify_roster_pass(request, "VOS-ROSTER-00000000") is False


def test_roster_rejects_duplicate_shirts() -> None:
    with pytest.raises(ValidationError):
        RosterRequest(
            team="X",
            players=[
                RosterPlayer(name="A", number=1, role="setter", is_captain=True),
                RosterPlayer(name="B", number=1, role="outside"),
                RosterPlayer(name="C", number=2, role="outside"),
                RosterPlayer(name="D", number=3, role="middle"),
                RosterPlayer(name="E", number=4, role="middle"),
                RosterPlayer(name="F", number=5, role="opposite"),
            ],
        )


def test_roster_rejects_three_liberos() -> None:
    players = roster().players
    players[0] = RosterPlayer(name="Sofia", number=1, role="setter")
    players[1] = RosterPlayer(name="Valentina", number=4, role="libero", is_libero=True)
    with pytest.raises(ValidationError):
        RosterRequest(team="X", players=players)


def test_roster_rejects_captain_libero() -> None:
    players = roster().players
    players[0] = RosterPlayer(
        name="Sofia", number=1, role="libero", is_captain=True, is_libero=True
    )
    with pytest.raises(ValidationError):
        RosterRequest(team="X", players=players)


def test_roster_rejects_missing_captain() -> None:
    players = roster().players
    players[0] = RosterPlayer(name="Sofia", number=1, role="setter")
    with pytest.raises(ValidationError):
        RosterRequest(team="X", players=players)


def test_roster_rejects_short_team() -> None:
    with pytest.raises(ValidationError):
        RosterRequest(team="X", players=roster().players[:5])
