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
    "serve-radar",
    "matchup-matrix",
    "blockout-lab",
    "practice-planner",
    "play-by-play",
    "player-career",
    "ball-aerodynamics",
    "rally-clipper",
    "recruiting-dossier",
    "system-transition",
    "deception-reader",
    "inclusive-adaptive",
    "elo-ranking",
    "team-treasury",
    "house-rules",
    "arena-dj",
    "court-slang",
    "qr-sync",
    "gym-screen",
    "fivb-escoresheet",
    "video-telestrator",
    "playbook-animator",
    "shot-heatmap",
    "tournament-nutrition",
    "injury-prehab",
    "tiebreak-commander",
    "bracket-architect",
    "sponsor-deck",
    "head-to-head",
    "peripheral-reflex",
    "club-white-label",
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


def serve_radar_demo() -> dict[str, Any]:
    return {
        "origin_x_m": "0",
        "origin_y_m": "0",
        "target_x_m": "7.5",
        "target_y_m": "6.5",
        "flight_time_ms": 700,
    }


def matchup_matrix_demo() -> dict[str, Any]:
    return {
        "opponent_attack": ["90", "72", "64", "58", "46", "38"],
        "own_block": ["52", "58", "64", "70", "76", "82"],
    }


def blockout_lab_demo() -> dict[str, Any]:
    return {
        "zone": "zone_4",
        "set_distance": "tight_0_3m",
        "block_closure": "double_closed",
        "attacker_reach_cm": "342",
        "block_reach_cm": "326",
    }


def practice_planner_demo() -> dict[str, Any]:
    return {"players": 9, "duration_min": 90, "focus": "k1_reception"}


def play_by_play_demo() -> dict[str, Any]:
    return {
        "home_team": "Tiburones",
        "away_team": "Condores",
        "events": [
            {
                "kind": "point",
                "team": "home",
                "player": "Valentina",
                "score_home": 1,
                "score_away": 0,
                "set_number": 1,
            },
            {
                "kind": "point",
                "team": "away",
                "player": "Carla",
                "score_home": 1,
                "score_away": 2,
                "set_number": 1,
            },
            {
                "kind": "point",
                "team": "home",
                "player": "Sofia",
                "score_home": 3,
                "score_away": 2,
                "set_number": 1,
            },
            {
                "kind": "timeout",
                "team": "away",
                "score_home": 20,
                "score_away": 20,
                "set_number": 3,
            },
            {
                "kind": "point",
                "team": "home",
                "player": "Renata",
                "score_home": 21,
                "score_away": 21,
                "set_number": 3,
            },
            {
                "kind": "card",
                "team": "away",
                "player": "Carla",
                "score_home": 21,
                "score_away": 21,
                "set_number": 3,
            },
        ],
    }


def player_career_demo() -> dict[str, Any]:
    return {
        "player": "Valentina",
        "measurements": [
            {
                "period": "2026-01",
                "vertical_jump_cm": "52",
                "attack_reach_cm": "305",
                "serve_speed_kmh": "78",
                "attack_efficiency_pct": "38",
                "reception_pct": "52",
            },
            {
                "period": "2026-06",
                "vertical_jump_cm": "61",
                "attack_reach_cm": "318",
                "serve_speed_kmh": "92",
                "attack_efficiency_pct": "47",
                "reception_pct": "61",
            },
        ],
    }


def ball_aerodynamics_demo() -> dict[str, Any]:
    return {
        "speed_kmh": "68",
        "spin_rps": "0.8",
        "launch_angle_deg": "12",
        "impact_height_m": "2.1",
    }


def rally_clipper_demo() -> dict[str, Any]:
    return {
        "player_number": 7,
        "min_duration_sec": "3",
        "rallies": [
            {
                "start_sec": "0",
                "end_sec": "4.5",
                "player_number": 7,
                "skill": "spike",
                "outcome": "kill",
            },
            {
                "start_sec": "4.5",
                "end_sec": "5.5",
                "player_number": 4,
                "skill": "dig",
                "outcome": "transition",
            },
            {
                "start_sec": "5.5",
                "end_sec": "10.0",
                "player_number": 7,
                "skill": "ace",
                "outcome": "ace",
            },
            {
                "start_sec": "10.0",
                "end_sec": "13.2",
                "player_number": 9,
                "skill": "block",
                "outcome": "stuff",
            },
            {
                "start_sec": "13.2",
                "end_sec": "18.0",
                "player_number": 7,
                "skill": "spike",
                "outcome": "kill",
            },
        ],
    }


