"""Module 25 - 30-second timeout chalkboard with validated court strokes."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

CENT = Decimal("0.01")


class Point(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    x: Decimal = Field(ge=Decimal("0"), le=Decimal("9"))
    y: Decimal = Field(ge=Decimal("0"), le=Decimal("18"))


class Stroke(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    points: list[Point] = Field(min_length=2, max_length=12)


class ChalkboardRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    reason: Literal["stop_serve_run", "organize_sideout", "match_point_defense"]
    rotation: int = Field(default=1, ge=1, le=6)
    score_a: int = Field(default=0, ge=0, le=99)
    score_b: int = Field(default=0, ge=0, le=99)
    serving: Literal["A", "B"] = "A"
    strokes: list[Stroke] = Field(default_factory=list, max_length=6)


class Cue(BaseModel):
    code: str
    text: str
    priority: Literal["NORMAL", "HIGH", "CRITICAL"]


class StrokeReport(BaseModel):
    points: list[Point]
    length_m: Decimal
    total_length_m: Decimal
    arrowhead: Point
    valid: bool


class ChalkboardReport(BaseModel):
    reason: str
    rotation: int
    score_a: int
    score_b: int
    serving: str
    seconds: Decimal
    cues: list[Cue]
    strokes: list[StrokeReport]
    total_length_m: Decimal
    message: str


CUES: dict[str, tuple[Cue, Cue]] = {
    "stop_serve_run": (
        Cue(
            code="fix_reception",
            text="Acorta la recepción: tres receptores en semicírculo y libero al centro.",
            priority="HIGH",
        ),
        Cue(
            code="serve_short",
            text="Saque corto al 1-2 para romper la rotación de saque rival.",
            priority="NORMAL",
        ),
    ),
    "organize_sideout": (
        Cue(
            code="setter_release",
            text="Libera al armador del bloqueo y fija el ataque por Z4.",
            priority="HIGH",
        ),
        Cue(
            code="pin_attack",
            text="Ataque de pin con cobertura de Z6 y pipe como segunda opción.",
            priority="NORMAL",
        ),
    ),
    "match_point_defense": (
        Cue(
            code="block_line",
            text="Bloqueo a la línea y defensa escalonada en Z5-Z6.",
            priority="CRITICAL",
        ),
        Cue(
            code="backcourt_cover",
            text="Cubre el rebote del bloqueo con Z1 cerrado al centro.",
            priority="HIGH",
        ),
    ),
}


def _length(points: list[Point]) -> Decimal:
    total = Decimal("0")
    for start, end in zip(points, points[1:], strict=False):
        dx = end.x - start.x
        dy = end.y - start.y
        total += (dx * dx + dy * dy).sqrt()
    return total.quantize(CENT, rounding=ROUND_HALF_UP)


def build_chalkboard(request: ChalkboardRequest) -> ChalkboardReport:
    strokes: list[StrokeReport] = []
    total = Decimal("0")
    for stroke in request.strokes:
        length = _length(stroke.points)
        strokes.append(
            StrokeReport(
                points=stroke.points,
                length_m=length,
                total_length_m=length,
                arrowhead=stroke.points[-1],
                valid=True,
            )
        )
        total += length
    cues = list(CUES[request.reason])
    return ChalkboardReport(
        reason=request.reason,
        rotation=request.rotation,
        score_a=request.score_a,
        score_b=request.score_b,
        serving=request.serving,
        seconds=Decimal("30.0"),
        cues=cues,
        strokes=strokes,
        total_length_m=total.quantize(CENT, rounding=ROUND_HALF_UP),
        message=(
            "Pizarra de tiempo muerto lista: 30 s FIVB, dos consignas y trazos "
            "validados dentro de la cancha de 9 x 18 m."
        ),
    )
