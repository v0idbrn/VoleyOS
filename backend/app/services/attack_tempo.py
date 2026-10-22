"""Module 11 — attack tempo windows in milliseconds."""

from __future__ import annotations

from pydantic import BaseModel

TEMPOS: dict[str, dict[str, int | str]] = {
    "first": {
        "label": "1° Tiempo (A / Quick Central)",
        "offset_ms": -180,
        "tolerance_ms": 30,
        "description": "El atacante despega antes de que la pelota toque las manos del armador.",
    },
    "second": {
        "label": "2° Tiempo Rápido (Shoot / Tendida)",
        "offset_ms": 0,
        "tolerance_ms": 40,
        "description": "El penúltimo paso de freno coincide con el toque del armador.",
    },
    "pipe": {
        "label": "2° Tiempo Pipe (Zaguero)",
        "offset_ms": 0,
        "tolerance_ms": 50,
        "description": "Ataque de zaguero por el centro con timing de segundo tiempo.",
    },
    "third": {
        "label": "3° Tiempo (Pelota Alta de Desborde)",
        "offset_ms": 350,
        "tolerance_ms": 60,
        "description": "El atacante espera a ver salir la pelota de las manos del armador.",
    },
}


class TempoWindow(BaseModel):
    code: str
    label: str
    contact_ms: int
    ideal_start_ms: int
    window_start_ms: int
    window_end_ms: int
    tolerance_ms: int
    description: str


class TimingResult(BaseModel):
    code: str
    offset_ms: int
    ideal_ms: int
    delta_ms: int
    status: str
    message: str


def _spec(code: str) -> dict[str, int | str]:
    if code not in TEMPOS:
        raise ValueError(f"unknown tempo: {code}")
    return TEMPOS[code]


def tempo_window(code: str, contact_ms: int = 0) -> TempoWindow:
    spec = _spec(code)
    offset = int(spec["offset_ms"])
    tolerance = int(spec["tolerance_ms"])
    ideal = contact_ms + offset
    return TempoWindow(
        code=code,
        label=str(spec["label"]),
        contact_ms=contact_ms,
        ideal_start_ms=ideal,
        window_start_ms=ideal - tolerance,
        window_end_ms=ideal + tolerance,
        tolerance_ms=tolerance,
        description=str(spec["description"]),
    )


def classify_timing(code: str, offset_ms: int) -> TimingResult:
    spec = _spec(code)
    ideal = int(spec["offset_ms"])
    tolerance = int(spec["tolerance_ms"])
    delta = offset_ms - ideal
    if abs(delta) <= tolerance:
        status = "PERFECT"
        message = f"Timing dentro de la ventana de ±{tolerance} ms."
    elif delta < 0:
        status = "EARLY"
        message = f"Demasiado temprano por {abs(delta)} ms (ventana ±{tolerance} ms)."
    else:
        status = "LATE"
        message = f"Demasiado tarde por {delta} ms (ventana ±{tolerance} ms)."
    return TimingResult(
        code=code,
        offset_ms=offset_ms,
        ideal_ms=ideal,
        delta_ms=delta,
        status=status,
        message=message,
    )


def tempo_plan(contact_ms: int = 0) -> list[TempoWindow]:
    return [tempo_window(code, contact_ms) for code in TEMPOS]
