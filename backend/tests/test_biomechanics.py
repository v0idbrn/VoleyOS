from decimal import Decimal

import pytest

from app.services.biomechanics import (
    Point,
    PoseFrame,
    PoseSequence,
    analyze_sequence,
    vertical_jump_cm,
)


def pt(x: str, y: str) -> Point:
    return Point(x=Decimal(x), y=Decimal(y))


def joints(
    knee_x: str = "30",
    impact_wrist: tuple[str, str] = ("60", "90"),
    hand: tuple[str, str] = ("20", "190"),
) -> dict[str, Point]:
    return {
        "hip": pt("0", "100"),
        "knee": pt(knee_x, "50"),
        "ankle": pt("0", "0"),
        "other_hip": pt("0", "100"),
        "other_knee": pt("-30", "50"),
        "other_ankle": pt("0", "0"),
        "shoulder": pt("0", "150"),
        "elbow": pt("30", "120"),
        "wrist": pt(*impact_wrist),
        "head": pt("0", "150"),
        "hand": pt(*hand),
    }


def frames(**overrides: dict[str, Point]) -> list[PoseFrame]:
    phases = ["penultimate_step", "arm_draw", "impact", "window", "landing"]
    result = []
    for index, phase in enumerate(phases):
        result.append(
            PoseFrame(phase=phase, t_ms=index * 100, joints=overrides.get(phase, joints()))
        )
    return result


def optimal_sequence() -> PoseSequence:
    draw = joints(impact_wrist=("60", "150"))
    return PoseSequence(
        frames=frames(arm_draw=draw),
        takeoff_ms=0,
        landing_ms=500,
    )


def test_vertical_jump_formula() -> None:
    assert vertical_jump_cm(0, 500) == Decimal("30.66")
    assert vertical_jump_cm(0, 800) == Decimal("78.48")


def test_vertical_jump_rejects_inverted_flight() -> None:
    with pytest.raises(ValueError):
        vertical_jump_cm(500, 500)


def test_optimal_sequence_scores_100() -> None:
    report = analyze_sequence(optimal_sequence())
    assert report.score == 100
    assert [item.status for item in report.frames] == [
        "OPTIMAL",
        "OPTIMAL",
        "OPTIMAL",
        "OPTICAL_WINDOW_11_OCLOCK",
        "OPTIMAL",
    ]
    assert report.jump_height_cm == Decimal("30.66")
    assert report.landing_symmetric is True
    assert report.priority_frame == 0
    assert len(report.drills) == 1


def test_trex_arm_detected() -> None:
    impact = joints(impact_wrist=("35", "70"))
    report = analyze_sequence(
        PoseSequence(frames=frames(impact=impact), takeoff_ms=0, landing_ms=500)
    )
    frame3 = report.frames[2]
    assert frame3.status == "T_REX_ARM"
    assert frame3.metric_deg is not None and frame3.metric_deg < 155
    assert any("Wall spike" in drill for drill in report.drills)


def test_late_window_detected() -> None:
    sequence = PoseSequence(
        frames=frames(window=joints(hand=("-10", "190"))), takeoff_ms=0, landing_ms=500
    )
    report = analyze_sequence(sequence)
    assert report.frames[3].status == "LATE_WINDOW_12_OCLOCK"


def test_transition_window() -> None:
    sequence = PoseSequence(
        frames=frames(window=joints(hand=("10", "190"))), takeoff_ms=0, landing_ms=500
    )
    report = analyze_sequence(sequence)
    assert report.frames[3].status == "TRANSITION_WINDOW"


def test_deep_knee_flagged() -> None:
    brake = joints(knee_x="40")
    sequence = PoseSequence(frames=frames(penultimate_step=brake), takeoff_ms=0, landing_ms=500)
    report = analyze_sequence(sequence)
    assert report.frames[0].status == "TOO_DEEP"
    assert report.priority_frame == 1


def test_straight_knee_flagged() -> None:
    brake = {
        **joints(),
        "knee": pt("0", "50"),
    }
    sequence = PoseSequence(frames=frames(penultimate_step=brake), takeoff_ms=0, landing_ms=500)
    report = analyze_sequence(sequence)
    assert report.frames[0].status == "TOO_STRAIGHT"


def test_missing_joint_raises() -> None:
    broken = joints()
    del broken["knee"]
    with pytest.raises(ValueError, match="missing joint"):
        analyze_sequence(PoseSequence(frames=frames(penultimate_step=broken)))


def test_missing_phase_falls_back_to_order() -> None:
    custom = [joints(), joints(impact_wrist=("60", "150")), joints(), joints(), joints()]
    sequence = PoseSequence(
        frames=[
            PoseFrame(phase=f"custom_{index}", t_ms=index, joints=custom[index])
            for index in range(5)
        ],
        takeoff_ms=0,
        landing_ms=500,
    )
    assert analyze_sequence(sequence).score == 100


def test_requires_five_frames() -> None:
    sequence = PoseSequence(frames=frames()[:2], takeoff_ms=0, landing_ms=500)
    with pytest.raises(ValueError, match="needs a"):
        analyze_sequence(sequence)