def recruiting_dossier_demo() -> dict[str, Any]:
    return {
        "graduation_year": 2028,
        "position": "outside",
        "height_cm": "188",
        "reach_one_hand_cm": "245",
        "reach_two_hand_cm": "248",
        "vertical_jump_cm": "78",
        "attack_reach_cm": "323",
        "kills": 280,
        "attack_efficiency_pct": "46",
    }


def system_transition_demo() -> dict[str, Any]:
    return {
        "setters": 2,
        "pure_hitters": 5,
        "transition_read_grade": 8,
        "rotation": 1,
    }


def deception_reader_demo() -> dict[str, Any]:
    return {
        "approach_speed_kmh": "19",
        "elbow_height_cm": "172",
        "ball_front_offset_cm": "8",
        "setter_front_zone_jump": True,
        "blockers_committed": 2,
    }


def inclusive_adaptive_demo() -> dict[str, Any]:
    return {"mode": "sitting", "sex": "male", "players": 6}


def elo_ranking_demo() -> dict[str, Any]:
    return {
        "team_a_rating": "1820",
        "team_b_rating": "1760",
        "k_weight": "40",
        "result": "3-1",
    }


def team_treasury_demo() -> dict[str, Any]:
    return {
        "jersey_cost_total": "360.00",
        "monthly_fee_per_player": "12.50",
        "months": 3,
        "ball_fund": "90.00",
        "registration_fee": "60.00",
        "players": [
            {"name": "Valentina", "paid": "80.00"},
            {"name": "Carla", "paid": "45.00"},
            {"name": "Sofia", "paid": "120.00"},
            {"name": "Renata", "paid": "0.00"},
        ],
    }


def house_rules_demo() -> dict[str, Any]:
    return {
        "format": "mixed_6v6",
        "team_a_genders": ["M", "F", "M", "F", "M", "F"],
        "team_b_genders": ["F", "M", "F", "M", "F", "M"],
        "bench_order": ["Ana", "Beto", "Caro", "Dani"],
        "score_a": 14,
        "score_b": 14,
    }


def arena_dj_demo() -> dict[str, Any]:
    return {"event": "MONSTER_BLOCK"}


def court_slang_demo() -> dict[str, Any]:
    return {"term": "pipe", "origin": "AR"}


def qr_sync_demo() -> dict[str, Any]:
    return {
        "kind": "match",
        "payload": {
            "home": "Tiburones",
            "away": "Condores",
            "set": 3,
            "score_a": 24,
            "score_b": 23,
        },
        "matrix_size": 29,
    }


def gym_screen_demo() -> dict[str, Any]:
    return {
        "title": "Final Liga Metropolitana",
        "score_a": 22,
        "score_b": 20,
        "set_a": 1,
        "set_b": 1,
        "serving": "A",
        "timer": "00:42",
        "setter": "Sofia",
    }


def fivb_escoresheet_demo() -> dict[str, Any]:
    return {
        "match_no": "M-104",
        "team_a": "Tiburones",
        "team_b": "Condores",
        "sets": [{"a": 25, "b": 21}, {"a": 23, "b": 25}, {"a": 15, "b": 12}],
        "substitutions": 5,
        "sanctions": 1,
    }


def video_telestrator_demo() -> dict[str, Any]:
    return {
        "frame_width": "1920",
        "frame_height": "1080",
        "scale_cm_per_px": "0.5",
        "strokes": [
            {
                "points": [
                    {"x": "100", "y": "900"},
                    {"x": "420", "y": "640"},
                    {"x": "760", "y": "300"},
                ]
            },
            {"points": [{"x": "760", "y": "300"}, {"x": "1180", "y": "520"}]},
        ],
        "takeoff": {"x": "700", "y": "900"},
        "apex": {"x": "700", "y": "540"},
    }


def playbook_animator_demo() -> dict[str, Any]:
    return {
        "phases": [
            {
                "phase": "serve",
                "duration_ms": 1200,
                "target_zone": 1,
                "players": [
                    {"number": 7, "x": "50", "y": "90"},
                    {"number": 11, "x": "30", "y": "70"},
                ],
            },
            {
                "phase": "transition",
                "duration_ms": 1800,
                "target_zone": 5,
                "players": [
                    {"number": 7, "x": "45", "y": "80"},
                    {"number": 11, "x": "35", "y": "55"},
                ],
            },
            {
                "phase": "attack",
                "duration_ms": 1000,
                "target_zone": 9,
                "players": [
                    {"number": 7, "x": "40", "y": "70"},
                    {"number": 11, "x": "55", "y": "35"},
                ],
            },
        ]
    }


