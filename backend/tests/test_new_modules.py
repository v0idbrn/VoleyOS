from decimal import Decimal

import pytest

from app.services.block_shadow import BlockShadowRequest, compute_block_shadow
from app.services.capsule_io import CapsuleRequest, export_capsule, import_capsule, run_capsule
from app.services.integrity_seal import build_seal, verify_seal
from app.services.lineup_slip import LineupSlipRequest, build_lineup_slip
from app.services.seam_radar import SeamRadarRequest, compute_seam
from app.services.setter_iq import SetterIQRequest, compute_setter_iq


def test_block_shadow_keeps_every_defender_outside_cone() -> None:
    report = compute_block_shadow(
        BlockShadowRequest(attack_zone="zone_4", blockers=3, scheme="line", block_x=Decimal("1.90"))
    )
    assert len(report.shadow_polygon) == 4
    assert all(defender.inside_shadow is False for defender in report.defenders)
    assert Decimal("0") < report.coverage_pct < Decimal("100")
    assert {defender.role for defender in report.defenders} == {"Z5", "Z6", "Z1", "FREE"}


@pytest.mark.parametrize("blockers", [0, 4])
def test_block_shadow_rejects_invalid_block_count(blockers: int) -> None:
    with pytest.raises(ValueError):
        BlockShadowRequest(blockers=blockers)


def test_seam_radar_assigns_primary_and_seam_owner() -> None:
    report = compute_seam(
        SeamRadarRequest(
            serve_origin="1",
            serve_type="short_drop",
            landing_x=Decimal("4.80"),
            landing_y=Decimal("5.60"),
        )
    )
    assert report.primary_receiver in {row.id for row in report.receivers}
    assert report.seam_owner in {row.id for row in report.receivers}
    assert report.gap_cm > 0
    assert "Drill" in report.drill
    assert report.priority in {"NORMAL", "HIGH", "CRITICAL"}


def test_seam_radar_rejects_landing_outside_court() -> None:
    with pytest.raises(ValueError):
        SeamRadarRequest(landing_x=Decimal("9.10"))


def test_setter_iq_flags_critical_bias() -> None:
    request = SetterIQRequest.model_validate(
        {
            "distributions": [
                {"rotation": 1, "quality": "+", "target": "Z4", "count": 10},
                {"rotation": 2, "quality": "+", "target": "Z4", "count": 4},
                {"rotation": 3, "quality": "+", "target": "Z2-Back", "count": 2},
                {"rotation": 4, "quality": "#", "target": "Z3-Quick", "count": 1},
            ]
        }
    )
    report = compute_setter_iq(request)
    assert report.bias == "Z4"
    assert report.bias_share_pct is not None and report.bias_share_pct > Decimal("65")
    assert Decimal("0") <= report.unpredictability <= Decimal("100")


def test_lineup_slip_pairs_and_libero_window() -> None:
    request = LineupSlipRequest(
        rotation_start=1,
        setter=1,
        opposite=11,
        outside1=4,
        outside2=7,
        middle1=14,
        middle2=18,
        libero=21,
    )
    report = build_lineup_slip(request)
    assert [slot.roman for slot in report.lineup] == ["I", "II", "III", "IV", "V", "VI"]
    assert report.libero_entry.zone in {1, 5, 6}
    assert report.libero_entry.middle_number in {14, 18}
    assert len(report.service_order) == 6


def test_lineup_slip_rejects_duplicate_shirts() -> None:
    with pytest.raises(ValueError):
        LineupSlipRequest(
            rotation_start=1,
            setter=1,
            opposite=1,
            outside1=4,
            outside2=7,
            middle1=14,
            middle2=18,
            libero=21,
        )


def test_integrity_seal_detects_one_point_change() -> None:
    original = {"match": "ARG-BRA", "score": {"home": 25, "away": 23}}
    seal = build_seal(original).seal
    assert verify_seal(original, seal).tampered is False
    tampered = {"match": "ARG-BRA", "score": {"home": 26, "away": 23}}
    report = verify_seal(tampered, seal, original)
    assert report.tampered is True
    assert "score.home" in report.changed_fields


def test_capsule_roundtrip_and_tamper_detection() -> None:
    payload = {"kind": "lineup", "players": [1, 4, 7]}
    exported = export_capsule("Test", payload)
    imported = import_capsule(exported.capsule)
    assert imported.data == payload
    assert imported.checksum == exported.checksum
    tampered = exported.capsule.replace('"players":[1,4,7]', '"players":[1,4,8]')
    with pytest.raises(ValueError):
        import_capsule(tampered)


def test_capsule_import_requires_a_file() -> None:
    with pytest.raises(ValueError):
        run_capsule(CapsuleRequest(action="import"))
