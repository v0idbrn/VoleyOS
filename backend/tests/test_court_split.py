from __future__ import annotations

from decimal import Decimal

import pytest

from app.services.court_split import (
    CourtSplitRequest,
    Member,
    split_costs,
)


def _pickup(**overrides: object) -> CourtSplitRequest:
    values: dict[str, object] = {
        "mode": "pickup",
        "court_cost": Decimal("80"),
        "extras_cost": Decimal("10"),
        "third_half_cost": Decimal("10"),
        "attendees": [
            Member(name="Ana"),
            Member(name="Bea"),
            Member(name="Carla"),
        ],
    }
    values.update(overrides)
    return CourtSplitRequest.model_validate(values)


def test_three_way_split_adds_up_to_the_cent() -> None:
    report = split_costs(_pickup())
    assert report.pickup is not None
    shares = [row.share for row in report.pickup.rows]
    assert sum(shares) == Decimal("100.00")
    assert shares == [Decimal("33.34"), Decimal("33.33"), Decimal("33.33")]
    assert report.pickup.total == Decimal("100.00")


def test_half_discount_and_deposit_are_applied() -> None:
    report = split_costs(
        _pickup(
            attendees=[
                Member(name="Ana", deposit=Decimal("20")),
                Member(name="Bea", discount_pct=Decimal("50")),
                Member(name="Carla"),
            ]
        )
    )
    assert report.pickup is not None
    weights = Decimal("1") + Decimal("0.5") + Decimal("1")
    expected_ana = (Decimal("100") * Decimal("1") / weights).quantize(Decimal("0.01"))
    ana = next(row for row in report.pickup.rows if row.name == "Ana")
    bea = next(row for row in report.pickup.rows if row.name == "Bea")
    assert ana.share == expected_ana
    assert ana.deposit == Decimal("20.00")
    assert ana.balance == ana.share - Decimal("20.00")
    assert bea.discount_pct == Decimal("50")
    assert sum(row.share for row in report.pickup.rows) == Decimal("100.00")


def test_whatsapp_summary_has_alias_and_transfers() -> None:
    report = split_costs(
        _pickup(payment_alias="volleyos.mp", payment_holder="Tesoreria Tiburones")
    )
    assert report.pickup is not None
    assert "volleyos.mp" in report.pickup.whatsapp
    assert "Tesoreria Tiburones" in report.pickup.whatsapp
    assert "Pagar" in report.pickup.whatsapp
    assert report.pickup.transfers


def test_overpaid_deposit_becomes_refund() -> None:
    report = split_costs(
        _pickup(attendees=[Member(name="Ana", deposit=Decimal("60")), Member(name="Bea")])
    )
    assert report.pickup is not None
    ana = next(row for row in report.pickup.rows if row.name == "Ana")
    assert ana.balance < 0


def test_empty_pickup_is_rejected() -> None:
    with pytest.raises(ValueError):
        split_costs(_pickup(attendees=[]))


def test_tournament_profit_margin_and_break_even() -> None:
    report = split_costs(
        CourtSplitRequest(
            mode="tournament",
            teams=8,
            team_fee=Decimal("100"),
            court_cost=Decimal("300"),
            referee_cost=Decimal("200"),
            prizes_cost=Decimal("100"),
        )
    )
    assert report.tournament is not None
    assert report.tournament.revenue == Decimal("800.00")
    assert report.tournament.costs == Decimal("600.00")
    assert report.tournament.profit == Decimal("200.00")
    assert report.tournament.margin_pct == Decimal("25.00")
    assert report.tournament.break_even_teams == 6


def test_break_even_rounds_up() -> None:
    report = split_costs(
        CourtSplitRequest(
            mode="tournament",
            teams=2,
            team_fee=Decimal("90"),
            court_cost=Decimal("250"),
        )
    )
    assert report.tournament is not None
    assert report.tournament.break_even_teams == 3
    assert report.tournament.profit < 0


def test_tournament_requires_teams_and_fee() -> None:
    with pytest.raises(ValueError):
        split_costs(CourtSplitRequest(mode="tournament", teams=0, team_fee=Decimal("0")))
