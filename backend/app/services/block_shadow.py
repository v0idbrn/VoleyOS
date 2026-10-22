"""Module 13 - block shadow geometry and defensive coverage (Decimal only)."""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.services.mathx import ZERO, round2
from app.services.rules import COURT_WIDTH_M, HALF_COURT_LENGTH_M

ATTACK_TARGET_X = {
    "zone_4": Decimal("1.50"),
    "zone_2": Decimal("7.50"),
    "pipe_6": Decimal("4.50"),
    "quick_3": Decimal("3.00"),
}
DEFENDER_BASE = {
    "Z5": (Decimal("1.60"), Decimal("2.80")),
    "Z6": (Decimal("4.50"), Decimal("5.40")),
    "Z1": (Decimal("7.40"), Decimal("2.80")),
    "FREE": (Decimal("5.80"), Decimal("1.60")),
}


class BlockShadowRequest(BaseModel):
    attack_zone: Literal["zone_4", "zone_2", "pipe_6", "quick_3"] = "zone_4"
    blockers: int = Field(default=2, ge=1, le=3)
    scheme: Literal["line", "cross"] = "line"
    block_x: Decimal | None = Field(default=None, ge=ZERO, le=COURT_WIDTH_M)
    block_depth: Decimal = Field(default=Decimal("0.50"), ge=ZERO, le=Decimal("2.00"))

    @model_validator(mode="after")
    def _block_inside_court(self) -> BlockShadowRequest:
        if self.block_x is not None and self.block_x > COURT_WIDTH_M:
            raise ValueError("block_x must be within the 9 m court")
        return self


class ShadowPoint(BaseModel):
    x: Decimal
    y: Decimal


class DefenderSpot(BaseModel):
    role: str
    x: Decimal
    y: Decimal
    moved_cm: Decimal
    inside_shadow: bool


class BlockShadowReport(BaseModel):
    attack_zone: str
    scheme: str
    blockers: int
    block_center_x: Decimal
    shadow_polygon: list[ShadowPoint]
    shadow_area_m2: Decimal
    coverage_pct: Decimal
    defenders: list[DefenderSpot]
    uncovered_width_m: Decimal
    message: str


def _polygon_area(points: list[tuple[Decimal, Decimal]]) -> Decimal:
    total = ZERO
    for index, (x1, y1) in enumerate(points):
        x2, y2 = points[(index + 1) % len(points)]
        total += x1 * y2 - x2 * y1
    return abs(total) / 2


def _inside(x: Decimal, y: Decimal, polygon: list[tuple[Decimal, Decimal]]) -> bool:
    inside = False
    j = len(polygon) - 1
    for i, (xi, yi) in enumerate(polygon):
        xj, yj = polygon[j]
        crosses = (yi > y) != (yj > y)
        if crosses:
            edge_x = (xj - xi) * (y - yi) / (yj - yi) + xi
            if x < edge_x:
                inside = not inside
        j = i
    return inside


def _half_width(y: Decimal, center_x: Decimal, base_half: Decimal, spread: Decimal) -> Decimal:
    return base_half + spread * y / HALF_COURT_LENGTH_M


def _eject(
    x: Decimal,
    y: Decimal,
    center_x: Decimal,
    base_half: Decimal,
    spread: Decimal,
) -> Decimal:
    half = _half_width(y, center_x, base_half, spread)
    left = max(Decimal("0.40"), center_x - half - Decimal("0.40"))
    right = min(COURT_WIDTH_M - Decimal("0.40"), center_x + half + Decimal("0.40"))
    if x < center_x and left >= Decimal("0.40"):
        return left
    if right <= COURT_WIDTH_M - Decimal("0.40"):
        return right
    return Decimal("8.60") if center_x < Decimal("4.50") else Decimal("0.40")


def compute_block_shadow(request: BlockShadowRequest) -> BlockShadowReport:
    target_x = ATTACK_TARGET_X[request.attack_zone]
    if request.block_x is None:
        if request.scheme == "line":
            center = target_x + (
                Decimal("0.60") if target_x < Decimal("4.50") else Decimal("-0.60")
            )
        else:
            center = target_x + (
                Decimal("-1.10") if target_x < Decimal("4.50") else Decimal("1.10")
            )
        center = max(Decimal("0.80"), min(COURT_WIDTH_M - Decimal("0.80"), center))
    else:
        center = request.block_x
    base_half = Decimal("0.45") * request.blockers
    spread = (Decimal("0.34") if request.scheme == "line" else Decimal("0.52")) * request.blockers
    far_y = Decimal("4.20") if request.attack_zone == "quick_3" else Decimal("6.40")
    far_half = _half_width(far_y, center, base_half, spread)
    polygon = [
        (max(ZERO, center - base_half), request.block_depth),
        (min(COURT_WIDTH_M, center + base_half), request.block_depth),
        (min(COURT_WIDTH_M, center + far_half), min(HALF_COURT_LENGTH_M, far_y)),
        (max(ZERO, center - far_half), min(HALF_COURT_LENGTH_M, far_y)),
    ]
    area = round2(_polygon_area(polygon))
    defenders: list[DefenderSpot] = []
    for role, (base_x, base_y) in DEFENDER_BASE.items():
        x, y = base_x, base_y
        inside = _inside(x, y, polygon)
        moved = ZERO
        if inside:
            new_x = _eject(x, y, center, base_half, spread)
            if _inside(new_x, y, polygon):
                y = min(HALF_COURT_LENGTH_M - Decimal("0.40"), far_y + Decimal("0.60"))
                new_x = _eject(x, y, center, base_half, spread)
            moved = round2(abs(new_x - x) * Decimal("100"))
            x = round2(new_x)
        defenders.append(
            DefenderSpot(
                role=role,
                x=round2(x),
                y=round2(y),
                moved_cm=moved,
                inside_shadow=_inside(x, y, polygon),
            )
        )
    coverage = round2(area / (COURT_WIDTH_M * HALF_COURT_LENGTH_M) * Decimal("100"))
    uncovered = round2(max(ZERO, COURT_WIDTH_M - base_half * 2))
    return BlockShadowReport(
        attack_zone=request.attack_zone,
        scheme=request.scheme,
        blockers=request.blockers,
        block_center_x=round2(center),
        shadow_polygon=[ShadowPoint(x=round2(x), y=round2(y)) for x, y in polygon],
        shadow_area_m2=area,
        coverage_pct=coverage,
        defenders=defenders,
        uncovered_width_m=uncovered,
        message=(
            f"Sombra de {request.blockers} bloqueador(es) cubre {coverage}% del campo propio; "
            "cada defensor queda fuera del cono."
        ),
    )
