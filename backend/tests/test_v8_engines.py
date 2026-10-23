from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.services.playbook_animator import PlaybookPhase, PlaybookRequest, PlayerPosition
from app.services.playbook_animator import analyze as animate
from app.services.shot_heatmap import Shot, ShotRequest
from app.services.shot_heatmap import analyze as heat
from app.services.video_telestrator import Point, Stroke, TelestrationRequest
from app.services.video_telestrator import analyze as telestrate


def test_telestrator_measures_strokes_and_jump() -> None:
    report = telestrate(
        TelestrationRequest(
            frame_width=Decimal(100),
            frame_height=Decimal(100),
            scale_cm_per_px=Decimal(1),
            strokes=[
                Stroke(
                    points=[
                        Point(x=Decimal(10), y=Decimal(10)),
                        Point(x=Decimal(20), y=Decimal(10)),
                    ]
                )
            ],
            takeoff=Point(x=Decimal(50), y=Decimal(80)),
            apex=Point(x=Decimal(50), y=Decimal(40)),
        )
    )
    assert report.stroke_count == 1
    assert report.total_length_px == Decimal("10.00")
    assert report.metrics[0].angle_deg == Decimal("0.00")
    assert report.jump_height_cm == Decimal("40.00")


def test_telestrator_rejects_points_outside_frame() -> None:
    with pytest.raises(ValueError, match="outside"):
        telestrate(
            TelestrationRequest(
                frame_width=Decimal(100),
                frame_height=Decimal(100),
                strokes=[
                    Stroke(
                        points=[
                            Point(x=Decimal(10), y=Decimal(10)),
                            Point(x=Decimal(200), y=Decimal(10)),
                        ]
                    )
                ],
            )
        )


def test_playbook_requires_three_ordered_phases() -> None:
    phase = PlaybookPhase(
        phase="serve",
        duration_ms=1000,
        target_zone=1,
        players=[PlayerPosition(number=7, x=Decimal(50), y=Decimal(90))],
    )
    with pytest.raises(ValueError, match="serve, transition and attack"):
        animate(PlaybookRequest(phases=[phase, phase, phase]))


def test_playbook_builds_timeline_and_vectors() -> None:
    def phase(name: str, duration: int, x: str) -> PlaybookPhase:
        return PlaybookPhase(
            phase=name,
            duration_ms=duration,
            target_zone=5,
            players=[PlayerPosition(number=7, x=Decimal(x), y=Decimal(50))],
        )

    report = animate(
        PlaybookRequest(
            phases=[
                phase("serve", 1000, "50"),
                phase("transition", 2000, "60"),
                phase("attack", 1500, "70"),
            ]
        )
    )
    assert report.total_duration_ms == 4500
    assert report.phases[1].start_ms == 1000
    assert report.phases[2].vectors[0].dx == Decimal("10.00")
    assert report.phases[2].end_ms == 4500


def test_heatmap_groups_into_nine_zones() -> None:
    report = heat(
        ShotRequest(
            shots=[
                Shot(x=Decimal(10), y=Decimal(10), result="kill"),
                Shot(x=Decimal(50), y=Decimal(50), result="error"),
                Shot(x=Decimal(90), y=Decimal(90), result="blocked"),
            ]
        )
    )
    assert len(report.cells) == 9
    assert report.cells[0].count == 1
    assert report.cells[8].zone == 9
    assert report.hot_zone == 1
    assert report.efficiency_pct == Decimal("-33.33")


def test_shot_outside_court_rejected() -> None:
    with pytest.raises(ValidationError):
        Shot(x=Decimal(101), y=Decimal(50))