def shot_heatmap_demo() -> dict[str, Any]:
    return {
        "shots": [
            {"x": "18", "y": "18", "result": "kill"},
            {"x": "48", "y": "20", "result": "kill"},
            {"x": "52", "y": "15", "result": "kill"},
            {"x": "82", "y": "22", "result": "blocked"},
            {"x": "20", "y": "52", "result": "error"},
            {"x": "55", "y": "55", "result": "kill"},
            {"x": "86", "y": "48", "result": "kill"},
            {"x": "22", "y": "86", "result": "in_play"},
            {"x": "62", "y": "84", "result": "kill"},
        ]
    }


def tournament_nutrition_demo() -> dict[str, Any]:
    return {
        "weight_kg": "72",
        "matches": 2,
        "minutes_per_match": 95,
        "temp_c": "31",
        "sweat_rate_lh": "1.1",
    }


def injury_prehab_demo() -> dict[str, Any]:
    return {
        "weekly_jumps": 380,
        "weekly_spikes": 210,
        "sleep_hours": "6.5",
        "knee_pain": 2,
        "shoulder_pain": 4,
        "prior_injury": True,
    }


def tiebreak_commander_demo() -> dict[str, Any]:
    return {
        "score_a": 14,
        "score_b": 14,
        "serving": "B",
        "best_of": 5,
        "golden_point": True,
    }


def bracket_architect_demo() -> dict[str, Any]:
    return {"teams": ["Tiburones", "Condores", "Panteras", "Halcones", "Lobos", "Aguilas"]}


def sponsor_deck_demo() -> dict[str, Any]:
    return {
        "impressions": 48000,
        "reach": 26000,
        "cpm": "7.5",
        "engagement_pct": "4.2",
        "currency": "USD",
    }


def head_to_head_demo() -> dict[str, Any]:
    return {
        "team_a": "Tiburones",
        "team_b": "Condores",
        "matches": [
            {"sets_a": 3, "sets_b": 1},
            {"sets_a": 2, "sets_b": 3},
            {"sets_a": 3, "sets_b": 0},
            {"sets_a": 3, "sets_b": 2},
        ],
    }


def peripheral_reflex_demo() -> dict[str, Any]:
    return {"times_ms": [212, 198, 225, 240, 205, 219, 231, 208]}


def club_white_label_demo() -> dict[str, Any]:
    return {
        "club": "Tiburones Voley",
        "primary": "#0f766e",
        "secondary": "#111827",
        "accent": "#f59e0b",
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
    "serve-radar": serve_radar_demo,
    "matchup-matrix": matchup_matrix_demo,
    "blockout-lab": blockout_lab_demo,
    "practice-planner": practice_planner_demo,
    "play-by-play": play_by_play_demo,
    "player-career": player_career_demo,
    "ball-aerodynamics": ball_aerodynamics_demo,
    "rally-clipper": rally_clipper_demo,
    "recruiting-dossier": recruiting_dossier_demo,
    "system-transition": system_transition_demo,
    "deception-reader": deception_reader_demo,
    "inclusive-adaptive": inclusive_adaptive_demo,
    "elo-ranking": elo_ranking_demo,
    "team-treasury": team_treasury_demo,
    "house-rules": house_rules_demo,
    "arena-dj": arena_dj_demo,
    "court-slang": court_slang_demo,
    "qr-sync": qr_sync_demo,
    "gym-screen": gym_screen_demo,
    "fivb-escoresheet": fivb_escoresheet_demo,
    "video-telestrator": video_telestrator_demo,
    "playbook-animator": playbook_animator_demo,
    "shot-heatmap": shot_heatmap_demo,
    "tournament-nutrition": tournament_nutrition_demo,
    "injury-prehab": injury_prehab_demo,
    "tiebreak-commander": tiebreak_commander_demo,
    "bracket-architect": bracket_architect_demo,
    "sponsor-deck": sponsor_deck_demo,
    "head-to-head": head_to_head_demo,
    "peripheral-reflex": peripheral_reflex_demo,
    "club-white-label": club_white_label_demo,
}
