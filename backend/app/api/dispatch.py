"""Single dispatcher for the 12 engines, shared by API, demo and health probe."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from pydantic import BaseModel

from app.services.attack_tempo import classify_timing, tempo_plan, tempo_window
from app.services.beach_engine import BeachState, new_beach_match
from app.services.beach_engine import award_point as beach_point
from app.services.biomechanics import PoseSequence, analyze_sequence
from app.services.jump_load_monitor import DailyJump, jump_load
from app.services.obs_overlay import build_overlay
from app.services.pickup_balancer import (
    PickupPlayer,
    balance_teams,
    new_king_of_court,
    next_challenger,
)
from app.services.pocket_var import analyze_play, toss_coin, whistle
from app.services.rotation_validator import (
    default_positions,
    formation_for_rotation,
    score_quiz,
    validate_overlap,
)
from app.services.scoreboard_engine import (
    MatchState,
    Player,
    award_point,
    call_timeout,
    new_match,
    place_libero,
    server_number,
    substitute,
)
from app.services.scouting_engine import (
    ScoutEvent,
    heatmap,
    parse_play,
    scouting_report,
)
from app.services.tournament_engine import (
    MatchResult,
    playoff_bracket,
    round_robin,
    schedule,
    standings,
)
from app.services.volleycard_generator import VolleyCardRequest, build_volleycard


class ModuleInfo(BaseModel):
    slug: str
    name: str
    name_en: str
    profile: str
    profiles: list[str]
    description: str
    status: str = "ready"


MODULES: tuple[ModuleInfo, ...] = (
    ModuleInfo(
        slug="biomechanics",
        name="Laboratorio 5 Fotogramas",
        name_en="5 Frames Lab",
        profile="players",
        profiles=["players", "coaches"],
        description="Biomecánica de remate/saque, salto vertical y drills de 1.5 m.",
    ),
    ModuleInfo(
        slug="rotation",
        name="Pizarra 5-1 + VAR de Solapamiento",
        name_en="5-1 Board & Overlap VAR",
        profile="coaches",
        profiles=["coaches", "court"],
        description="Valida R1-R6 contra la regla FIVB y corrige faltas de posición.",
    ),
    ModuleInfo(
        slug="scouting",
        name="Scouting en 3 Clics + Mapa de Calor",
        name_en="3-Click Scouting & Heatmap",
        profile="coaches",
        profiles=["coaches"],
        description="Voz/texto ES-EN, eficiencia de ataque, K1 por rotación y 3x3.",
    ),
    ModuleInfo(
        slug="scoreboard",
        name="Contador Indoor 6v6",
        name_en="Indoor 6v6 Scoreboard",
        profile="court",
        profiles=["court", "tournaments"],
        description="Rotación horaria automática, líbero, tiempos y sustituciones.",
    ),
    ModuleInfo(
        slug="tournament",
        name="Torneos Relámpago + Ranking FIVB",
        name_en="Lightning Tournaments",
        profile="tournaments",
        profiles=["tournaments"],
        description="Fixtures, canchas sin colisiones, 3-2-1-0 y playoffs.",
    ),
    ModuleInfo(
        slug="pickup",
        name="Equilibrador de Picaditos",
        name_en="Pickup Balancer",
        profile="players",
        profiles=["players", "coaches"],
        description="Equipos parejos con armador garantizado y Rey de la Cancha.",
    ),
    ModuleInfo(
        slug="overlay",
        name="Overlay TV para OBS",
        name_en="OBS/TV Overlay",
        profile="tournaments",
        profiles=["tournaments", "coaches"],
        description="Marcador VNL transparente con banners SET POINT y TIME-OUT.",
    ),
    ModuleInfo(
        slug="var",
        name="VAR de Bolsillo",
        name_en="Pocket VAR",
        profile="court",
        profiles=["court", "players"],
        description="Árbol FIVB con artículos exactos y sorteo criptográfico.",
    ),
    ModuleInfo(
        slug="beach",
        name="Beach Volley 2v2",
        name_en="Beach 2v2",
        profile="court",
        profiles=["court", "tournaments"],
        description="21/15, cambio de lado cada 7 (5 en el tercero) y saque alternado.",
    ),
    ModuleInfo(
        slug="volleycard",
        name="VolleyCard + Radar Hexagonal",
        name_en="VolleyCard",
        profile="players",
        profiles=["players"],
        description="Alcance de ataque/bloqueo, arquetipo y carta para compartir.",
    ),
    ModuleInfo(
        slug="tempo",
        name="Tempo de Ataque 1°-2°-3°",
        name_en="Attack Tempo",
        profile="players",
        profiles=["players", "coaches"],
        description="Ventanas en milisegundos para quick, shoot, pipe y desborde.",
    ),
    ModuleInfo(
        slug="acwr",
        name="Monitor ACWR de Saltos",
        name_en="ACWR Jump Monitor",
        profile="coaches",
        profiles=["coaches", "players"],
        description="Carga aguda:crónica en Decimal con semáforo tendinoso.",
    ),
)


def module_slugs() -> list[str]:
    return [module.slug for module in MODULES]


def _dump(model: BaseModel) -> dict[str, Any]:
    return model.model_dump(mode="json")


def _run_biomechanics(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(analyze_sequence(PoseSequence.model_validate(payload)))


def _to_positions(raw: dict[str, Any]) -> dict[int, tuple[Decimal, Decimal]]:
    positions: dict[int, tuple[Decimal, Decimal]] = {}
    for key, value in raw.items():
        if isinstance(value, dict):
            x = Decimal(str(value["x"]))
            y = Decimal(str(value["y"]))
        else:
            x = Decimal(str(value[0]))
            y = Decimal(str(value[1]))
        positions[int(key)] = (x, y)
    return positions


def _run_rotation(payload: dict[str, Any]) -> dict[str, Any]:
    if "answers" in payload:
        return _dump(score_quiz([int(answer) for answer in payload["answers"]]))
    if "positions" in payload:
        report = validate_overlap(_to_positions(payload["positions"]), payload.get("rotation"))
        return _dump(report)
    rotation = int(payload.get("rotation", 1))
    positions = default_positions(rotation)
    report = validate_overlap(positions, rotation)
    return {
        "rotation": rotation,
        "formation": {
            str(zone): player for zone, player in formation_for_rotation(rotation).items()
        },
        "positions": {str(zone): [str(xy[0]), str(xy[1])] for zone, xy in positions.items()},
        "overlap": _dump(report),
    }


def _run_scouting(payload: dict[str, Any]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    events: list[ScoutEvent] = []
    raw_events = payload.get("events")
    if isinstance(raw_events, list):
        events = [ScoutEvent.model_validate(event) for event in raw_events]
        result["report"] = _dump(scouting_report(events))
        result["heatmap"] = [cell.model_dump(mode="json") for cell in heatmap(events)]
    text = payload.get("text")
    if isinstance(text, str) and text.strip():
        result["parsed"] = _dump(parse_play(text))
    if not result:
        raise ValueError("provide 'text' or 'events'")
    return result


def _apply_scoreboard_action(state: MatchState, payload: dict[str, Any]) -> dict[str, Any]:
    action = str(payload.get("action", "point"))
    team = str(payload.get("team", "A"))
    if action == "point":
        return _dump(award_point(state, team))
    if action == "timeout":
        return _dump(call_timeout(state, team))
    if action == "substitute":
        return _dump(
            substitute(
                state,
                team,
                out_number=int(payload["out_number"]),
                in_number=int(payload["in_number"]),
            )
        )
    if action == "libero":
        return _dump(place_libero(state, team, int(payload["zone"]), int(payload["libero"])))
    raise ValueError(f"unknown scoreboard action: {action}")


def _run_scoreboard(payload: dict[str, Any]) -> dict[str, Any]:
    raw_state = payload.get("state")
    if isinstance(raw_state, dict):
        state = MatchState.model_validate(raw_state)
        return _apply_scoreboard_action(state, payload)
    team_a = [Player.model_validate(player) for player in payload.get("team_a", [])]
    team_b = [Player.model_validate(player) for player in payload.get("team_b", [])]
    state = new_match(team_a, team_b, int(payload.get("best_of", 3)))
    overrides: dict[str, Any] = {
        key: payload[key]
        for key in ("team_a", "team_b", "score_a", "score_b", "sets_a", "sets_b", "serving")
        if key in payload and not isinstance(payload[key], list)
    }
    if overrides:
        state = state.model_copy(update=overrides)
    return {"state": _dump(state), "server": server_number(state)}


def _run_tournament(payload: dict[str, Any]) -> dict[str, Any]:
    raw_teams = payload.get("teams", [])
    team_names = [str(team["name"]) if isinstance(team, dict) else str(team) for team in raw_teams]
    matches = [MatchResult.model_validate(match) for match in payload.get("matches", [])]
    table = standings(team_names, matches)
    fixtures = round_robin(team_names)
    courts = [str(court) for court in payload.get("courts", [])]
    scheduled = (
        schedule(
            fixtures,
            courts,
            start=str(payload.get("start", "09:00")),
            slot_minutes=int(payload.get("slot_minutes", 45)),
        )
        if courts
        else fixtures
    )
    result: dict[str, Any] = {
        "standings": [row.model_dump(mode="json") for row in table],
        "fixtures": [fixture.model_dump(mode="json") for fixture in scheduled],
    }
    if len(table) >= 4:
        result["bracket"] = playoff_bracket(table, 4 if len(table) < 8 else 8)
    return result


def _run_pickup(payload: dict[str, Any]) -> dict[str, Any]:
    players = [PickupPlayer.model_validate(player) for player in payload.get("players", [])]
    result = balance_teams(
        players,
        int(payload.get("team_count", 2)),
        Decimal(str(payload.get("max_delta", "0.15"))),
    )
    output: dict[str, Any] = {
        "teams": [team.model_dump(mode="json") for team in result.teams],
        "delta": str(result.delta),
        "balanced": result.balanced,
        "warning": result.warning,
    }
    king_teams = payload.get("king_teams")
    if isinstance(king_teams, list) and len(king_teams) >= 2:
        king = new_king_of_court([str(team) for team in king_teams])
        output["king_of_court"] = {
            "champion": king.champion,
            "next_challenger": next_challenger(king),
            "queue": king.queue,
        }
    return output


def _run_overlay(payload: dict[str, Any]) -> dict[str, Any]:
    raw_state = payload.get("state")
    if isinstance(raw_state, dict):
        state = MatchState.model_validate(raw_state)
    else:
        state = new_match(
            [Player(number=index + 1) for index in range(6)],
            [Player(number=index + 7) for index in range(6)],
            best_of=int(payload.get("best_of", 3)),
        )
    overlay = build_overlay(
        state,
        banner=payload.get("banner"),
        sponsor=payload.get("sponsor"),
        timeout_team=payload.get("timeout_team"),
    )
    return _dump(overlay)


def _run_var(payload: dict[str, Any]) -> dict[str, Any]:
    decision = analyze_play(str(payload.get("text", "")))
    output: dict[str, Any] = {"decision": _dump(decision), "whistle": _dump(whistle())}
    if payload.get("toss"):
        output["toss"] = _dump(toss_coin())
    return output


def _run_beach(payload: dict[str, Any]) -> dict[str, Any]:
    raw_state = payload.get("state")
    if isinstance(raw_state, dict):
        state = BeachState.model_validate(raw_state)
        if str(payload.get("action", "point")) != "point":
            raise ValueError("beach only supports the point action")
        return _dump(beach_point(state, str(payload.get("team", "A"))))
    state = new_beach_match(
        [str(player) for player in payload.get("team_a", [])],
        [str(player) for player in payload.get("team_b", [])],
        int(payload.get("best_of", 3)),
    )
    return {"state": _dump(state)}


def _run_volleycard(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_volleycard(VolleyCardRequest.model_validate(payload)))


def _run_tempo(payload: dict[str, Any]) -> dict[str, Any]:
    code = str(payload.get("tempo", "second"))
    contact_ms = int(payload.get("contact_ms", 0))
    window = tempo_window(code, contact_ms)
    output: dict[str, Any] = {
        "window": _dump(window),
        "plan": [item.model_dump(mode="json") for item in tempo_plan(contact_ms)],
    }
    if "offset_ms" in payload:
        output["timing"] = _dump(classify_timing(code, int(payload["offset_ms"])))
    return output


def _run_acwr(payload: dict[str, Any]) -> dict[str, Any]:
    days = [DailyJump.model_validate(day) for day in payload.get("days", [])]
    reference = payload.get("reference_date")
    return _dump(jump_load(days, str(reference) if reference else None))


RUNNERS = {
    "biomechanics": _run_biomechanics,
    "rotation": _run_rotation,
    "scouting": _run_scouting,
    "scoreboard": _run_scoreboard,
    "tournament": _run_tournament,
    "pickup": _run_pickup,
    "overlay": _run_overlay,
    "var": _run_var,
    "beach": _run_beach,
    "volleycard": _run_volleycard,
    "tempo": _run_tempo,
    "acwr": _run_acwr,
}


def run_module(slug: str, payload: dict[str, Any]) -> dict[str, Any]:
    runner = RUNNERS.get(slug)
    if runner is None:
        raise KeyError(f"unknown module: {slug}")
    return runner(payload)
