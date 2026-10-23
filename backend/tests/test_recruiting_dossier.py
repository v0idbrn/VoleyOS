from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.recruiting_dossier import RecruitRequest, build_recruiting_dossier


def _request() -> RecruitRequest:
    return RecruitRequest(
        graduation_year=2027,
        position="outside",
        height_cm=Decimal("195"),
        reach_one_hand_cm=Decimal("255"),
        reach_two_hand_cm=Decimal("265"),
        vertical_jump_cm=Decimal("90"),
        attack_reach_cm=Decimal("345"),
        kills=300,
        attack_efficiency_pct=Decimal("48"),
    )


def test_dossier_scores_and_classifies_the_prospect() -> None:
    report = build_recruiting_dossier(_request())
    assert report.score == 63
    assert report.tier == "DIV_II"
    assert len(report.strengths) == 4
    assert report.gaps


def test_seal_is_deterministic_and_has_expected_shape() -> None:
    first = build_recruiting_dossier(_request())
    second = build_recruiting_dossier(_request())
    assert first.seal == second.seal
    assert first.seal.startswith("VOS-SEAL-")
    assert len(first.seal) == 25


def test_different_payload_changes_the_seal() -> None:
    first = build_recruiting_dossier(_request())
    changed = _request().model_copy(update={"kills": 120})
    second = build_recruiting_dossier(changed)
    assert first.seal != second.seal


def test_graduation_year_outside_range_is_rejected() -> None:
    with pytest.raises(ValidationError):
        RecruitRequest(
            graduation_year=2025,
            position="outside",
            height_cm=Decimal("195"),
            reach_one_hand_cm=Decimal("255"),
            reach_two_hand_cm=Decimal("265"),
            vertical_jump_cm=Decimal("90"),
            attack_reach_cm=Decimal("345"),
            kills=300,
            attack_efficiency_pct=Decimal("48"),
        )


def test_height_below_range_is_rejected() -> None:
    with pytest.raises(ValidationError):
        RecruitRequest(
            graduation_year=2027,
            position="middle",
            height_cm=Decimal("149.9"),
            reach_one_hand_cm=Decimal("240"),
            reach_two_hand_cm=Decimal("250"),
            vertical_jump_cm=Decimal("70"),
            attack_reach_cm=Decimal("320"),
            kills=100,
            attack_efficiency_pct=Decimal("35"),
        )


def test_unknown_field_is_rejected() -> None:
    with pytest.raises(ValidationError):
        RecruitRequest(
            graduation_year=2027,
            position="outside",
            height_cm=Decimal("195"),
            reach_one_hand_cm=Decimal("255"),
            reach_two_hand_cm=Decimal("265"),
            vertical_jump_cm=Decimal("90"),
            attack_reach_cm=Decimal("345"),
            kills=300,
            attack_efficiency_pct=Decimal("48"),
            jersey_number=9,
        )
