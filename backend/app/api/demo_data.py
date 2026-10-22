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
    "block-shadow",
    "seam-radar",
    "setter-iq",
    "lineup-slip",
    "integrity-seal",
    "capsule-io",
    "referee-console",
    "substitution-tracker",
    "court-split",
    "fan-companion",
    "setter-signals",
    "mvp-awards",
    "timeout-chalkboard",
    "momentum-coach",
    "captain-draft",
    "roster-pass",
    "equipment-inspector",
    "match-poster",
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




def block_shadow_demo() -> dict[str, Any]:
    return {
        "attack_zone": "zone_4",
        "blockers": 3,
        "scheme": "line",
        "block_x": "1.90",
        "block_depth": "0.55",
    }


def seam_radar_demo() -> dict[str, Any]:
    return {
        "formation": "line3",
        "rotation": 2,
        "serve_origin": "1",
        "serve_type": "jump_spin",
        "landing_x": "4.80",
        "landing_y": "5.60",
        "attacker_release_angle": "40",
    }


def setter_iq_demo() -> dict[str, Any]:
    return {
        "distributions": [
            {"rotation": 1, "quality": "+", "target": "Z4", "count": 9},
            {"rotation": 1, "quality": "+", "target": "Z3-Quick", "count": 2},
            {"rotation": 2, "quality": "+", "target": "Z4", "count": 5},
            {"rotation": 2, "quality": "#", "target": "Z2-Back", "count": 4},
            {"rotation": 2, "quality": "!", "target": "Pipe-Z6", "count": 2},
            {"rotation": 3, "quality": "+", "target": "Z4", "count": 3},
            {"rotation": 3, "quality": "#", "target": "Z3-Quick", "count": 5},
            {"rotation": 3, "quality": "+", "target": "Setter-Dump", "count": 2},
            {"rotation": 4, "quality": "+", "target": "Z2-Back", "count": 6},
            {"rotation": 4, "quality": "#", "target": "Z4", "count": 3},
            {"rotation": 5, "quality": "+", "target": "Pipe-Z6", "count": 4},
            {"rotation": 5, "quality": "-", "target": "Z4", "count": 3},
            {"rotation": 6, "quality": "+", "target": "Z4", "count": 4},
            {"rotation": 6, "quality": "#", "target": "Z3-Quick", "count": 4},
            {"rotation": 6, "quality": "!", "target": "Z2-Back", "count": 2},
        ]
    }


def lineup_slip_demo() -> dict[str, Any]:
    return {
        "rotation_start": 1,
        "setter": 1,
        "opposite": 11,
        "outside1": 4,
        "outside2": 7,
        "middle1": 14,
        "middle2": 18,
        "libero": 21,
    }


def integrity_seal_demo() -> dict[str, Any]:
    return {
        "action": "sign",
        "payload": {
            "match_id": "ARG-BRA-2026-10-22",
            "set": 3,
            "score": {"home": 26, "away": 24},
            "teams": ["Tiburones", "Condores"],
        },
    }


def capsule_io_demo() -> dict[str, Any]:
    return {
        "action": "export",
        "title": "Pizarra 5-1 Tiburones",
        "data": {
            "kind": "rotation_board",
            "team": "Tiburones",
            "rotation": 3,
            "lineup": {"setter": 1, "opposite": 11, "outside1": 4, "outside2": 7},
        },
    }

def referee_console_demo() -> dict[str, Any]:
    return {
        "serving": "A",
        "score_a": 22,
        "score_b": 20,
        "events": [
            {"team": "A", "player": 7, "kind": "WARNING_YELLOW"},
            {"team": "A", "player": 7, "kind": "WARNING_YELLOW"},
            {"team": "B", "kind": "DELAY_WARNING"},
        ],
    }


def substitution_tracker_demo() -> dict[str, Any]:
    return {
        "set_number": 2,
        "substitutions": [
            {"team": "A", "out_number": 7, "in_number": 12, "position": 4},
            {"team": "B", "out_number": 3, "in_number": 15, "position": 2},
            {"team": "A", "out_number": 12, "in_number": 7, "position": 4},
        ],
    }


def court_split_demo() -> dict[str, Any]:
    return {
        "mode": "pickup",
        "court_cost": "80",
        "extras_cost": "10",
        "third_half_cost": "10",
        "payment_alias": "volleyos.mp",
        "payment_holder": "Tesoreria Tiburones",
        "attendees": [
            {"name": "Sofia", "deposit": "10"},
            {"name": "Camila"},
            {"name": "Valentina", "discount_pct": "50"},
            {"name": "Micaela"},
            {"name": "Julieta"},
            {"name": "Renata"},
        ],
    }


def fan_companion_demo() -> dict[str, Any]:
    return {"action": "decode", "gesture": "four_fingers"}


