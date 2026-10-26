"""Single dispatcher for the 48 engines, shared by API, demo and health probe."""

from __future__ import annotations

from decimal import Decimal
from typing import Any

from pydantic import BaseModel

from app.security import sanitize_value
from app.services.arena_dj import ArenaEventRequest, build_arena_cue
from app.services.attack_tempo import classify_timing, tempo_plan, tempo_window
from app.services.ball_aerodynamics import BallAeroRequest, analyze_aerodynamics
from app.services.beach_engine import BeachState, new_beach_match
from app.services.beach_engine import award_point as beach_point
from app.services.biomechanics import PoseSequence, analyze_sequence
from app.services.block_shadow import BlockShadowRequest, compute_block_shadow
from app.services.blockout_lab import BlockoutRequest, evaluate_blockout
from app.services.bracket_architect import BracketRequest
from app.services.bracket_architect import analyze as build_bracket
from app.services.capsule_io import CapsuleRequest, run_capsule
from app.services.captain_draft import DraftRequest, snake_draft
from app.services.club_white_label import WhiteLabelRequest
from app.services.club_white_label import analyze as build_white_label
from app.services.court_slang import SlangRequest, translate_slang
from app.services.court_split import CourtSplitRequest, split_costs
from app.services.deception_reader import DeceptionRequest, read_deception
from app.services.elo_ranking import EloRequest, calculate_elo
from app.services.equipment_inspector import EquipmentRequest, inspect_equipment
from app.services.fan_companion import FanRequest, fan_report
from app.services.fivb_escoresheet import ScoresheetRequest
from app.services.fivb_escoresheet import analyze as build_scoresheet
from app.services.gym_screen import GymScreenRequest
from app.services.gym_screen import analyze as build_gym_screen
from app.services.head_to_head import H2HRequest
from app.services.head_to_head import analyze as build_head_to_head
from app.services.house_rules import HouseRulesRequest, validate_house_rules
from app.services.inclusive_adaptive import AdaptiveRequest, build_adaptive_rulebook
from app.services.injury_prehab import PrehabRequest
from app.services.injury_prehab import analyze as assess_prehab
from app.services.integrity_seal import (
    SealRequest,
    VerifySealRequest,
    build_seal,
    verify_seal,
)
from app.services.jump_load_monitor import DailyJump, jump_load
from app.services.lineup_slip import LineupSlipRequest, build_lineup_slip
from app.services.match_poster import MatchPosterRequest, build_match_poster
from app.services.matchup_matrix import MatchupRequest, build_matchup_matrix
from app.services.momentum_coach import MomentumRequest, analyze_momentum
from app.services.mvp_awards import MvpRequest, award_mvp
from app.services.obs_overlay import build_overlay
from app.services.peripheral_reflex import ReflexRequest
from app.services.peripheral_reflex import analyze as score_reflex
from app.services.pickup_balancer import (
    PickupPlayer,
    balance_teams,
    new_king_of_court,
    next_challenger,
)
from app.services.play_by_play import PlayByPlayRequest, build_play_by_play
from app.services.playbook_animator import PlaybookRequest
from app.services.playbook_animator import analyze as animate_playbook
from app.services.player_career import CareerRequest, build_career_report
from app.services.pocket_var import analyze_play, toss_coin, whistle
from app.services.practice_planner import PracticeRequest, plan_practice
from app.services.qr_sync import QrSyncRequest, build_qr_sync
from app.services.rally_clipper import ClipRequest, build_clip_plan
from app.services.recruiting_dossier import RecruitRequest, build_recruiting_dossier
from app.services.referee_console import RefereeRequest, referee_report
from app.services.roster_pass import RosterRequest, build_roster_pass
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
from app.services.seam_radar import SeamRadarRequest, compute_seam
from app.services.serve_radar import ServeRadarRequest, analyze_serve
from app.services.setter_iq import SetterIQRequest, compute_setter_iq
from app.services.setter_signals import SetterSignalRequest, build_signal_sheet
from app.services.shot_heatmap import ShotRequest
from app.services.shot_heatmap import analyze as build_shot_heatmap
from app.services.sponsor_deck import SponsorRequest
from app.services.sponsor_deck import analyze as build_sponsor_deck
from app.services.substitution_tracker import SubstitutionRequest, track_substitutions
from app.services.system_transition import SystemRequest, analyze_system
from app.services.team_treasury import TreasuryRequest, build_treasury
from app.services.tiebreak_commander import TiebreakRequest
from app.services.tiebreak_commander import analyze as command_tiebreak
from app.services.timeout_chalkboard import ChalkboardRequest, build_chalkboard
from app.services.tournament_engine import (
    MatchResult,
    playoff_bracket,
    round_robin,
    schedule,
    standings,
)
from app.services.tournament_nutrition import NutritionRequest
from app.services.tournament_nutrition import analyze as plan_nutrition
from app.services.video_telestrator import TelestrationRequest
from app.services.video_telestrator import analyze as telestrate
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
        profiles=["players"],
        description="Biomecánica de remate/saque, salto vertical y drills de 1.5 m.",
    ),
    ModuleInfo(
        slug="rotation",
        name="Pizarra 5-1 + VAR de Solapamiento",
        name_en="5-1 Board & Overlap VAR",
        profile="coaches",
        profiles=["coaches"],
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
        profiles=["court"],
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
        profiles=["players"],
        description="Equipos parejos con armador garantizado y Rey de la Cancha.",
    ),
    ModuleInfo(
        slug="overlay",
        name="Overlay TV para OBS",
        name_en="OBS/TV Overlay",
        profile="fans",
        profiles=["fans"],
        description="Marcador VNL transparente con banners SET POINT y TIME-OUT.",
    ),
    ModuleInfo(
        slug="var",
        name="VAR de Bolsillo",
        name_en="Pocket VAR",
        profile="court",
        profiles=["court"],
        description="Árbol FIVB con artículos exactos y sorteo criptográfico.",
    ),
    ModuleInfo(
        slug="beach",
        name="Beach Volley 2v2",
        name_en="Beach 2v2",
        profile="court",
        profiles=["court"],
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
        profiles=["players"],
        description="Ventanas en milisegundos para quick, shoot, pipe y desborde.",
    ),
    ModuleInfo(
        slug="acwr",
        name="Monitor ACWR de Saltos",
        name_en="ACWR Jump Monitor",
        profile="coaches",
        profiles=["coaches"],
        description="Carga aguda:crónica en Decimal con semáforo tendinoso.",
    ),
    ModuleInfo(
        slug="block-shadow",
        name="Sombra de Bloqueo y Cobertura",
        name_en="Block Shadow & Cover",
        profile="coaches",
        profiles=["coaches"],
        description="Cono de sombra, defensores fuera del bloqueo y porcentaje de cancha cubierta.",
    ),
    ModuleInfo(
        slug="seam-radar",
        name="Radar de Costuras de Recepcion",
        name_en="Reception Seam Radar",
        profile="court",
        profiles=["court"],
        description="Dueno de la costura, prioridad y drill para cerrar el hueco entre receptores.",
    ),
    ModuleInfo(
        slug="setter-iq",
        name="Auditor de Imprevisibilidad del Armador",
        name_en="Setter IQ Auditor",
        profile="coaches",
        profiles=["coaches"],
        description="Distribucion R1-R6, indice 0-100 y sesgos criticos por calidad de pase.",
    ),
    ModuleInfo(
        slug="lineup-slip",
        name="Boleta de Formacion I-VI",
        name_en="FIVB Lineup Slip I-VI",
        profile="referees",
        profiles=["referees"],
        description="Boleta oficial I-VI, pares a 3 posiciones y ventana exacta del libero.",
    ),
    ModuleInfo(
        slug="integrity-seal",
        name="Sello Criptografico Anti-Trampa",
        name_en="Integrity Seal",
        profile="referees",
        profiles=["referees"],
        description="HMAC-SHA256 sobre JSON canonico, hash publico y verificacion de actas.",
    ),
    ModuleInfo(
        slug="capsule-io",
        name="Capsula Universal .volleyos",
        name_en=".volleyos Capsule",
        profile="fans",
        profiles=["fans"],
        description="Exporta e importa pizarras, planteles y torneos con checksum SHA-256.",
    ),
    ModuleInfo(
        slug="referee-console",
        name="Consola Oficial de Arbitro",
        name_en="FIVB Referee Console",
        profile="referees",
        profiles=["referees"],
        description="Tarjetas FIVB, escalamiento automatico y relojes de 8s/30s.",
    ),
    ModuleInfo(
        slug="substitution-tracker",
        name="Control de las 6 Sustituciones",
        name_en="Six-Substitution Tracker",
        profile="court",
        profiles=["court"],
        description="Valida cambios, reingresos y pares por posicion en tiempo real.",
    ),
    ModuleInfo(
        slug="court-split",
        name="La Vaquita y Finanzas de Torneo",
        name_en="Court Split & Tournament Finance",
        profile="tournaments",
        profiles=["tournaments"],
        description="Reparte cancha y tercer tiempo al centavo y calcula break-even.",
    ),
    ModuleInfo(
        slug="fan-companion",
        name="Modo Tribuna y Senas Arbitrales",
        name_en="Fan Companion & Referee Signals",
        profile="fans",
        profiles=["fans"],
        description="Decodifica gestos FIVB, trivia y explicaciones en ES/EN/PT.",
    ),
    ModuleInfo(
        slug="setter-signals",
        name="Senas Ocultas del Armador",
        name_en="Setter Back Signals",
        profile="players",
        profiles=["players"],
        description="Diccionario de senas, deteccion de colisiones y hoja de codigos.",
    ),
    ModuleInfo(
        slug="mvp-awards",
        name="Premios MVP y Tercer Tiempo",
        name_en="MVP & Third-Half Awards",
        profile="fans",
        profiles=["fans"],
        description="MVP, Muro, Candado, Francotirador y tarjeta sellada para compartir.",
    ),
    ModuleInfo(
        slug="timeout-chalkboard",
        name="Pizarra de Tiempo Muerto",
        name_en="Timeout Chalkboard",
        profile="tournaments",
        profiles=["tournaments"],
        description="Dos consignas tácticas, 30 segundos FIVB y trazos validados en 9x18 m.",
    ),
    ModuleInfo(
        slug="momentum-coach",
        name="Coach de Momentum y Rachas",
        name_en="Momentum Coach",
        profile="tournaments",
        profiles=["tournaments"],
        description="Break points, racha rival y rotación de mayor presión en tiempo real.",
    ),
    ModuleInfo(
        slug="captain-draft",
        name="Draft Serpiente de Capitanes",
        name_en="Snake Captain Draft",
        profile="tournaments",
        profiles=["tournaments"],
        description="Orden A-B-B-A, equipos parejos y auditoría por departamento.",
    ),
    ModuleInfo(
        slug="roster-pass",
        name="Pase Verificable de Plantel",
        name_en="Roster Pass",
        profile="referees",
        profiles=["referees"],
        description="Hasta 14 jugadores, dos liberos y pase VOS-ROSTER sellado para mesa.",
    ),
    ModuleInfo(
        slug="equipment-inspector",
        name="Inspector de Red y Balón",
        name_en="Equipment Inspector",
        profile="referees",
        profiles=["referees"],
        description=(
            "Alturas oficiales, tolerancia de 2 cm y presión de balón en "
            "kgf/cm2, PSI y kPa."
        ),
    ),
    ModuleInfo(
        slug="match-poster",
        name="Poster SVG de Partido",
        name_en="SVG Match Poster",
        profile="fans",
        profiles=["fans"],
        description="Story 9:16 y feed 1:1 con sets, MVP, sello HMAC y c��digo de sala.",
    ),
    ModuleInfo(
        slug="serve-radar",
        name="Radar Balístico de Saque",
        name_en="Serve Speed Radar",
        profile="players",
        profiles=["players"],
        description="Velocidad inicial, clasificación del saque y margen de reacción.",
    ),
    ModuleInfo(
        slug="matchup-matrix",
        name="Matriz de Matchup 6x6",
        name_en="6x6 Matchup Matrix",
        profile="coaches",
        profiles=["coaches"],
        description="Treinta y seis inicios de set: mejor rotación y peor evitación.",
    ),
    ModuleInfo(
        slug="blockout-lab",
        name="Laboratorio de Block-Out",
        name_en="Block-Out Lab",
        profile="court",
        profiles=["court"],
        description="Mano afuera, costura, reciclaje y roll shot con valor esperado.",
    ),
    ModuleInfo(
        slug="practice-planner",
        name="Planificador de Entrenamientos",
        name_en="Practice Planner",
        profile="tournaments",
        profiles=["tournaments"],
        description="Bloques cronometrados para 4-24 jugadores sin gente mirando.",
    ),
    ModuleInfo(
        slug="play-by-play",
        name="Narrador Play-by-Play",
        name_en="Play-by-Play Narrator",
        profile="fans",
        profiles=["fans"],
        description="Feed broadcast, puntos clutch, cambios de liderazgo y resumen ES/EN/PT.",
    ),
    ModuleInfo(
        slug="player-career",
        name="Pasaporte de Progreso",
        name_en="Player Career Passport",
        profile="referees",
        profiles=["referees"],
        description="Deltas atléticos, índice de evolución 0-100 y cuello de botella.",
    ),
    ModuleInfo(
        slug="ball-aerodynamics",
        name="Laboratorio Aerodinamico Magnus",
        name_en="Magnus Aerodynamics Lab",
        profile="players",
        profiles=["players"],
        description="Reynolds, crisis de arrastre del flotado y caida Magnus en centimetros.",
    ),
    ModuleInfo(
        slug="rally-clipper",
        name="Cortador de Highlights y Tiempos Muertos",
        name_en="Rally Highlight Clipper",
        profile="players",
        profiles=["players"],
        description="Tiempo neto, capitulos YouTube, comando FFmpeg y EDL sin recodificar.",
    ),
    ModuleInfo(
        slug="recruiting-dossier",
        name="Dossier de Reclutamiento y Beca",
        name_en="Recruiting & Scholarship Dossier",
        profile="tournaments",
        profiles=["tournaments"],
        description="Score 0-100 contra percentiles universitarios y sello VOS-SEAL.",
    ),
    ModuleInfo(
        slug="system-transition",
        name="Simulador 4-2 / 6-2 / 5-1",
        name_en="4-2 / 6-2 / 5-1 Transition Simulator",
        profile="coaches",
        profiles=["coaches"],
        description="Atacantes delanteros por rotacion, sistema optimo y mapa de infiltracion.",
    ),
    ModuleInfo(
        slug="deception-reader",
        name="Lector de Engano del Armador",
        name_en="Setter Deception Reader",
        profile="coaches",
        profiles=["coaches"],
        description="Probabilidades de swing, toque y volcada con defensor responsable.",
    ),
    ModuleInfo(
        slug="inclusive-adaptive",
        name="Mini-Voley y Voley Sentado",
        name_en="Mini & Sitting Volleyball",
        profile="court",
        profiles=["court"],
        description="Canchas 2v2/3v3/4v4 y reglas World ParaVolley a 1.15/1.05 m.",
    ),
    ModuleInfo(
        slug="elo-ranking",
        name="Ranking ELO / FIVB Probabilistico",
        name_en="Probabilistic ELO / FIVB Ranking",
        profile="referees",
        profiles=["referees"],
        description="Puntos esperados y transferencia por margen 3-0 a 0-3.",
    ),
    ModuleInfo(
        slug="team-treasury",
        name="Tesoreria del Equipo",
        name_en="Team Treasury",
        profile="tournaments",
        profiles=["tournaments"],
        description="Cuotas, camisetas e inscripcion al centavo con resumen WhatsApp y Excel.",
    ),
    ModuleInfo(
        slug="house-rules",
        name="Reglas de Casa, Mixto y Relojito",
        name_en="House Rules, Mixed & Relojito",
        profile="court",
        profiles=["court"],
        description="Contactos por genero, rotacion con banco y sets a 15 con golden point.",
    ),
    ModuleInfo(
        slug="arena-dj",
        name="Arena DJ de Estadio VNL",
        name_en="VNL Arena DJ",
        profile="fans",
        profiles=["fans"],
        description="Cues WebAudio y banners ES/EN/PT para block, spike, ace y challenge.",
    ),
    ModuleInfo(
        slug="court-slang",
        name="Traductor Mundial de Jerga",
        name_en="World Court Slang Translator",
        profile="fans",
        profiles=["fans"],
        description="Diccionario tactico AR/ES/MX/BR/US con significado y uso en cancha.",
    ),
    ModuleInfo(
        slug="qr-sync",
        name="Sincronizador QR Air-Gapped",
        name_en="Air-Gapped QR Sync",
        profile="referees",
        profiles=["referees"],
        description="Token firmado HMAC y matriz SVG 21x21/29x29 sin internet.",
    ),
    ModuleInfo(
        slug="gym-screen",
        name="Pantalla Gigante de Gimnasio",
        name_en="Gym Giant Screen",
        profile="court",
        profiles=["court"],
        description="Marcador horizontal a pantalla completa legible a 30 metros.",
    ),
    ModuleInfo(
        slug="fivb-escoresheet",
        name="Planilla FIVB",
        name_en="FIVB Scoresheet",
        profile="referees",
        profiles=["referees"],
        description="Acta A4 con sets, cambios, sanciones y ganador.",
    ),
    ModuleInfo(
        slug="video-telestrator",
        name="Telestrador de Video Offline",
        name_en="Offline Video Telestrator",
        profile="players",
        profiles=["players"],
        description="Trazos, angulos y altura de salto sin subir el video.",
    ),
    ModuleInfo(
        slug="playbook-animator",
        name="Animador de Jugadas en 3 Fases",
        name_en="Three-Phase Playbook Animator",
        profile="players",
        profiles=["players"],
        description="Saque, transicion y ataque con vectores por jugador.",
    ),
    ModuleInfo(
        slug="shot-heatmap",
        name="Mapa de Calor de Remates",
        name_en="Shot Heatmap",
        profile="tournaments",
        profiles=["tournaments"],
        description="Nueve zonas, zona caliente y eficiencia de ataque.",
    ),
    ModuleInfo(
        slug="tournament-nutrition",
        name="Nutricion de Torneo",
        name_en="Tournament Nutrition",
        profile="coaches",
        profiles=["coaches"],
        description="Carbohidratos, liquido y sodio por partido y clima.",
    ),
    ModuleInfo(
        slug="injury-prehab",
        name="Prehab de Hombro y Rodilla",
        name_en="Shoulder & Knee Prehab",
        profile="coaches",
        profiles=["coaches"],
        description="Riesgo por carga, sueno y dolor con drills preventivos.",
    ),
    ModuleInfo(
        slug="tiebreak-commander",
        name="Comandante de Tie-Break",
        name_en="Tiebreak Commander",
        profile="referees",
        profiles=["referees"],
        description="Punto de oro, cambio de lado y decision a 14-14.",
    ),
    ModuleInfo(
        slug="bracket-architect",
        name="Arquitecto de Llaves",
        name_en="Bracket Architect",
        profile="tournaments",
        profiles=["tournaments"],
        description="Llave sembrada por ranking con byes y rondas.",
    ),
    ModuleInfo(
        slug="sponsor-deck",
        name="Deck de Sponsors",
        name_en="Sponsor Deck",
        profile="fans",
        profiles=["fans"],
        description="Valor por impresiones, alcance y engagement.",
    ),
    ModuleInfo(
        slug="head-to-head",
        name="Cara a Cara",
        name_en="Head to Head",
        profile="fans",
        profiles=["fans"],
        description="Historial, racha y dominio por sets entre equipos.",
    ),
    ModuleInfo(
        slug="peripheral-reflex",
        name="Reflejo Periferico",
        name_en="Peripheral Reflex",
        profile="court",
        profiles=["court"],
        description="Tiempos de reaccion, consistencia y rating.",
    ),
    ModuleInfo(
        slug="club-white-label",
        name="Estudio Marca Blanca de Club",
        name_en="Club White-Label Studio",
        profile="tournaments",
        profiles=["tournaments"],
        description="Colores del club, contraste legible y variables CSS.",
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


def _run_block_shadow(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(compute_block_shadow(BlockShadowRequest.model_validate(payload)))


def _run_seam_radar(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(compute_seam(SeamRadarRequest.model_validate(payload)))


def _run_setter_iq(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(compute_setter_iq(SetterIQRequest.model_validate(payload)))


def _run_lineup_slip(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_lineup_slip(LineupSlipRequest.model_validate(payload)))


def _run_integrity_seal(payload: dict[str, Any]) -> dict[str, Any]:
    if str(payload.get("action", "sign")) == "verify":
        request = VerifySealRequest.model_validate(payload)
        return _dump(verify_seal(request.payload, request.seal, request.original))
    return _dump(build_seal(SealRequest.model_validate(payload).payload))


def _run_capsule(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(run_capsule(CapsuleRequest.model_validate(payload)))


def _run_referee_console(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(referee_report(RefereeRequest.model_validate(payload)))


def _run_substitution_tracker(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(track_substitutions(SubstitutionRequest.model_validate(payload)))


def _run_court_split(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(split_costs(CourtSplitRequest.model_validate(payload)))


def _run_fan_companion(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(fan_report(FanRequest.model_validate(payload)))


def _run_setter_signals(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_signal_sheet(SetterSignalRequest.model_validate(payload)))


def _run_mvp_awards(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(award_mvp(MvpRequest.model_validate(payload)))


def _run_timeout_chalkboard(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_chalkboard(ChalkboardRequest.model_validate(payload)))


def _run_momentum_coach(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(analyze_momentum(MomentumRequest.model_validate(payload)))


def _run_captain_draft(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(snake_draft(DraftRequest.model_validate(payload)))


def _run_roster_pass(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_roster_pass(RosterRequest.model_validate(payload)))


def _run_equipment_inspector(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(inspect_equipment(EquipmentRequest.model_validate(payload)))


def _run_match_poster(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_match_poster(MatchPosterRequest.model_validate(payload)))


def _run_serve_radar(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(analyze_serve(ServeRadarRequest.model_validate(payload)))


def _run_matchup_matrix(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_matchup_matrix(MatchupRequest.model_validate(payload)))


def _run_blockout_lab(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(evaluate_blockout(BlockoutRequest.model_validate(payload)))


def _run_practice_planner(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(plan_practice(PracticeRequest.model_validate(payload)))


def _run_play_by_play(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_play_by_play(PlayByPlayRequest.model_validate(payload)))


def _run_player_career(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_career_report(CareerRequest.model_validate(payload)))


def _run_ball_aerodynamics(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(analyze_aerodynamics(BallAeroRequest.model_validate(payload)))


def _run_rally_clipper(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_clip_plan(ClipRequest.model_validate(payload)))


def _run_recruiting_dossier(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_recruiting_dossier(RecruitRequest.model_validate(payload)))


def _run_system_transition(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(analyze_system(SystemRequest.model_validate(payload)))


def _run_deception_reader(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(read_deception(DeceptionRequest.model_validate(payload)))


def _run_inclusive_adaptive(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_adaptive_rulebook(AdaptiveRequest.model_validate(payload)))


def _run_elo_ranking(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(calculate_elo(EloRequest.model_validate(payload)))


def _run_team_treasury(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_treasury(TreasuryRequest.model_validate(payload)))


def _run_house_rules(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(validate_house_rules(HouseRulesRequest.model_validate(payload)))


def _run_arena_dj(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_arena_cue(ArenaEventRequest.model_validate(payload)))


def _run_court_slang(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(translate_slang(SlangRequest.model_validate(payload)))


def _run_qr_sync(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_qr_sync(QrSyncRequest.model_validate(payload)))


def _run_gym_screen(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_gym_screen(GymScreenRequest.model_validate(payload)))


def _run_scoresheet(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_scoresheet(ScoresheetRequest.model_validate(payload)))


def _run_telestrator(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(telestrate(TelestrationRequest.model_validate(payload)))


def _run_playbook(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(animate_playbook(PlaybookRequest.model_validate(payload)))


def _run_shot_heatmap(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_shot_heatmap(ShotRequest.model_validate(payload)))


def _run_nutrition(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(plan_nutrition(NutritionRequest.model_validate(payload)))


def _run_prehab(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(assess_prehab(PrehabRequest.model_validate(payload)))


def _run_tiebreak(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(command_tiebreak(TiebreakRequest.model_validate(payload)))


def _run_bracket(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_bracket(BracketRequest.model_validate(payload)))


def _run_sponsor(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_sponsor_deck(SponsorRequest.model_validate(payload)))


def _run_head_to_head(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_head_to_head(H2HRequest.model_validate(payload)))


def _run_reflex(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(score_reflex(ReflexRequest.model_validate(payload)))


def _run_white_label(payload: dict[str, Any]) -> dict[str, Any]:
    return _dump(build_white_label(WhiteLabelRequest.model_validate(payload)))


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
    "block-shadow": _run_block_shadow,
    "seam-radar": _run_seam_radar,
    "setter-iq": _run_setter_iq,
    "lineup-slip": _run_lineup_slip,
    "integrity-seal": _run_integrity_seal,
    "capsule-io": _run_capsule,
    "referee-console": _run_referee_console,
    "substitution-tracker": _run_substitution_tracker,
    "court-split": _run_court_split,
    "fan-companion": _run_fan_companion,
    "setter-signals": _run_setter_signals,
    "mvp-awards": _run_mvp_awards,
    "timeout-chalkboard": _run_timeout_chalkboard,
    "momentum-coach": _run_momentum_coach,
    "captain-draft": _run_captain_draft,
    "roster-pass": _run_roster_pass,
    "equipment-inspector": _run_equipment_inspector,
    "match-poster": _run_match_poster,
    "serve-radar": _run_serve_radar,
    "matchup-matrix": _run_matchup_matrix,
    "blockout-lab": _run_blockout_lab,
    "practice-planner": _run_practice_planner,
    "play-by-play": _run_play_by_play,
    "player-career": _run_player_career,
    "ball-aerodynamics": _run_ball_aerodynamics,
    "rally-clipper": _run_rally_clipper,
    "recruiting-dossier": _run_recruiting_dossier,
    "system-transition": _run_system_transition,
    "deception-reader": _run_deception_reader,
    "inclusive-adaptive": _run_inclusive_adaptive,
    "elo-ranking": _run_elo_ranking,
    "team-treasury": _run_team_treasury,
    "house-rules": _run_house_rules,
    "arena-dj": _run_arena_dj,
    "court-slang": _run_court_slang,
    "qr-sync": _run_qr_sync,
    "gym-screen": _run_gym_screen,
    "fivb-escoresheet": _run_scoresheet,
    "video-telestrator": _run_telestrator,
    "playbook-animator": _run_playbook,
    "shot-heatmap": _run_shot_heatmap,
    "tournament-nutrition": _run_nutrition,
    "injury-prehab": _run_prehab,
    "tiebreak-commander": _run_tiebreak,
    "bracket-architect": _run_bracket,
    "sponsor-deck": _run_sponsor,
    "head-to-head": _run_head_to_head,
    "peripheral-reflex": _run_reflex,
    "club-white-label": _run_white_label,
}


def run_module(slug: str, payload: dict[str, Any]) -> dict[str, Any]:
    runner = RUNNERS.get(slug)
    if runner is None:
        raise KeyError(f"unknown module: {slug}")
    return runner(sanitize_value(payload))
