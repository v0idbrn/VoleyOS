from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.blockout_lab import BlockoutRequest, evaluate_blockout


def request(**overrides: object) -> BlockoutRequest:
    base: dict[str, object] = {
        "zone": "zone_4",
        "set_distance": "normal_1_0m",
        "block_closure": "seam_open",
        "attacker_reach_cm": Decimal("340"),
        "block_reach_cm": Decimal("320"),
    }
    base.update(overrides)
    return BlockoutRequest(**base)


def test_open_seam_recommends_seam_split() -> None:
    report = evaluate_blockout(request())
    assert report.recommended == "SEAM_SPLIT"
    assert report.wrist_angle_deg == Decimal("10.0")
    assert len(report.options) == 4


def test_tight_double_block_recommends_soft_recycle() -> None:
    report = evaluate_blockout(
        request(set_distance="tight_0_3m", block_closure="double_closed")
    )
    assert report.recommended == "SOFT_RECYCLE_OFF_HANDS"


def test_probabilities_stay_bounded() -> None:
    report = evaluate_blockout(
        request(attacker_reach_cm=Decimal("380"), block_reach_cm=Decimal("250"))
    )
    assert all(Decimal("5") <= option.probability_pct <= Decimal("95") for option in report.options)
    assert all(option.ev >= Decimal("0") for option in report.options)


def test_reach_advantage_raises_wipe_probability() -> None:
    low = evaluate_blockout(request(attacker_reach_cm=Decimal("300")))
    high = evaluate_blockout(request(attacker_reach_cm=Decimal("370")))
    low_wipe = next(
        option for option in low.options if option.decision == "HIGH_OUTSIDE_HAND_WIPE"
    )
    high_wipe = next(
        option for option in high.options if option.decision == "HIGH_OUTSIDE_HAND_WIPE"
    )
    assert high_wipe.probability_pct > low_wipe.probability_pct


def test_invalid_zone_is_rejected() -> None:
    with pytest.raises(ValidationError):
        request(zone="zone_6")
