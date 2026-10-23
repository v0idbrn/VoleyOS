"""Module 38 - team treasury split with per-player balances and export rows."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CENT = Decimal("0.01")
HUNDRED = Decimal("100")
ZERO = Decimal("0.00")


class TreasuryPlayer(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=40)
    paid: Decimal = Field(ge=Decimal("0"))


class TreasuryRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    jersey_cost_total: Decimal = Field(ge=Decimal("0"))
    monthly_fee_per_player: Decimal = Field(ge=Decimal("0"))
    months: int = Field(ge=1, le=12)
    ball_fund: Decimal = Field(ge=Decimal("0"))
    registration_fee: Decimal = Field(ge=Decimal("0"))
    players: list[TreasuryPlayer] = Field(min_length=2, max_length=30)


class PlayerBalance(BaseModel):
    name: str
    due: Decimal
    paid: Decimal
    balance: Decimal
    status: Literal["PAID_IN_FULL", "PARTIAL_DEBT", "CREDIT_FAVOR"]


class TreasuryReport(BaseModel):
    per_player: list[PlayerBalance]
    total_due: Decimal
    total_paid: Decimal
    collection_pct: Decimal
    whatsapp_text: str
    excel_rows: list[list[str]]
    message: str


def _q2(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _status(balance: Decimal) -> Literal["PAID_IN_FULL", "PARTIAL_DEBT", "CREDIT_FAVOR"]:
    if balance == 0:
        return "PAID_IN_FULL"
    if balance > 0:
        return "PARTIAL_DEBT"
    return "CREDIT_FAVOR"


def build_treasury(request: TreasuryRequest) -> TreasuryReport:
    count = Decimal(len(request.players))
    jersey_share = request.jersey_cost_total / count
    fixed_share = (request.ball_fund + request.registration_fee) / count
    monthly_total = request.monthly_fee_per_player * Decimal(request.months)
    due = _q2(jersey_share + monthly_total + fixed_share)

    balances: list[PlayerBalance] = []
    for player in request.players:
        paid = _q2(player.paid)
        balance = _q2(due - paid)
        balances.append(
            PlayerBalance(
                name=player.name,
                due=due,
                paid=paid,
                balance=balance,
                status=_status(balance),
            )
        )

    total_due = _q2(sum((entry.due for entry in balances), ZERO))
    total_paid = _q2(sum((entry.paid for entry in balances), ZERO))
    collection_pct = (
        _q2(total_paid / total_due * HUNDRED) if total_due > 0 else ZERO
    )

    whatsapp_text = "\n".join(
        [
            "TESORERIA VOLLEYOS",
            *(f"{entry.name}: cuota {entry.due} / pagado {entry.paid} / saldo {entry.balance}"
              for entry in balances),
            f"Recaudacion: {collection_pct}%",
        ]
    )
    excel_rows: list[list[str]] = [["Jugador", "Cuota", "Pagado", "Saldo", "Estado"]]
    excel_rows.extend(
        [entry.name, str(entry.due), str(entry.paid), str(entry.balance), entry.status]
        for entry in balances
    )
    return TreasuryReport(
        per_player=balances,
        total_due=total_due,
        total_paid=total_paid,
        collection_pct=collection_pct,
        whatsapp_text=whatsapp_text,
        excel_rows=excel_rows,
        message=(
            f"Tesoro del equipo: {total_paid} de {total_due} recaudado "
            f"({collection_pct}%)."
        ),
    )
