"""Module 2 — 5-1 rotation board, FIVB overlap validator and quiz."""

from __future__ import annotations

from decimal import Decimal
from itertools import pairwise

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.services.mathx import ZERO
from app.services.rules import validate_half_court_cm

FRONT_ROW = (4, 3, 2)
BACK_ROW = (5, 6, 1)
CORRESPONDENCE = ((4, 5), (3, 6), (2, 1))
LEFT_ORDER_FRONT = (4, 3, 2)
LEFT_ORDER_BACK = (5, 6, 1)
MARGIN = Decimal(10)


class CourtPosition(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    zone: int = Field(ge=1, le=6)
    x: Decimal
    y: Decimal

    @model_validator(mode="after")
    def _inside_court(self) -> CourtPosition:
        validate_half_court_cm(self.x, self.y)
        return self


class OverlapFault(BaseModel):
    pair: str
    rule: str
    offender: int
    correction_cm: dict[str, Decimal]


class OverlapReport(BaseModel):
    valid: bool
    rotation: int | None
    faults: list[OverlapFault]
    message: str


class QuizQuestion(BaseModel):
    id: int
    question: str
    options: list[str]
    answer: int
    explanation: str


class QuizResult(BaseModel):
    score: int
    total: int
    streak: int
    feedback: list[str]


def formation_for_rotation(rotation: int) -> dict[int, int]:
    """Zone -> player number for R1..R6 (setter wears #1)."""
    if rotation not in range(1, 7):
        raise ValueError("rotation must be 1..6")
    return {zone: ((zone - 1 + rotation - 1) % 6) + 1 for zone in range(1, 7)}


def default_positions(rotation: int) -> dict[int, tuple[Decimal, Decimal]]:
    """Legal starting positions in centimetres (x from left line, y from net)."""
    base = {
        4: (Decimal(150), Decimal(150)),
        3: (Decimal(450), Decimal(150)),
        2: (Decimal(750), Decimal(150)),
        5: (Decimal(150), Decimal(450)),
        6: (Decimal(450), Decimal(450)),
        1: (Decimal(750), Decimal(450)),
    }
    offset = Decimal(rotation * 3)
    return {zone: (xy[0] + offset, xy[1] + offset) for zone, xy in base.items()}


def _correction(offender: int, dx: Decimal, dy: Decimal) -> dict[str, Decimal]:
    return {"dx": dx, "dy": dy, "zone": Decimal(offender)}


def validate_overlap(
    positions: dict[int, tuple[Decimal, Decimal]],
    rotation: int | None = None,
) -> OverlapReport:
    for x, y in positions.values():
        validate_half_court_cm(x, y)
    missing = [zone for zone in range(1, 7) if zone not in positions]
    if missing:
        raise ValueError(f"missing zones: {missing}")

    faults: list[OverlapFault] = []

    for front, back in CORRESPONDENCE:
        fx, fy = positions[front]
        bx, by = positions[back]
        if fy >= by:
            faults.append(
                OverlapFault(
                    pair=f"Z{front}/Z{back}",
                    rule="Delantero debe estar más cerca de la red que su zaguero (FIVB 7.4).",
                    offender=front,
                    correction_cm=_correction(front, ZERO, -(fy - by) - MARGIN),
                )
            )

    for row, label in ((LEFT_ORDER_FRONT, "delantera"), (LEFT_ORDER_BACK, "zaguera")):
        for left, right in pairwise(row):
            lx, _ = positions[left]
            rx, _ = positions[right]
            if lx >= rx:
                faults.append(
                    OverlapFault(
                        pair=f"Z{left}/Z{right}",
                        rule=(
                            f"En la fila {label} el izquierdo debe estar más cerca de la "
                            "línea izquierda (FIVB 7.4.2)."
                        ),
                        offender=left,
                        correction_cm=_correction(left, -(lx - rx) - MARGIN, ZERO),
                    )
                )

    valid = not faults
    message = (
        "Posición legal al golpe de saque."
        if valid
        else f"{len(faults)} falta(s) de posición detectada(s)."
    )
    return OverlapReport(valid=valid, rotation=rotation, faults=faults, message=message)


def quiz_questions() -> list[QuizQuestion]:
    return [
        QuizQuestion(
            id=1,
            question="¿Qué par debe estar más cerca de la red al saque?",
            options=["Z4/Z5", "Z3/Z6", "Z2/Z1", "Todos los pares delantero/zaguero"],
            answer=3,
            explanation=(
                "Cada delantero debe estar más cerca de la red que su zaguero correspondiente."
            ),
        ),
        QuizQuestion(
            id=2,
            question="En R1 con setter #1 en Z1, ¿quién está en Z4?",
            options=["Jugador 2", "Jugador 4", "Jugador 6", "Jugador 1"],
            answer=1,
            explanation="En R1 la formación base asigna el jugador 4 a la zona 4.",
        ),
        QuizQuestion(
            id=3,
            question="¿Quién es el sacador tras una rotación?",
            options=["El jugador de Z6", "El jugador de Z1", "El líbero", "El capitán"],
            answer=1,
            explanation="El jugador que ocupa Z1 tras la rotación es el sacador.",
        ),
        QuizQuestion(
            id=4,
            question="El líbero rota a zona delantera. ¿Qué ocurre?",
            options=["Es falta", "Es legal", "Debe sacar", "Cambia de equipo"],
            answer=0,
            explanation="El líbero no puede ocupar Z4, Z3 ni Z2 ni sacar (FIVB 19.3.1).",
        ),
        QuizQuestion(
            id=5,
            question="¿Cuándo se considera completada la rotación?",
            options=["Al ganar el punto", "Al sacar", "En el tiempo muerto", "Al cambiar de lado"],
            answer=1,
            explanation="El equipo rota cuando gana el derecho a sacar y ejecuta el saque.",
        ),
    ]


def score_quiz(answers: list[int]) -> QuizResult:
    questions = quiz_questions()
    if len(answers) != len(questions):
        raise ValueError(f"expected {len(questions)} answers")
    score = 0
    streak = 0
    best_streak = 0
    feedback: list[str] = []
    for answer, question in zip(answers, questions, strict=True):
        if answer == question.answer:
            score += 1
            streak += 1
            best_streak = max(best_streak, streak)
            feedback.append(f"Q{question.id}: correcto.")
        else:
            streak = 0
            feedback.append(f"Q{question.id}: incorrecto — {question.explanation}")
    return QuizResult(score=score, total=len(questions), streak=best_streak, feedback=feedback)
