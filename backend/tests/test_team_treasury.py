from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.team_treasury import TreasuryPlayer, TreasuryRequest, build_treasury


def request() -> TreasuryRequest:
    return TreasuryRequest(
        jersey_cost_total=Decimal("100"),
        monthly_fee_per_player=Decimal("10"),
        months=2,
        ball_fund=Decimal("20"),
        registration_fee=Decimal("0"),
        players=[
            TreasuryPlayer(name="Ana", paid=Decimal("80")),
            TreasuryPlayer(name="Luis", paid=Decimal("40")),
        ],
    )


def test_even_split_debt_and_collection() -> None:
    report = build_treasury(request())
    assert [entry.due for entry in report.per_player] == [Decimal("80.00"), Decimal("80.00")]
    assert [entry.balance for entry in report.per_player] == [
        Decimal("0.00"),
        Decimal("40.00"),
    ]
    assert [entry.status for entry in report.per_player] == [
        "PAID_IN_FULL",
        "PARTIAL_DEBT",
    ]
    assert report.total_due == Decimal("160.00")
    assert report.total_paid == Decimal("120.00")
    assert report.collection_pct == Decimal("75.00")


def test_overpayment_is_credit_favor() -> None:
    report = build_treasury(
        request().model_copy(
            update={
                "players": [
                    TreasuryPlayer(name="Ana", paid=Decimal("100")),
                    TreasuryPlayer(name="Luis", paid=Decimal("80")),
                ]
            }
        )
    )
    assert report.per_player[0].balance == Decimal("-20.00")
    assert report.per_player[0].status == "CREDIT_FAVOR"


def test_rounding_stays_consistent_across_three_players() -> None:
    report = build_treasury(
        request().model_copy(
            update={
                "jersey_cost_total": Decimal("100"),
                "monthly_fee_per_player": Decimal("0"),
                "ball_fund": Decimal("0"),
                "registration_fee": Decimal("0"),
                "players": [
                    TreasuryPlayer(name="Ana", paid=Decimal("0")),
                    TreasuryPlayer(name="Luis", paid=Decimal("0")),
                    TreasuryPlayer(name="Eva", paid=Decimal("0")),
                ],
            }
        )
    )
    assert report.per_player[0].due == Decimal("33.33")
    assert report.total_due == Decimal("99.99")


def test_export_rows_include_header_and_players() -> None:
    report = build_treasury(request())
    assert report.excel_rows[0] == ["Jugador", "Cuota", "Pagado", "Saldo", "Estado"]
    assert len(report.excel_rows) == 3
    assert report.excel_rows[1][0] == "Ana"
    assert "Ana" in report.whatsapp_text


def test_too_few_players_is_rejected() -> None:
    with pytest.raises(ValidationError):
        TreasuryRequest(
            jersey_cost_total=Decimal("100"),
            monthly_fee_per_player=Decimal("10"),
            months=2,
            ball_fund=Decimal("0"),
            registration_fee=Decimal("0"),
            players=[TreasuryPlayer(name="Ana", paid=Decimal("0"))],
        )


def test_negative_amount_and_unknown_field_are_rejected() -> None:
    with pytest.raises(ValidationError):
        TreasuryPlayer(name="Ana", paid=Decimal("-1"))
    with pytest.raises(ValidationError):
        TreasuryRequest(
            jersey_cost_total=Decimal("100"),
            monthly_fee_per_player=Decimal("10"),
            months=2,
            ball_fund=Decimal("0"),
            registration_fee=Decimal("0"),
            players=[
                TreasuryPlayer(name="Ana", paid=Decimal("0")),
                TreasuryPlayer(name="Luis", paid=Decimal("0")),
            ],
            currency="USD",
        )
