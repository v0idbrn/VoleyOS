from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.equipment_inspector import EquipmentRequest, inspect_equipment


def test_indoor_net_and_ball_are_optimal() -> None:
    report = inspect_equipment(
        EquipmentRequest(
            category="men_indoor",
            center_height_cm=Decimal("243"),
            side_a_height_cm=Decimal("243"),
            side_b_height_cm=Decimal("242"),
            ball_pressure_kgf_cm2=Decimal("0.310"),
            surface="indoor",
        )
    )
    assert report.net.expected_cm == Decimal("243")
    assert report.net.ok is True
    assert report.ball.status == "Óptima FIVB"
    assert report.ball.pressure_psi == Decimal("4.41")
    assert report.ball.pressure_kpa == Decimal("30.40")
    assert report.stack.balls_stacked == Decimal("11.57")
    assert report.status == "OK"


def test_net_side_deviation_over_two_centimetres_fails() -> None:
    report = inspect_equipment(
        EquipmentRequest(
            category="women_indoor",
            center_height_cm=Decimal("224"),
            side_a_height_cm=Decimal("224"),
            side_b_height_cm=Decimal("227"),
            ball_pressure_kgf_cm2=Decimal("0.310"),
        )
    )
    assert report.net.ok is False
    assert report.net.max_deviation_cm == Decimal("3")
    assert report.status == "NET_OUT_OF_TOLERANCE"


def test_beach_ball_uses_lower_pressure_range() -> None:
    report = inspect_equipment(
        EquipmentRequest(
            category="mixed_recreational",
            center_height_cm=Decimal("235"),
            side_a_height_cm=Decimal("235"),
            side_b_height_cm=Decimal("235"),
            ball_pressure_kgf_cm2=Decimal("0.200"),
            surface="beach",
        )
    )
    assert report.ball.min_kgf_cm2 == Decimal("0.175")
    assert report.ball.max_kgf_cm2 == Decimal("0.225")
    assert report.ball.status == "Óptima FIVB"


def test_ball_pressure_statuses() -> None:
    hard = inspect_equipment(
        EquipmentRequest(
            category="u18_girls",
            center_height_cm=Decimal("218"),
            side_a_height_cm=Decimal("218"),
            side_b_height_cm=Decimal("218"),
            ball_pressure_kgf_cm2=Decimal("0.350"),
        )
    )
    soft = inspect_equipment(
        EquipmentRequest(
            category="u18_girls",
            center_height_cm=Decimal("218"),
            side_a_height_cm=Decimal("218"),
            side_b_height_cm=Decimal("218"),
            ball_pressure_kgf_cm2=Decimal("0.100"),
        )
    )
    assert hard.ball.status == "Demasiado dura (rebote descontrolado)"
    assert soft.ball.status == "Desinflada"


def test_equipment_rejects_zero_height() -> None:
    with pytest.raises(ValidationError):
        EquipmentRequest(
            category="men_indoor",
            center_height_cm=Decimal("0"),
            side_a_height_cm=Decimal("243"),
            side_b_height_cm=Decimal("243"),
            ball_pressure_kgf_cm2=Decimal("0.310"),
        )
