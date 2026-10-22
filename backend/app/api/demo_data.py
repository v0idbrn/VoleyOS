"""Rich, runnable demo payloads — one per module. No toy repetitions."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from app.services.rotation_validator import default_positions
from app.services.scoreboard_engine import Player, new_match

MODULE_SLUGS = (
    "biomechanics",
    "rotation",
    "scouting",
    "scoreboard",
    "tournament",
    "pickup",
    "overlay",
    "var",
    "beach",
    "volleycard",
    "tempo",
    "acwr",
)


def _joint(x: str, y: str) -> dict[str, str]:
    return {"x": x, "y": y}


def _pose_joints(
    knee_x: str = "30",
    wrist: tuple[str, str] = ("60", "90"),
    hand: tuple[str, str] = ("20", "190"),
) -> dict[str, dict[str, str]]:
    return {
        "hip": _joint("0", "100"),
        "knee": _joint(knee_x, "50"),
        "ankle": _joint("0", "0"),
        "other_hip": _joint("0", "100"),
        "other_knee": _joint("-30", "50"),
        "other_ankle": _joint("0", "0"),
        "shoulder": _joint("0", "150"),
        "elbow": _joint("30", "120"),
        "wrist": _joint(*wrist),
        "head": _joint("0", "150"),
        "hand": _joint(*hand),
    }


def biomechanics_demo() -> dict[str, Any]:
    phases = ["penultimate_step", "arm_draw", "impact", "window", "landing"]
    frames = []
    for index, phase in enumerate(phases):
        wrist = ("60", "150") if phase == "arm_draw" else ("60", "90")
        frames.append(
            {
                "phase": phase,
                "t_ms": index * 120,
                "joints": _pose_joints(wrist=wrist),
            }
        )
    return {"frames": frames, "takeoff_ms": 0, "landing_ms": 540}


def rotation_demo() -> dict[str, Any]:
    positions = default_positions(3)
    positions[2] = (Decimal(750), Decimal(500))
    return {
        "rotation": 3,
        "positions": {str(zone): [str(xy[0]), str(xy[1])] for zone, xy in positions.items()},
    }


def scouting_demo() -> dict[str, Any]:
    events = [
        {
            "player": 4,
            "skill": "serve",
            "rotation": 1,
            "origin_zone": 1,
            "target_zone": 5,
            "result": "ACE",
            "side_out": False,
        },
        {
            "player": 7,
            "skill": "attack",
            "rotation": 1,
            "origin_zone": 4,
            "target_zone": 5,
            "direction": "diagonal",
            "result": "KILL",
            "side_out": True,
        },
        {
            "player": 7,
            "skill": "attack",
            "rotation": 1,
            "origin_zone": 4,
            "target_zone": 1,
            "direction": "line",
            "result": "BLOCKED",
            "side_out": True,
        },
        {
            "player": 9,
            "skill": "attack",
            "rotation": 2,
            "origin_zone": 2,
            "target_zone": 6,
            "direction": "cross",
            "result": "KILL",
            "side_out": True,
        },
        {
            "player": 9,
            "skill": "attack",
            "rotation": 2,
            "origin_zone": 2,
            "target_zone": 6,
            "direction": "cross",
            "result": "ERROR",
            "side_out": True,
        },
        {
            "player": 11,
            "skill": "attack",
            "rotation": 3,
            "origin_zone": 3,
            "target_zone": 5,
            "direction": "short",
            "result": "ERROR",
            "side_out": True,
        },
        {
            "player": 11,
            "skill": "attack",
            "rotation": 3,
            "origin_zone": 3,
            "target_zone": 1,
            "direction": "deep",
            "result": "ERROR",
            "side_out": True,
        },
        {
            "player": 7,
            "skill": "attack",
            "rotation": 4,
            "origin_zone": 4,
            "target_zone": 5,
            "direction": "diagonal",
            "result": "KILL",
            "side_out": True,
        },
        {
            "player": 7,
            "skill": "attack",
            "rotation": 4,
            "origin_zone": 4,
            "target_zone": 1,
            "direction": "line",
            "result": "KILL",
            "side_out": True,
        },
        {
            "player": 9,
            "skill": "attack",
            "rotation": 5,
            "origin_zone": 2,
            "target_zone": 6,
            "direction": "cross",
            "result": "IN_PLAY",
            "side_out": True,
        },
        {
            "player": 9,
            "skill": "attack",
            "rotation": 5,
            "origin_zone": 2,
            "target_zone": 6,
            "direction": "cross",
            "result": "KILL",
            "side_out": True,
        },
        {
            "player": 11,
            "skill": "attack",
            "rotation": 6,
            "origin_zone": 3,
            "target_zone": 1,
            "direction": "short",
            "result": "KILL",
            "side_out": True,
        },
    ]
    return {
        "events": events,
        "text": "Ataque del 7 por 4 diagonal punto",
    }


def _players(prefix: str, names: list[str]) -> list[dict[str, Any]]:
    return [{"number": index + 1, "name": f"{prefix} {name}"} for index, name in enumerate(names)]


def scoreboard_state() -> dict[str, Any]:
    team_a = [
        Player(number=index + 1, name=name)
        for index, name in enumerate(
            ["Sofía", "Camila", "Valentina", "Micaela", "Julieta", "Renata"]
        )
    ]
    team_b = [
        Player(number=index + 7, name=name)
        for index, name in enumerate(
            ["Carla", "Daniela", "Antonella", "Florencia", "Martina", "Lucía"]
        )
    ]
    state = new_match(team_a, team_b, best_of=3)
    return state.model_copy(
        update={
            "team_a": "Tiburones",
            "team_b": "Cóndores",
            "score_a": 22,
            "score_b": 20,
            "sets_a": 1,
            "sets_b": 1,
        }
    ).model_dump(mode="json")


def scoreboard_demo() -> dict[str, Any]:
    return {"state": scoreboard_state(), "action": "point", "team": "B"}


def overlay_demo() -> dict[str, Any]:
    state = new_match(
        [Player(number=index + 1) for index in range(6)],
        [Player(number=index + 7) for index in range(6)],
        best_of=3,
    ).model_copy(
        update={
            "team_a": "Tiburones",
            "team_b": "Cóndores",
            "score_a": 24,
            "score_b": 22,
            "sets_a": 1,
            "sets_b": 1,
            "serving": "A",
        }
    )
    return {
        "state": state.model_dump(mode="json"),
        "sponsor": "Mikasa Volt",
    }


def tournament_demo() -> dict[str, Any]:
    teams = [
        "Tiburones",
        "Cóndores",
        "Panteras",
        "Halcones",
        "Lobos",
        "Águilas",
        "Pumas",
        "Titanes",
    ]
    matches = [
        {
            "home": "Tiburones",
            "away": "Cóndores",
            "home_sets": 3,
            "away_sets": 1,
            "home_points": 96,
            "away_points": 84,
        },
        {
            "home": "Panteras",
            "away": "Halcones",
            "home_sets": 3,
            "away_sets": 2,
            "home_points": 104,
            "away_points": 101,
        },
        {
            "home": "Lobos",
            "away": "Águilas",
            "home_sets": 3,
            "away_sets": 0,
            "home_points": 75,
            "away_points": 58,
        },
        {
            "home": "Pumas",
            "away": "Titanes",
            "home_sets": 2,
            "away_sets": 3,
            "home_points": 99,
            "away_points": 102,
        },
        {
            "home": "Tiburones",
            "away": "Panteras",
            "home_sets": 3,
            "away_sets": 2,
            "home_points": 111,
            "away_points": 108,
        },
        {
            "home": "Cóndores",
            "away": "Halcones",
            "home_sets": 3,
            "away_sets": 0,
            "home_points": 75,
            "away_points": 61,
        },
        {
            "home": "Lobos",
            "away": "Pumas",
            "home_sets": 1,
            "away_sets": 3,
            "home_points": 88,
            "away_points": 97,
        },
        {
            "home": "Águilas",
            "away": "Titanes",
            "home_sets": 3,
            "away_sets": 1,
            "home_points": 95,
            "away_points": 82,
        },
        {
            "home": "Tiburones",
            "away": "Lobos",
            "home_sets": 3,
            "away_sets": 0,
            "home_points": 76,
            "away_points": 60,
        },
        {
            "home": "Panteras",
            "away": "Pumas",
            "home_sets": 3,
            "away_sets": 1,
            "home_points": 94,
            "away_points": 81,
        },
        {
            "home": "Cóndores",
            "away": "Águilas",
            "home_sets": 3,
            "away_sets": 2,
            "home_points": 107,
            "away_points": 104,
        },
        {
            "home": "Halcones",
            "away": "Titanes",
            "home_sets": 3,
            "away_sets": 0,
            "home_points": 75,
            "away_points": 55,
        },
    ]
    return {
        "teams": teams,
        "matches": matches,
        "courts": ["Cancha Central", "Cancha 2"],
        "start": "09:00",
        "slot_minutes": 45,
    }


def pickup_demo() -> dict[str, Any]:
    players = [
        {"name": "Sofía", "role": "armador", "level": 5},
        {"name": "Camila", "role": "punta", "level": 4},
        {"name": "Valentina", "role": "central", "level": 4},
        {"name": "Micaela", "role": "opuesto", "level": 3},
        {"name": "Julieta", "role": "libero", "level": 3},
        {"name": "Renata", "role": "universal", "level": 2},
        {"name": "Carla", "role": "armador", "level": 4},
        {"name": "Daniela", "role": "punta", "level": 5},
        {"name": "Antonella", "role": "central", "level": 3},
        {"name": "Florencia", "role": "opuesto", "level": 2},
        {"name": "Martina", "role": "libero", "level": 2},
        {"name": "Lucía", "role": "universal", "level": 1},
    ]
    return {
        "players": players,
        "team_count": 2,
        "king_teams": ["Tiburones", "Cóndores", "Panteras"],
    }


def var_demo() -> dict[str, Any]:
    return {
        "text": "Líbero armando de dedos delante de la línea de 3 metros",
        "toss": True,
    }


def beach_state() -> dict[str, Any]:
    return {
        "team_a": {
            "name": "Ana y Bea",
            "players": ["Ana", "Bea"],
            "sets": 0,
            "points": 18,
            "server_index": 0,
        },
        "team_b": {
            "name": "Carla y Dani",
            "players": ["Carla", "Dani"],
            "sets": 0,
            "points": 17,
            "server_index": 1,
        },
        "best_of": 3,
        "set_number": 1,
        "serving": "A",
    }


def beach_demo() -> dict[str, Any]:
    return {"state": beach_state(), "action": "point", "team": "B"}


def volleycard_demo() -> dict[str, Any]:
    return {
        "name": "Valentina Ríos",
        "position": "punta",
        "height_cm": "190",
        "standing_reach_cm": "250",
        "jump_cm": "78",
        "attributes": {
            "attack": 92,
            "reception": 84,
            "serve": 79,
            "block": 71,
            "defense": 76,
            "setting": 55,
        },
    }


def tempo_demo() -> dict[str, Any]:
    return {"tempo": "second", "offset_ms": 15, "contact_ms": 0}


def acwr_demo() -> dict[str, Any]:
    end = date(2026, 10, 22)
    days = []
    for offset in range(28):
        stamp = end - timedelta(days=27 - offset)
        base = 90 + (offset % 5) * 8
        jumps = 185 if offset >= 21 else base
        days.append({"date": stamp.isoformat(), "jumps": jumps})
    return {"days": days, "reference_date": end.isoformat()}


DEMOS = {
    "biomechanics": biomechanics_demo,
    "rotation": rotation_demo,
    "scouting": scouting_demo,
    "scoreboard": scoreboard_demo,
    "tournament": tournament_demo,
    "pickup": pickup_demo,
    "overlay": overlay_demo,
    "var": var_demo,
    "beach": beach_demo,
    "volleycard": volleycard_demo,
    "tempo": tempo_demo,
    "acwr": acwr_demo,
}
