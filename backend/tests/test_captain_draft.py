from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.captain_draft import DraftPlayer, DraftRequest, snake_draft


def pool() -> list[DraftPlayer]:
    roles = ["setter", "outside", "middle", "opposite", "libero"]
    return [
        DraftPlayer(
            name=f"Jugador {index}",
            role=roles[index % len(roles)],
            level=Decimal(5 - (index // 5)),
        )
        for index in range(12)
    ]


def test_two_captain_snake_order() -> None:
    report = snake_draft(DraftRequest(captains=["A", "B"], players=pool()))
    labels = [pick.captain for pick in report.pick_order]
    assert labels[:6] == ["A", "B", "B", "A", "A", "B"]
    assert len(report.pick_order) == 12
    assert all(team.count == 6 for team in report.teams)
    assert report.bench == []


def test_three_captain_snake_order() -> None:
    report = snake_draft(
        DraftRequest(captains=["A", "B", "C"], players=pool())
    )
    labels = [pick.captain for pick in report.pick_order]
    assert labels[:6] == ["A", "B", "C", "C", "B", "A"]


def test_draft_audits_departments_and_strength() -> None:
    report = snake_draft(DraftRequest(captains=["A", "B"], players=pool()))
    assert report.total_level == Decimal("51")
    assert report.best_balance in {"A", "B"}
    assert all(team.average_level >= Decimal("1") for team in report.teams)
    assert {player.role for player in report.teams[0].players} <= {
        "setter",
        "outside",
        "middle",
        "opposite",
        "libero",
    }


def test_draft_assigns_odd_player_and_leaves_empty_bench() -> None:
    report = snake_draft(DraftRequest(captains=["A", "B"], players=pool()[:11]))
    assert len(report.pick_order) == 11
    assert report.bench == []


def test_draft_rejects_duplicate_captains() -> None:
    with pytest.raises(ValidationError):
        DraftRequest(captains=["A", "A"], players=pool())


def test_draft_rejects_single_captain() -> None:
    with pytest.raises(ValidationError):
        DraftRequest(captains=["A"], players=pool())


def test_draft_rejects_bad_level() -> None:
    with pytest.raises(ValidationError):
        DraftPlayer(name="X", role="setter", level=Decimal("6"))

