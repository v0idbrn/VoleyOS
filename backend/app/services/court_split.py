"""Module 21 - court split ("la vaquita") and tournament finances in Decimal."""

from __future__ import annotations

from decimal import ROUND_CEILING, ROUND_HALF_UP, Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CENT = Decimal("0.01")
ZERO = Decimal("0")


class Member(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=80)
    deposit: Decimal = Field(default=ZERO, ge=ZERO)
    discount_pct: Decimal = Field(default=ZERO, ge=ZERO, le=Decimal("100"))


class CourtSplitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    mode: Literal["pickup", "tournament"] = "pickup"
    court_cost: Decimal = Field(default=ZERO, ge=ZERO)
    extras_cost: Decimal = Field(default=ZERO, ge=ZERO)
    third_half_cost: Decimal = Field(default=ZERO, ge=ZERO)
    attendees: list[Member] = Field(default_factory=list)
    payment_alias: str = ""
    payment_holder: str = "Tesoreria"
    currency: str = "ARS"
    teams: int = Field(default=0, ge=0)
    team_fee: Decimal = Field(default=ZERO, ge=ZERO)
    referee_cost: Decimal = Field(default=ZERO, ge=ZERO)
    prizes_cost: Decimal = Field(default=ZERO, ge=ZERO)


class SplitRow(BaseModel):
    name: str
    weight: Decimal
    discount_pct: Decimal
    share: Decimal
    deposit: Decimal
    balance: Decimal
    status: str


class Transfer(BaseModel):
    payer: str
    payee: str
    amount: Decimal
    concept: str


class PickupReport(BaseModel):
    total: Decimal
    rows: list[SplitRow]
    transfers: list[Transfer]
    whatsapp: str
    currency: str


class TournamentReport(BaseModel):
    teams: int
    team_fee: Decimal
    revenue: Decimal
    costs: Decimal
    profit: Decimal
    margin_pct: Decimal
    break_even_teams: int
    currency: str


class SplitReport(BaseModel):
    mode: str
    pickup: PickupReport | None
    tournament: TournamentReport | None
    message: str


def _money(value: Decimal) -> Decimal:
    return value.quantize(CENT, rounding=ROUND_HALF_UP)


def _pickup(request: CourtSplitRequest) -> PickupReport:
    if not request.attendees:
        raise ValueError("at least one attendee is required")
    total = _money(request.court_cost + request.extras_cost + request.third_half_cost)
    weights = [
        Decimal("1") - attendee.discount_pct / Decimal("100")
        for attendee in request.attendees
    ]
    weight_sum = sum(weights, ZERO)
    if weight_sum <= ZERO:
        raise ValueError("discounts leave no payable share")

    shares = [_money(total * weight / weight_sum) for weight in weights]
    adjustment = total - sum(shares, ZERO)
    shares[0] = _money(shares[0] + adjustment)

    rows: list[SplitRow] = []
    transfers: list[Transfer] = []
    for attendee, weight, share in zip(request.attendees, weights, shares, strict=True):
        deposit = _money(attendee.deposit)
        balance = _money(share - deposit)
        if balance > ZERO:
            status = "pay"
            transfers.append(
                Transfer(
                    payer=attendee.name,
                    payee=request.payment_holder,
                    amount=balance,
                    concept="cuota de cancha",
                )
            )
        elif balance < ZERO:
            status = "refund"
            transfers.append(
                Transfer(
                    payer=request.payment_holder,
                    payee=attendee.name,
                    amount=_money(-balance),
                    concept="devolucion de sena",
                )
            )
        else:
            status = "settled"
        rows.append(
            SplitRow(
                name=attendee.name,
                weight=weight,
                discount_pct=attendee.discount_pct,
                share=share,
                deposit=deposit,
                balance=balance,
                status=status,
            )
        )

    lines = [
        "🏐 *La Vaquita - VolleyOS*",
        f"Cancha + luz + tercer tiempo: *{request.currency} {total}*",
        f"Entre {len(rows)} personas.",
        "",
        "💸 *Pagar por transferencia*",
    ]
    for transfer in transfers:
        arrow = "->"
        lines.append(
            f"• {transfer.payer} {arrow} {transfer.payee}: "
            f"{request.currency} {transfer.amount} ({transfer.concept})"
        )
    if request.payment_alias:
        lines.append("")
        lines.append(f"🏦 Alias/CVU: *{request.payment_alias}*")
        lines.append(f"Titular: {request.payment_holder}")
    lines.append("")
    lines.append("Sello VolleyOS: cuentas exactas al centavo, sin telemetria.")
    return PickupReport(
        total=total,
        rows=rows,
        transfers=transfers,
        whatsapp="\n".join(lines),
        currency=request.currency,
    )


def _tournament(request: CourtSplitRequest) -> TournamentReport:
    if request.teams <= 0:
        raise ValueError("teams must be greater than zero")
    if request.team_fee <= ZERO:
        raise ValueError("team_fee must be greater than zero")
    revenue = _money(Decimal(request.teams) * request.team_fee)
    costs = _money(request.court_cost + request.referee_cost + request.prizes_cost)
    profit = _money(revenue - costs)
    margin = _money((profit / revenue) * Decimal("100")) if revenue > ZERO else ZERO
    break_even = int((costs / request.team_fee).to_integral_value(rounding=ROUND_CEILING))
    return TournamentReport(
        teams=request.teams,
        team_fee=request.team_fee,
        revenue=revenue,
        costs=costs,
        profit=profit,
        margin_pct=margin,
        break_even_teams=break_even,
        currency=request.currency,
    )


def split_costs(request: CourtSplitRequest) -> SplitReport:
    if request.mode == "pickup":
        pickup = _pickup(request)
        return SplitReport(
            mode="pickup",
            pickup=pickup,
            tournament=None,
            message=(
                f"Vaquita de {pickup.currency} {pickup.total} repartida al centavo "
                f"entre {len(pickup.rows)} asistentes."
            ),
        )
    tournament = _tournament(request)
    signal = "ganancia" if tournament.profit >= ZERO else "perdida"
    return SplitReport(
        mode="tournament",
        pickup=None,
        tournament=tournament,
        message=(
            f"Torneo con {signal} neta de {tournament.currency} {tournament.profit}; "
            f"break-even en {tournament.break_even_teams} equipos."
        ),
    )
