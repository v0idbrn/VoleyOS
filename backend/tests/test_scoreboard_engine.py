import pytest

from app.services.scoreboard_engine import (
    Player,
    RosterEntry,
    award_point,
    call_timeout,
    create_team,
    libero_issues,
    new_match,
    place_libero,
    roster_lineup,
    rotate_lineup,
    server_number,
    substitute,
)


def team(prefix: int = 0) -> list[Player]:
    return [Player(number=prefix + index) for index in range(1, 7)]


def match() -> object:
    return new_match(team(0), team(10), best_of=3)


def test_initial_server() -> None:
    state = match()
    assert server_number(state) == 1
    assert state.serving == "A"


def test_side_out_rotates_clock() -> None:
    state = match()
    result = award_point(state, "B")
    assert result.rotated is True
    assert result.state.serving == "B"
    assert result.state.lineup_b[1] == 12
    assert result.state.lineup_b[6] == 11
    assert result.state.score_b == 1


def test_break_point_keeps_positions() -> None:
    state = match()
    result = award_point(state, "A")
    assert result.rotated is False
    assert result.state.lineup_a[1] == 1
    assert result.state.streak == 2


def test_set_finishes_at_25_with_two_point_gap() -> None:
    state = match().model_copy(update={"score_a": 24, "score_b": 23})
    result = award_point(state, "A")
    assert result.set_finished is True
    assert result.state.sets_a == 1
    assert result.state.set_number == 2
    assert result.state.score_a == 0
    assert result.state.serving == "B"


def test_no_set_win_at_25_24() -> None:
    state = match().model_copy(update={"score_a": 24, "score_b": 24})
    result = award_point(state, "A")
    assert result.set_finished is False
    assert result.state.score_a == 25


def test_decider_uses_15_points() -> None:
    state = match().model_copy(
        update={"set_number": 3, "sets_a": 1, "sets_b": 1, "score_a": 14, "score_b": 10}
    )
    result = award_point(state, "A")
    assert result.set_finished is True
    assert result.match_finished is True
    assert result.state.winner == "A"


def test_decider_court_switch_at_8() -> None:
    state = match().model_copy(update={"set_number": 3, "score_a": 7, "score_b": 0})
    result = award_point(state, "A")
    assert result.side_switch_due is True
    assert result.state.set_number == 3


def test_best_of_five_requires_three_sets() -> None:
    state = new_match(team(0), team(10), best_of=5).model_copy(
        update={"sets_a": 2, "sets_b": 2, "set_number": 5, "score_a": 14}
    )
    result = award_point(state, "A")
    assert result.match_finished is True
    assert result.state.winner == "A"


def test_timeout_limit() -> None:
    state = match()
    state = call_timeout(state, "A").state
    state = call_timeout(state, "A").state
    assert state.timeouts_a == 2
    with pytest.raises(ValueError, match="both timeouts"):
        call_timeout(state, "A")


def test_substitution_replaces_player() -> None:
    state = match()
    result = substitute(state, "A", out_number=1, in_number=99)
    assert result.state.lineup_a[1] == 99
    assert result.state.subs_a == 1


def test_substitution_limit() -> None:
    state = match().model_copy(update={"subs_a": 6})
    with pytest.raises(ValueError, match="6 substitutions"):
        substitute(state, "A", out_number=1, in_number=99)


def test_substitution_rejects_duplicate() -> None:
    with pytest.raises(ValueError, match="already on court"):
        substitute(match(), "A", out_number=1, in_number=2)


def test_unknown_player_substitution() -> None:
    with pytest.raises(ValueError, match="not on court"):
        substitute(match(), "A", out_number=42, in_number=99)


def test_libero_front_row_issue() -> None:
    state = match()
    lineup = dict(state.lineup_a)
    lineup[4] = 7
    issues = libero_issues(lineup, 7)
    assert any("delantera" in issue for issue in issues)


def test_libero_cannot_serve() -> None:
    state = match()
    lineup = dict(state.lineup_a)
    lineup[1] = 7
    assert any("sacar" in issue for issue in libero_issues(lineup, 7))


def test_place_libero_front_zone_rejected() -> None:
    with pytest.raises(ValueError, match="Z1, Z5 or Z6"):
        place_libero(match(), "A", zone=4, libero=7)


def test_place_libero_back_zone() -> None:
    result = place_libero(match(), "A", zone=6, libero=7)
    assert result.state.lineup_a[6] == 7
    assert result.state.libero_a == 7


def test_rotate_lineup_mapping() -> None:
    assert rotate_lineup({1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6}) == {
        1: 2,
        2: 3,
        3: 4,
        4: 5,
        5: 6,
        6: 1,
    }


def test_finished_match_rejects_points() -> None:
    state = match().model_copy(update={"status": "finished"})
    with pytest.raises(ValueError, match="not live"):
        award_point(state, "A")


def test_invalid_team_rejected() -> None:
    with pytest.raises(ValueError, match="team must be"):
        award_point(match(), "C")


def test_team_size_validated() -> None:
    with pytest.raises(ValueError, match="exactly 6"):
        new_match([Player(number=1)], team(10))


def roster() -> list[RosterEntry]:
    return [
        RosterEntry(number=1, name="Sofia", role="S", captain=True),
        RosterEntry(number=4, name="Valentina", role="OH"),
        RosterEntry(number=7, name="Martina", role="L"),
        RosterEntry(number=9, name="Renata", role="MB"),
        RosterEntry(number=11, name="Carla", role="OPP"),
        RosterEntry(number=14, name="Julieta", role="MB"),
        RosterEntry(number=21, name="Micaela", role="OH"),
        RosterEntry(number=22, name="Lucia", role="OH"),
    ]


def test_create_team_assigns_starting_six_and_libero() -> None:
    team = create_team("tib", "Tiburones", "tib", roster())
    assert team.starters == [1, 4, 9, 11, 14, 21]
    assert team.libero == 7
    assert team.bench == [22]
    assert roster_lineup(team)[1] == 1


def test_create_team_rejects_duplicate_jerseys() -> None:
    players = roster()
    players[6] = RosterEntry(number=1, name="Micaela", role="OH")
    with pytest.raises(ValueError, match="duplicate"):
        create_team("tib", "Tiburones", "TIB", players)


def test_create_team_requires_one_captain() -> None:
    players = roster()
    players[0].captain = False
    with pytest.raises(ValueError, match="one captain"):
        create_team("tib", "Tiburones", "TIB", players)


def test_create_team_rejects_libero_captain() -> None:
    players = roster()
    players[0].captain = False
    players[2].captain = True
    with pytest.raises(ValueError, match="cannot be the libero"):
        create_team("tib", "Tiburones", "TIB", players)