def setter_signals_demo() -> dict[str, Any]:
    return {
        "team": "Tiburones",
        "setter_name": "Sofia",
        "assignments": [
            {"gesture": "index_finger", "play": "A"},
            {"gesture": "two_fingers", "play": "B/Shoot"},
            {"gesture": "three_fingers", "play": "C/7"},
            {"gesture": "fist", "play": "D/Atras"},
            {"gesture": "open_hand", "play": "Pipe"},
            {"gesture": "pinky", "play": "Doble (Cruce)"},
        ],
    }


def mvp_awards_demo() -> dict[str, Any]:
    return {
        "match": "Tiburones 3-1 Condores",
        "players": [
            {
                "name": "Valentina",
                "team": "Tiburones",
                "points": 24,
                "blocks": 2,
                "aces": 3,
                "digs": 5,
                "votes": 8,
                "pressure_points": 5,
            },
            {
                "name": "Micaela",
                "team": "Tiburones",
                "points": 12,
                "blocks": 6,
                "digs": 3,
                "votes": 2,
            },
            {"name": "Carla", "team": "Condores", "points": 9, "aces": 4, "digs": 2},
            {"name": "Renata", "team": "Tiburones", "points": 2, "digs": 18, "is_libero": True},
            {"name": "Sofia", "team": "Tiburones", "assists": 32},
        ],
    }


def timeout_chalkboard_demo() -> dict[str, Any]:
    return {
        "reason": "stop_serve_run",
        "rotation": 4,
        "score_a": 18,
        "score_b": 21,
        "serving": "B",
        "strokes": [
            {
                "points": [
                    {"x": "1", "y": "1"},
                    {"x": "4", "y": "6"},
                    {"x": "6", "y": "12"},
                ]
            },
            {"points": [{"x": "6", "y": "14"}, {"x": "8", "y": "17"}]},
        ],
    }


def momentum_coach_demo() -> dict[str, Any]:
    return {
        "team": "A",
        "rally_winner_history": ["A", "A", "B", "B", "B"],
        "rotation_history": [1, 2, 3, 3, 3],
    }


def captain_draft_demo() -> dict[str, Any]:
    return {
        "captains": ["Tiburones", "Condores"],
        "players": [
            {"name": "Sofia", "role": "setter", "level": "5"},
            {"name": "Valentina", "role": "outside", "level": "5"},
            {"name": "Micaela", "role": "middle", "level": "5"},
            {"name": "Carla", "role": "opposite", "level": "4"},
            {"name": "Renata", "role": "libero", "level": "4"},
            {"name": "Julieta", "role": "outside", "level": "4"},
            {"name": "Martina", "role": "middle", "level": "3"},
            {"name": "Lucia", "role": "setter", "level": "3"},
            {"name": "Paula", "role": "outside", "level": "3"},
            {"name": "Ines", "role": "libero", "level": "2"},
        ],
    }


def roster_pass_demo() -> dict[str, Any]:
    return {
        "team": "Tiburones",
        "tournament": "Copa Verano",
        "players": [
            {"name": "Sofia", "number": 1, "role": "setter", "is_captain": True},
            {"name": "Valentina", "number": 4, "role": "outside"},
            {"name": "Micaela", "number": 7, "role": "outside"},
            {"name": "Renata", "number": 9, "role": "middle"},
            {"name": "Carla", "number": 11, "role": "opposite"},
            {"name": "Julieta", "number": 14, "role": "middle"},
            {"name": "Martina", "number": 21, "role": "libero", "is_libero": True},
            {"name": "Lucia", "number": 22, "role": "libero", "is_libero": True},
        ],
    }


def equipment_inspector_demo() -> dict[str, Any]:
    return {
        "category": "men_indoor",
        "center_height_cm": "243",
        "side_a_height_cm": "243",
        "side_b_height_cm": "242",
        "ball_pressure_kgf_cm2": "0.310",
        "surface": "indoor",
    }


def match_poster_demo() -> dict[str, Any]:
    return {
        "home_team": "Tiburones",
        "away_team": "Condores",
        "sets_home": 3,
        "sets_away": 1,
        "periods": [
            {"home": 25, "away": 21},
            {"home": 22, "away": 25},
            {"home": 25, "away": 19},
            {"home": 25, "away": 23},
        ],
        "tournament": "Copa Verano",
        "mvp": "Valentina",
        "room_id": "TIB-2026",
        "theme": "obsidian",
        "format": "story",
    }


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
    "block-shadow": block_shadow_demo,
    "seam-radar": seam_radar_demo,
    "setter-iq": setter_iq_demo,
    "lineup-slip": lineup_slip_demo,
    "integrity-seal": integrity_seal_demo,
    "capsule-io": capsule_io_demo,
    "referee-console": referee_console_demo,
    "substitution-tracker": substitution_tracker_demo,
    "court-split": court_split_demo,
    "fan-companion": fan_companion_demo,
    "setter-signals": setter_signals_demo,
    "mvp-awards": mvp_awards_demo,
    "timeout-chalkboard": timeout_chalkboard_demo,
    "momentum-coach": momentum_coach_demo,
    "captain-draft": captain_draft_demo,
    "roster-pass": roster_pass_demo,
    "equipment-inspector": equipment_inspector_demo,
    "match-poster": match_poster_demo,
}
