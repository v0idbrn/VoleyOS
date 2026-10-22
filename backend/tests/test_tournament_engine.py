from decimal import Decimal

import pytest

from app.services.tournament_engine import (
    Fixture,
    MatchResult,
    playoff_bracket,
    ranking_points,
    round_robin,
    schedule,
    standings,
)


@pytest.mark.parametrize(
    ("home", "away", "expected"),
    [
        (3, 0, (3, 0)),
        (3, 1, (3, 0)),
        (3, 2, (2, 1)),
        (2, 3, (1, 2)),
        (1, 3, (0, 3)),
        (0, 3, (0, 3)),
    ],
)
def test_ranking_points(home: int, away: int, expected: tuple[int, int]) -> None:
    assert ranking_points(home, away) == expected


def test_ranking_points_invalid() -> None:
    with pytest.raises(ValueError):
        ranking_points(2, 2)


def test_standings_sorting() -> None:
    matches = [
        MatchResult(home="A", away="B", home_sets=3, away_sets=0),
        MatchResult(home="C", away="D", home_sets=3, away_sets=2),
        MatchResult(home="A", away="C", home_sets=3, away_sets=2),
        MatchResult(home="B", away="D", home_sets=3, away_sets=1),
    ]
    table = standings(["A", "B", "C", "D"], matches)
    assert [row.team for row in table] == ["A", "C", "B", "D"]
    assert table[0].position == 1
    assert table[0].matches_won == 2
    assert table[0].ranking_points == 5


def test_sets_ratio_zero_denominator() -> None:
    table = standings(["A", "B"], [MatchResult(home="A", away="B", home_sets=3, away_sets=0)])
    row_a = next(row for row in table if row.team == "A")
    row_b = next(row for row in table if row.team == "B")
    assert row_a.sets_ratio == Decimal("3.00")
    assert row_b.sets_ratio == Decimal("0")


def test_points_ratio() -> None:
    table = standings(
        ["A", "B"],
        [MatchResult(home="A", away="B", home_sets=3, away_sets=1, home_points=75, away_points=50)],
    )
    row_a = next(row for row in table if row.team == "A")
    assert row_a.points_ratio == Decimal("1.50")


def test_unknown_team_rejected() -> None:
    with pytest.raises(ValueError, match="unknown team"):
        standings(["A"], [MatchResult(home="A", away="X", home_sets=3, away_sets=0)])


def test_duplicate_teams_rejected() -> None:
    with pytest.raises(ValueError, match="duplicate"):
        standings(["A", "A"], [])


def test_round_robin_even() -> None:
    fixtures = round_robin(["A", "B", "C", "D"])
    assert len(fixtures) == 6
    pairs = {tuple(sorted((fixture.home, fixture.away))) for fixture in fixtures}
    assert pairs == {("A", "B"), ("A", "C"), ("A", "D"), ("B", "C"), ("B", "D"), ("C", "D")}
    assert {fixture.round for fixture in fixtures} == {1, 2, 3}


def test_round_robin_odd() -> None:
    assert len(round_robin(["A", "B", "C", "D", "E"])) == 10


def test_round_robin_short_input() -> None:
    with pytest.raises(ValueError):
        round_robin(["A"])


def test_schedule_has_no_collisions() -> None:
    fixtures = round_robin(["A", "B", "C", "D"])
    scheduled = schedule(fixtures, ["Court 1", "Court 2"], start="09:00", slot_minutes=45)
    slots = {(fixture.court, fixture.start) for fixture in scheduled}
    assert len(slots) == len(scheduled)
    assert all(fixture.court and fixture.start for fixture in scheduled)


def test_schedule_requires_court() -> None:
    with pytest.raises(ValueError):
        schedule([Fixture(round=1, home="A", away="B")], [])


def test_playoff_bracket_four() -> None:
    table = standings(
        ["A", "B", "C", "D", "E"],
        [
            MatchResult(home="A", away="B", home_sets=3, away_sets=0),
            MatchResult(home="C", away="D", home_sets=3, away_sets=0),
            MatchResult(home="A", away="C", home_sets=3, away_sets=1),
            MatchResult(home="B", away="E", home_sets=3, away_sets=1),
        ],
    )
    bracket = playoff_bracket(table, qualifiers=4)
    assert bracket["semifinals"][0] == ("A", "E")
    assert bracket["final"][0] == ("Winner SF1", "Winner SF2")


def test_playoff_bracket_eight() -> None:
    table = standings(
        [chr(65 + index) for index in range(8)],
        [
            MatchResult(home=chr(65 + index), away=chr(66 + index), home_sets=3, away_sets=0)
            for index in range(7)
        ],
    )
    bracket = playoff_bracket(table, qualifiers=8)
    assert len(bracket["quarterfinals"]) == 4
    assert len(bracket["semifinals"]) == 2


def test_playoff_invalid_qualifiers() -> None:
    with pytest.raises(ValueError):
        playoff_bracket([], qualifiers=6)
