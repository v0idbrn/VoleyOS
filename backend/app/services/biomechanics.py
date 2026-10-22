"""Module 1 — The 5 Frames biomechanical lab + vertical jump (Decimal only)."""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, Field

from app.services.mathx import angle_at, round2, signed_angle_from_vertical

GRAVITY = Decimal("9.81")
FRAME_NAMES = {
    1: "Paso de freno / penúltimo paso",
    2: "Armado arco y flecha",
    3: "Extensión de impacto",
    4: "Ventana hora 11 vs hora 12",
    5: "Física de vuelo y aterrizaje",
}
DRILLS = {
    1: "Paso de freno en 1.5 m: 3x10 saltos con freno de 2 pasos y aterrizaje silencioso.",
    2: "Arco y flecha con banda elástica a 1.5 m: 3x12 retracciones de codo sin mover la cadera.",
    3: "Wall spike a 1.5 m: 3x10 golpes con brazo totalmente extendido y muñeca firme.",
    4: "Autopase a 1.5 m: lanzar, atacar y congelar la mano delante de la frente (hora 11).",
    5: "Saltos continuos a 1.5 m: 4x8 con aterrizaje en 2 pies y rodillas alineadas.",
}


class Point(BaseModel):
    x: Decimal
    y: Decimal


class PoseFrame(BaseModel):
    phase: str
    t_ms: int = Field(ge=0)
    joints: dict[str, Point]


class PoseSequence(BaseModel):
    frames: list[PoseFrame] = Field(min_length=1)
    takeoff_ms: int | None = Field(default=None, ge=0)
    landing_ms: int | None = Field(default=None, ge=0)


class FrameAssessment(BaseModel):
    frame: int
    name: str
    metric_deg: Decimal | None
    status: str
    detail: str


class FiveFramesReport(BaseModel):
    frames: list[FrameAssessment]
    jump_height_cm: Decimal | None
    flight_time_s: Decimal | None
    landing_symmetry_deg: Decimal | None
    landing_symmetric: bool | None
    score: int
    priority_frame: int
    drills: list[str]


def vertical_jump_cm(takeoff_ms: int, landing_ms: int) -> Decimal:
    if landing_ms <= takeoff_ms:
        raise ValueError("landing_ms must be greater than takeoff_ms")
    seconds = Decimal(landing_ms - takeoff_ms) / Decimal(1000)
    height = (Decimal(1) / Decimal(8)) * GRAVITY * seconds * seconds * Decimal(100)
    return round2(height)


def _joint(frame: PoseFrame, name: str) -> tuple[Decimal, Decimal]:
    joint = frame.joints.get(name)
    if joint is None:
        raise ValueError(f"frame '{frame.phase}' is missing joint '{name}'")
    return (joint.x, joint.y)


def _frame_by_phase(sequence: PoseSequence, phase: str) -> PoseFrame | None:
    for frame in sequence.frames:
        if frame.phase == phase:
            return frame
    return None


def _knee(frame: PoseFrame) -> Decimal:
    return angle_at(_joint(frame, "hip"), _joint(frame, "knee"), _joint(frame, "ankle"))


def _left_knee(frame: PoseFrame) -> Decimal | None:
    try:
        return angle_at(
            _joint(frame, "other_hip"), _joint(frame, "other_knee"), _joint(frame, "other_ankle")
        )
    except ValueError:
        return None


def _assess_brake(frame: PoseFrame) -> FrameAssessment:
    knee = _knee(frame)
    torso = signed_angle_from_vertical(_joint(frame, "hip"), _joint(frame, "shoulder"))
    if knee < 110:
        status = "TOO_DEEP"
        detail = f"Rodilla {knee}°: freno demasiado profundo, pierdes altura."
    elif knee > 130:
        status = "TOO_STRAIGHT"
        detail = f"Rodilla {knee}°: falta flexión, el impulso horizontal no se convierte en salto."
    else:
        status = "OPTIMAL"
        detail = f"Rodilla {knee}° en rango 110°-130°. Torso a {torso}° de la vertical."
    return FrameAssessment(
        frame=1, name=FRAME_NAMES[1], metric_deg=knee, status=status, detail=detail
    )


def _assess_draw(frame: PoseFrame) -> FrameAssessment:
    elbow = angle_at(_joint(frame, "shoulder"), _joint(frame, "elbow"), _joint(frame, "wrist"))
    if elbow < 70:
        status = "OVER_DRAWN"
        detail = f"Codo {elbow}°: retracción excesiva, la mano queda demasiado atrás."
    elif elbow > 100:
        status = "UNDER_DRAWN"
        detail = f"Codo {elbow}°: falta armar el arco, poca separación cadera-hombro."
    else:
        status = "OPTIMAL"
        detail = f"Codo {elbow}°: arco y flecha cargado con separación cadera-hombro."
    return FrameAssessment(
        frame=2, name=FRAME_NAMES[2], metric_deg=elbow, status=status, detail=detail
    )


