import pytest

from app.services.beach_engine import (
    award_point,
    new_beach_match,
    server_name,
    side_switch_due,
    switch_interval,
)


def match() -> object:
    return new_beach_match(["Ana", "Bea"], ["Carla", "Dani"])


def test_new_match_validation() -> None:
    with pytest.raises(ValueError, match="exactly 2"):
        new_beach_match(["Ana"], ["Carla", "Dani"])


def test_duplicate_players_rejected() -> None:
    with pytest.raises(ValueError, match="duplicate"):
        new_beach_match(["Ana", "Ana"], ["Carla", "Dani"])


def test_server_name() -> None:
    assert server_name(match()) == "Ana"


def test_side_switch_every_seven() -> None:
    state = match()
    for _ in range(6):
        state = award_point(state, "A").state
    assert side_switch_due(state) is False
    outcome = award_point(state, "A")
    assert outcome.side_switch_due is True
    assert outcome.state.side_switches == 1


def test_decider_switch_every_five() -> None:
    state = match().model_copy(update={"set_number": 3})
    assert switch_interval(state) == 5
    for _ in range(4):
        state = award_point(state, "A").state
    outcome = award_point(state, "A")
    assert outcome.side_switch_due is True


def test_server_alternates_on_side_out() -> None:
    state = match()
    outcome = award_point(state, "B")
    assert outcome.state.serving == "B"
    assert outcome.state.team_b.server_index == 1
    assert server_name(outcome.state) == "Dani"
    second = award_point(outcome.state, "B")
    assert second.state.team_b.server_index == 1


def test_set_finishes_at_21() -> None:
    state = match().model_copy(update={"team_a": match().team_a.model_copy(update={"points": 20})})
    outcome = award_point(state, "A")
    assert outcome.set_finished is True
    assert outcome.state.set_number == 2
    assert outcome.state.team_a.sets == 1


def test_decider_to_15() -> None:
    state = match().model_copy(
        update={
            "set_number": 3,
            "team_a": match().team_a.model_copy(update={"points": 14, "sets": 1}),
        }
    )
    outcome = award_point(state, "A")
    assert outcome.match_finished is True
    assert outcome.state.winner == "A"


def test_finished_match_rejects_points() -> None:
    state = match().model_copy(update={"status": "finished"})
    with pytest.raises(ValueError, match="not live"):
        award_point(state, "A")


def test_invalid_side_rejected() -> None:
    with pytest.raises(ValueError, match="team must be"):
        award_point(match(), "C")
