from decimal import Decimal

import pytest

from app.services.pickup_balancer import (
    PickupPlayer,
    balance_teams,
    new_king_of_court,
    next_challenger,
    record_king_result,
)


def roster(setters: int = 4) -> list[PickupPlayer]:
    roles = ["armador"] * setters + ["punta", "central", "opuesto", "libero"] * 3
    levels = [5, 4, 4, 3, 3, 2, 2, 1, 5, 3, 2, 4]
    return [
        PickupPlayer(
            name=f"P{index}", role=roles[index % len(roles)], level=levels[index % len(levels)]
        )
        for index in range(12)
    ]


def test_balance_two_teams_has_setters() -> None:
    result = balance_teams(roster(), 2)
    assert len(result.teams) == 2
    assert all(team.setters >= 1 for team in result.teams)
    assert result.delta <= Decimal("0.34")
    assert sum(len(team.players) for team in result.teams) == 12


def test_balance_three_teams() -> None:
    result = balance_teams(roster(setters=3), 3)
    assert len(result.teams) == 3
    assert all(team.setters >= 1 for team in result.teams)
    assert result.delta <= Decimal("0.34")


def test_insufficient_setters() -> None:
    with pytest.raises(ValueError, match="setter"):
        balance_teams(roster(setters=1), 2)


def test_duplicate_names_rejected() -> None:
    players = [PickupPlayer(name="Same", role="punta", level=3) for _ in range(4)]
    with pytest.raises(ValueError, match="duplicate"):
        balance_teams(players, 2)


def test_invalid_team_count() -> None:
    with pytest.raises(ValueError):
        balance_teams(roster(), 5)


def test_king_of_court_initial() -> None:
    state = new_king_of_court(["A", "B", "C"])
    assert state.champion == "A"
    assert next_challenger(state) == "B"
    assert state.streak == 0


def test_challenger_wins() -> None:
    state = new_king_of_court(["A", "B", "C"])
    updated = record_king_result(state, "B", challenger_won=True)
    assert updated.champion == "B"
    assert updated.queue == ["C", "A"]
    assert updated.streak == 1


def test_champion_defends() -> None:
    state = new_king_of_court(["A", "B", "C"])
    updated = record_king_result(state, "B", challenger_won=False)
    assert updated.champion == "A"
    assert updated.queue == ["C", "B"]
    assert updated.streak == 1


def test_wrong_challenger_rejected() -> None:
    state = new_king_of_court(["A", "B", "C"])
    with pytest.raises(ValueError, match="queue"):
        record_king_result(state, "C", challenger_won=True)
