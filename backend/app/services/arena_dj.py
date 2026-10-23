"""Module 40 - deterministic arena DJ cues for sound and LED screens."""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict

ArenaEvent = Literal[
    "MONSTER_BLOCK",
    "SUPER_SPIKE",
    "ACE_SIREN",
    "VIDEO_CHALLENGE_SUSPENSE",
    "SET_POINT_HEARTBEAT",
]
Waveform = Literal["square", "sawtooth", "sine", "triangle"]


class ArenaEventRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    event: ArenaEvent


class ArenaCueReport(BaseModel):
    event: ArenaEvent
    frequencies_hz: list[Decimal]
    durations_ms: list[int]
    waveform: Waveform
    visual_banner_text: dict[str, str]
    intensity: int
    message: str


def _cue(
    event: ArenaEvent,
) -> tuple[list[Decimal], list[int], Waveform, dict[str, str], int]:
    match event:
        case "MONSTER_BLOCK":
            return (
                [Decimal("110"), Decimal("82"), Decimal("55")],
                [180, 180, 260],
                "square",
                {
                    "es": "MURO TOTAL",
                    "en": "WALL OF STEEL",
                    "pt": "MURO TOTAL",
                },
                5,
            )
        case "SUPER_SPIKE":
            return (
                [Decimal("330"), Decimal("440"), Decimal("660")],
                [120, 120, 200],
                "sawtooth",
                {
                    "es": "REVISA EL TECHO",
                    "en": "CHECK THE ROOF",
                    "pt": "OLHA O TETO",
                },
                4,
            )
        case "ACE_SIREN":
            return (
                [Decimal("660"), Decimal("880"), Decimal("1320")],
                [150, 150, 300],
                "sine",
                {
                    "es": "ACE DIRECTO",
                    "en": "ACE INCOMING",
                    "pt": "ACE DIRETO",
                },
                4,
            )
        case "VIDEO_CHALLENGE_SUSPENSE":
            return (
                [Decimal("220"), Decimal("220"), Decimal("220")],
                [220, 220, 440],
                "triangle",
                {
                    "es": "OJO DE HALCON",
                    "en": "HAWK EYE REVIEW",
                    "pt": "OLHO DE FALCAO",
                },
                3,
            )
        case "SET_POINT_HEARTBEAT":
            return (
                [Decimal("60"), Decimal("55"), Decimal("60")],
                [180, 120, 260],
                "sine",
                {
                    "es": "BALON DE SET",
                    "en": "SET POINT",
                    "pt": "BOLA DE SET",
                },
                5,
            )


def build_arena_cue(request: ArenaEventRequest) -> ArenaCueReport:
    frequencies, durations, waveform, banner, intensity = _cue(request.event)
    return ArenaCueReport(
        event=request.event,
        frequencies_hz=frequencies,
        durations_ms=durations,
        waveform=waveform,
        visual_banner_text=banner,
        intensity=intensity,
        message=(
            f"Cue {request.event} listo: {len(frequencies)} tonos, "
            f"intensidad {intensity}/5."
        ),
    )
