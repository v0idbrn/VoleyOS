"""Module 23 - setter back signals, collision detection and code sheet."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Gesture = Literal[
    "index_finger",
    "two_fingers",
    "three_fingers",
    "fist",
    "open_hand",
    "pinky",
    "thumb_up",
]
Play = Literal["A", "B/Shoot", "C/7", "D/Atras", "Pipe", "Doble (Cruce)"]

GESTURES: tuple[Gesture, ...] = (
    "index_finger",
    "two_fingers",
    "three_fingers",
    "fist",
    "open_hand",
    "pinky",
    "thumb_up",
)
PLAYS: tuple[Play, ...] = ("A", "B/Shoot", "C/7", "D/Atras", "Pipe", "Doble (Cruce)")
ICONS: dict[str, str] = {
    "index_finger": "1",
    "two_fingers": "2",
    "three_fingers": "3",
    "fist": "P",
    "open_hand": "5",
    "pinky": "Q",
    "thumb_up": "+",
}


class SignalAssignment(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    gesture: Gesture
    play: Play


class SetterSignalRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    team: str = "Mi equipo"
    setter_name: str = ""
    assignments: list[SignalAssignment] = Field(default_factory=list)


class Collision(BaseModel):
    gesture: str
    plays: list[str]


class SignalAssignmentOut(BaseModel):
    gesture: str
    play: str
    icon: str


class SignalSheetReport(BaseModel):
    valid: bool
    assignments: list[SignalAssignmentOut]
    collisions: list[Collision]
    duplicate_plays: list[str]
    missing_gestures: list[str]
    sheet: str
    message: str


def build_signal_sheet(request: SetterSignalRequest) -> SignalSheetReport:
    if not request.assignments:
        raise ValueError("at least one signal assignment is required")
    grouped: dict[str, list[str]] = {}
    play_counts: dict[str, int] = {}
    for assignment in request.assignments:
        if assignment.gesture not in GESTURES:
            raise ValueError(f"unknown setter gesture: {assignment.gesture}")
        if assignment.play not in PLAYS:
            raise ValueError(f"unknown play: {assignment.play}")
        grouped.setdefault(assignment.gesture, []).append(assignment.play)
        play_counts[assignment.play] = play_counts.get(assignment.play, 0) + 1

    collisions = [
        Collision(gesture=gesture, plays=plays)
        for gesture, plays in grouped.items()
        if len(plays) > 1
    ]
    duplicate_plays = sorted(
        play for play, count in play_counts.items() if count > 1
    )
    missing = [gesture for gesture in GESTURES if gesture not in grouped]
    ordered = sorted(
        request.assignments,
        key=lambda item: GESTURES.index(item.gesture),
    )
    lines = [
        f"# Señas del armador - {request.team}",
        f"Armador: {request.setter_name or 'sin nombre'}",
        "",
        "| Sena | Jugada |",
        "| --- | --- |",
    ]
    for assignment in ordered:
        lines.append(
            f"| {ICONS[assignment.gesture]} {assignment.gesture} | {assignment.play} |"
        )
    if collisions:
        lines.append("")
        lines.append("## Colisiones")
        for collision in collisions:
            lines.append(
                f"- {collision.gesture}: {', '.join(collision.plays)}"
            )
    if duplicate_plays:
        lines.append("")
        lines.append(f"Jugadas repetidas: {', '.join(duplicate_plays)}")
    valid = not collisions and not duplicate_plays
    message = (
        "Hoja de señas válida y sin colisiones."
        if valid
        else f"{len(collisions)} colisiones y {len(duplicate_plays)} jugadas duplicadas."
    )
    return SignalSheetReport(
        valid=valid,
        assignments=[
            SignalAssignmentOut(
                gesture=assignment.gesture,
                play=assignment.play,
                icon=ICONS[assignment.gesture],
            )
            for assignment in ordered
        ],
        collisions=collisions,
        duplicate_plays=duplicate_plays,
        missing_gestures=missing,
        sheet="\n".join(lines),
        message=message,
    )
