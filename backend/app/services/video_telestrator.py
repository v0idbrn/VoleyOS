"""Module 51 - offline video telestrator geometry (Decimal only)."""

from __future__ import annotations

from decimal import Decimal
from itertools import pairwise

from pydantic import BaseModel, ConfigDict, Field

from app.services.mathx import angle_at, distance, round2

ZERO = Decimal("0")


class Point(BaseModel):
    model_config = ConfigDict(extra="forbid")

    x: Decimal = Field(ge=0)
    y: Decimal = Field(ge=0)


class Stroke(BaseModel):
    model_config = ConfigDict(extra="forbid")

    points: list[Point] = Field(min_length=2)


class TelestrationRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    frame_width: Decimal = Field(gt=0)
    frame_height: Decimal = Field(gt=0)
    strokes: list[Stroke] = Field(min_length=1)
    scale_cm_per_px: Decimal = Field(default=Decimal("0.5"), gt=0)
    takeoff: Point | None = None
    apex: Point | None = None


class StrokeMetric(BaseModel):
    index: int
    length_px: Decimal
    length_cm: Decimal
    angle_deg: Decimal


class TelestrationReport(BaseModel):
    stroke_count: int
    total_length_px: Decimal
    total_length_cm: Decimal
    mean_angle_deg: Decimal
    max_angle_deg: Decimal
    jump_height_cm: Decimal | None
    metrics: list[StrokeMetric]
    warnings: list[str]
    message: str


def analyze(request: TelestrationRequest) -> TelestrationReport:
    metrics: list[StrokeMetric] = []
    warnings: list[str] = []
    for stroke_index, stroke in enumerate(request.strokes):
        for point in stroke.points:
            if point.x > request.frame_width or point.y > request.frame_height:
                raise ValueError("stroke point outside the video frame")
        total_px = ZERO
        angles: list[Decimal] = []
        for start, end in pairwise(stroke.points):
            a = (start.x, start.y)
            b = (end.x, end.y)
            total_px += distance(a, b)
            angles.append(angle_at((start.x + 1, start.y), (start.x, start.y), b))
        mean_angle = round2(sum(angles, ZERO) / Decimal(len(angles)))
        metrics.append(
            StrokeMetric(
                index=stroke_index,
                length_px=round2(total_px),
                length_cm=round2(total_px * request.scale_cm_per_px),
                angle_deg=mean_angle,
            )
        )
        if total_px == 0:
            warnings.append(f"Trazado {stroke_index + 1} sin desplazamiento.")

    jump_height: Decimal | None = None
    if request.takeoff is not None and request.apex is not None:
        if request.apex.y > request.takeoff.y:
            raise ValueError("apex must be above takeoff in video coordinates")
        jump_height = round2((request.takeoff.y - request.apex.y) * request.scale_cm_per_px)

    total_px = sum((metric.length_px for metric in metrics), ZERO)
    total_cm = sum((metric.length_cm for metric in metrics), ZERO)
    mean_angle = round2(sum((metric.angle_deg for metric in metrics), ZERO) / Decimal(len(metrics)))
    max_angle = max(metric.angle_deg for metric in metrics)
    return TelestrationReport(
        stroke_count=len(metrics),
        total_length_px=round2(total_px),
        total_length_cm=round2(total_cm),
        mean_angle_deg=mean_angle,
        max_angle_deg=max_angle,
        jump_height_cm=jump_height,
        metrics=metrics,
        warnings=warnings,
        message=f"{len(metrics)} trazados y {total_cm} cm analizados sin subir el video.",
    )
