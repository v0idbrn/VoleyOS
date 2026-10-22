"""Module 33 - block-out decision lab with expected value."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DECISION = Literal[
    "HIGH_OUTSIDE_HAND_WIPE",
    "SEAM_SPLIT",
    "SOFT_RECYCLE_OFF_HANDS",
    "CROSS_COURT_ROLL_SHOT",
]
ZONE = Literal["zone_4", "zone_2"]
SET_DISTANCE = Literal["tight_0_3m", "normal_1_0m", "off_net_2_5m"]
BLOCK_CLOSURE = Literal["double_closed", "seam_open", "late_outside_hand"]
DECISIONS: tuple[DECISION, ...] = (
    "HIGH_OUTSIDE_HAND_WIPE",
    "SEAM_SPLIT",
    "SOFT_RECYCLE_OFF_HANDS",
    "CROSS_COURT_ROLL_SHOT",
)

BASE: dict[str, Decimal] = {
    "HIGH_OUTSIDE_HAND_WIPE": Decimal("52"),
    "SEAM_SPLIT": Decimal("45"),
    "SOFT_RECYCLE_OFF_HANDS": Decimal("62"),
    "CROSS_COURT_ROLL_SHOT": Decimal("48"),
}
VALUE: dict[str, Decimal] = {
    "HIGH_OUTSIDE_HAND_WIPE": Decimal("1.00"),
    "SEAM_SPLIT": Decimal("1.15"),
    "SOFT_RECYCLE_OFF_HANDS": Decimal("0.95"),
    "CROSS_COURT_ROLL_SHOT": Decimal("0.90"),
}
ZONE_ADJUST: dict[str, dict[str, Decimal]] = {
    "zone_4": {
        "HIGH_OUTSIDE_HAND_WIPE": Decimal("8"),
        "SEAM_SPLIT": Decimal("-4"),
        "SOFT_RECYCLE_OFF_HANDS": Decimal("2"),
        "CROSS_COURT_ROLL_SHOT": Decimal("4"),
    },
    "zone_2": {
        "HIGH_OUTSIDE_HAND_WIPE": Decimal("-6"),
        "SEAM_SPLIT": Decimal("6"),
        "SOFT_RECYCLE_OFF_HANDS": Decimal("0"),
        "CROSS_COURT_ROLL_SHOT": Decimal("-2"),
    },
}
DISTANCE_ADJUST: dict[str, dict[str, Decimal]] = {
    "tight_0_3m": {
        "HIGH_OUTSIDE_HAND_WIPE": Decimal("-8"),
        "SEAM_SPLIT": Decimal("-10"),
        "SOFT_RECYCLE_OFF_HANDS": Decimal("12"),
        "CROSS_COURT_ROLL_SHOT": Decimal("-6"),
    },
    "normal_1_0m": {
        "HIGH_OUTSIDE_HAND_WIPE": Decimal("2"),
        "SEAM_SPLIT": Decimal("2"),
        "SOFT_RECYCLE_OFF_HANDS": Decimal("2"),
        "CROSS_COURT_ROLL_SHOT": Decimal("2"),
    },
    "off_net_2_5m": {
        "HIGH_OUTSIDE_HAND_WIPE": Decimal("6"),
        "SEAM_SPLIT": Decimal("8"),
        "SOFT_RECYCLE_OFF_HANDS": Decimal("-8"),
        "CROSS_COURT_ROLL_SHOT": Decimal("10"),
    },
}
CLOSURE_ADJUST: dict[str, dict[str, Decimal]] = {
    "double_closed": {
        "HIGH_OUTSIDE_HAND_WIPE": Decimal("12"),
        "SEAM_SPLIT": Decimal("-18"),
        "SOFT_RECYCLE_OFF_HANDS": Decimal("8"),
        "CROSS_COURT_ROLL_SHOT": Decimal("-10"),
    },
    "seam_open": {
        "HIGH_OUTSIDE_HAND_WIPE": Decimal("-6"),
        "SEAM_SPLIT": Decimal("20"),
        "SOFT_RECYCLE_OFF_HANDS": Decimal("4"),
        "CROSS_COURT_ROLL_SHOT": Decimal("6"),
    },
    "late_outside_hand": {
        "HIGH_OUTSIDE_HAND_WIPE": Decimal("16"),
        "SEAM_SPLIT": Decimal("4"),
        "SOFT_RECYCLE_OFF_HANDS": Decimal("-4"),
        "CROSS_COURT_ROLL_SHOT": Decimal("-8"),
    },
}
WRIST: dict[str, Decimal] = {
    "HIGH_OUTSIDE_HAND_WIPE": Decimal("35.0"),
    "SEAM_SPLIT": Decimal("10.0"),
    "SOFT_RECYCLE_OFF_HANDS": Decimal("-20.0"),
    "CROSS_COURT_ROLL_SHOT": Decimal("-35.0"),
}


class BlockoutRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    zone: ZONE
    set_distance: SET_DISTANCE
    block_closure: BLOCK_CLOSURE
    attacker_reach_cm: Decimal = Field(ge=Decimal("200"), le=Decimal("400"))
    block_reach_cm: Decimal = Field(ge=Decimal("200"), le=Decimal("400"))


class BlockoutOption(BaseModel):
    decision: DECISION
    probability_pct: Decimal
    ev: Decimal
    note: str


class BlockoutReport(BaseModel):
    zone: str
    set_distance: str
    block_closure: str
    options: list[BlockoutOption]
    recommended: DECISION
    wrist_angle_deg: Decimal
    message: str


def _q1(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.1"), rounding=ROUND_HALF_UP)


def _q3(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.001"), rounding=ROUND_HALF_UP)


def _probability(
    decision: DECISION,
    request: BlockoutRequest,
    reach_delta: Decimal,
) -> Decimal:
    value = (
        BASE[decision]
        + ZONE_ADJUST[request.zone][decision]
        + DISTANCE_ADJUST[request.set_distance][decision]
        + CLOSURE_ADJUST[request.block_closure][decision]
    )
    if decision in {"HIGH_OUTSIDE_HAND_WIPE", "SEAM_SPLIT"}:
        value += reach_delta
    elif decision == "CROSS_COURT_ROLL_SHOT":
        value += reach_delta / 4
    else:
        value -= reach_delta / 2
    return max(Decimal("5"), min(Decimal("95"), value))


def evaluate_blockout(request: BlockoutRequest) -> BlockoutReport:
    reach_delta = (request.attacker_reach_cm - request.block_reach_cm) / 10
    options: list[BlockoutOption] = []
    for decision in DECISIONS:
        probability = _probability(decision, request, reach_delta)
        ev = probability / Decimal("100") * VALUE[decision]
        options.append(
            BlockoutOption(
                decision=decision,
                probability_pct=_q1(probability),
                ev=_q3(ev),
                note=(
                    f"{_q1(probability)}% de exito con valor esperado "
                    f"{_q3(ev)}."
                ),
            )
        )
    recommended = max(options, key=lambda option: option.ev)
    angle = WRIST[recommended.decision]
    if request.zone == "zone_2":
        angle = -angle
    if request.set_distance == "tight_0_3m":
        angle += Decimal("5.0")
    elif request.set_distance == "off_net_2_5m":
        angle -= Decimal("5.0")
    return BlockoutReport(
        zone=request.zone,
        set_distance=request.set_distance,
        block_closure=request.block_closure,
        options=options,
        recommended=recommended.decision,
        wrist_angle_deg=_q1(angle),
        message=(
            f"Decision recomendada: {recommended.decision} con EV "
            f"{recommended.ev}; muneca a {_q1(angle)} grados."
        ),
    )