def _assess_impact(frame: PoseFrame) -> FrameAssessment:
    elbow = angle_at(_joint(frame, "shoulder"), _joint(frame, "elbow"), _joint(frame, "wrist"))
    if elbow < 155:
        status = "T_REX_ARM"
        detail = f"Codo {elbow}°: brazo encogido (T-Rex Arm), pierdes alcance y potencia."
    elif elbow < 170:
        status = "NEAR_EXTENSION"
        detail = f"Codo {elbow}°: casi extendido, apunta a 170°-180° en el impacto."
    else:
        status = "OPTIMAL"
        detail = f"Codo {elbow}°: extensión completa en el frame de impacto."
    return FrameAssessment(
        frame=3, name=FRAME_NAMES[3], metric_deg=elbow, status=status, detail=detail
    )


def _assess_window(frame: PoseFrame) -> FrameAssessment:
    angle = signed_angle_from_vertical(_joint(frame, "head"), _joint(frame, "hand"))
    forward = angle > 0
    if 15 <= angle <= 35 and forward:
        status = "OPTICAL_WINDOW_11_OCLOCK"
        detail = f"Mano {angle}° delante de la frente: ataque descendente limpio (hora 11)."
    elif not forward or angle < 5:
        status = "LATE_WINDOW_12_OCLOCK"
        detail = (
            f"Mano a {angle}° y sin ventaja delantera: hora 12, riesgo de remate largo "
            "afuera e hiperextensión lumbar."
        )
    else:
        status = "TRANSITION_WINDOW"
        detail = f"Mano a {angle}°: ventana intermedia, busca 15°-35° delante de la frente."
    return FrameAssessment(
        frame=4, name=FRAME_NAMES[4], metric_deg=angle, status=status, detail=detail
    )


def _symmetry(frame: PoseFrame) -> Decimal | None:
    right = _knee(frame)
    left = _left_knee(frame)
    if left is None:
        return None
    return round2(abs(right - left))


def analyze_sequence(sequence: PoseSequence) -> FiveFramesReport:
    """Assess the five frames. Missing phases fall back to frame order."""
    ordered = sequence.frames
    phases = ["penultimate_step", "arm_draw", "impact", "window", "landing"]
    resolved: list[PoseFrame] = []
    for index, phase in enumerate(phases):
        frame = _frame_by_phase(sequence, phase)
        if frame is None:
            if index >= len(ordered):
                raise ValueError(f"sequence needs a '{phase}' frame")
            frame = ordered[index]
        resolved.append(frame)

    assessments = [
        _assess_brake(resolved[0]),
        _assess_draw(resolved[1]),
        _assess_impact(resolved[2]),
        _assess_window(resolved[3]),
    ]

    symmetry = _symmetry(resolved[4])
    jump: Decimal | None = None
    flight: Decimal | None = None
    if sequence.takeoff_ms is not None and sequence.landing_ms is not None:
        flight = round2(Decimal(sequence.landing_ms - sequence.takeoff_ms) / Decimal(1000))
        jump = vertical_jump_cm(sequence.takeoff_ms, sequence.landing_ms)
    landing_status = "OPTIMAL" if symmetry is not None and symmetry <= 10 else "ASYMMETRIC"
    landing_detail = (
        "Sin datos de la pierna no dominante; mide ambos pies."
        if symmetry is None
        else f"Diferencia de rodilla entre piernas: {symmetry}°."
    )
    if symmetry is None:
        landing_status = "INCOMPLETE"
    assessments.append(
        FrameAssessment(
            frame=5,
            name=FRAME_NAMES[5],
            metric_deg=symmetry,
            status=landing_status,
            detail=landing_detail,
        )
    )

    penalties = {
        "OPTIMAL": 0,
        "OPTICAL_WINDOW_11_OCLOCK": 0,
        "TRANSITION_WINDOW": 10,
        "INCOMPLETE": 5,
        "NEAR_EXTENSION": 10,
    }
    score = 100
    for item in assessments:
        score -= penalties.get(item.status, 20)
    score = max(0, min(100, score))

    optimal_statuses = {"OPTIMAL", "OPTICAL_WINDOW_11_OCLOCK"}
    failed = [item.frame for item in assessments if item.status not in optimal_statuses]
    priority = failed[0] if failed else 0
    drills = [DRILLS[frame] for frame in failed] or [DRILLS[2]]
    return FiveFramesReport(
        frames=assessments,
        jump_height_cm=jump,
        flight_time_s=flight,
        landing_symmetry_deg=symmetry,
        landing_symmetric=None if symmetry is None else symmetry <= 10,
        score=score,
        priority_frame=priority,
        drills=drills,
    )
