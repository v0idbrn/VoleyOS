"""Module 4 — indoor 6v6 scoreboard with automatic side-out rotation and libero."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

FRONT_ROW = {2, 3, 4}
BACK_ROW = {1, 5, 6}
RosterRole = Literal["S", "OH", "MB", "OPP", "L"]


class Player(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    number: int = Field(ge=1, le=99)
    name: str = ""


class RosterEntry(Player):
    role: RosterRole = "OH"
    captain: bool = False


class TeamRoster(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    id: str
    name: str
    code: str
    players: list[RosterEntry]
    starters: list[int]
    libero: int | None = None
    bench: list[int]


class MatchState(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    team_a: str
    team_b: str
    best_of: int = 3
    set_number: int = 1
    score_a: int = 0
    score_b: int = 0
    sets_a: int = 0
    sets_b: int = 0
    serving: str = "A"
    first_serving: str = "A"
    lineup_a: dict[int, int]
    lineup_b: dict[int, int]
    libero_a: int | None = None
    libero_b: int | None = None
    timeouts_a: int = 0
    timeouts_b: int = 0
    subs_a: int = 0
    subs_b: int = 0
    streak: int = 1
    status: str = "live"
    winner: str | None = None
    last_event: str = ""


class PointOutcome(BaseModel):
    state: MatchState
    rotated: bool
    side_switch_due: bool
    set_finished: bool
    match_finished: bool
    message: str


class ActionResult(BaseModel):
    state: MatchState
    message: str


def _validate_team(players: list[Player]) -> None:
    if len(players) != 6:
        raise ValueError("each team needs exactly 6 players on court")
    numbers = [player.number for player in players]
    if len(set(numbers)) != 6:
        raise ValueError("duplicate shirt numbers")


def create_team(team_id: str, name: str, code: str, players: list[RosterEntry]) -> TeamRoster:
    if not 6 <= len(players) <= 14:
        raise ValueError("roster needs 6-14 players")
    numbers = [player.number for player in players]
    if len(set(numbers)) != len(numbers):
        raise ValueError("duplicate shirt numbers")
    liberos = [player for player in players if player.role == "L"]
    if len(liberos) > 2:
        raise ValueError("at most two liberos")
    captains = [player for player in players if player.captain]
    if len(captains) != 1:
        raise ValueError("exactly one captain is required")
    if captains[0].role == "L":
        raise ValueError("the captain cannot be the libero")
    court = [player for player in players if player.role != "L"]
    if len(court) < 6:
        raise ValueError("at least six court players are required")
    starters = [player.number for player in court[:6]]
    return TeamRoster(
        id=team_id,
        name=name,
        code=code[:3].upper(),
        players=players,
        starters=starters,
        libero=liberos[0].number if liberos else None,
        bench=[
            player.number
            for player in players
            if player.number not in starters and player.role != "L"
        ],
    )


def roster_lineup(team: TeamRoster) -> dict[int, int]:
    if len(team.starters) != 6:
        raise ValueError("starting six required")
    return {zone + 1: number for zone, number in enumerate(team.starters)}


def new_match(
    team_a: list[Player],
    team_b: list[Player],
    best_of: int = 3,
    libero_a: int | None = None,
    libero_b: int | None = None,
) -> MatchState:
    if best_of not in (1, 3, 5):
        raise ValueError("best_of must be 1, 3 or 5")
    _validate_team(team_a)
    _validate_team(team_b)
    return MatchState(
        team_a="Team A",
        team_b="Team B",
        best_of=best_of,
        lineup_a={index + 1: player.number for index, player in enumerate(team_a)},
        lineup_b={index + 1: player.number for index, player in enumerate(team_b)},
        libero_a=libero_a,
        libero_b=libero_b,
    )


def server_number(state: MatchState) -> int:
    lineup = state.lineup_a if state.serving == "A" else state.lineup_b
    return lineup[1]


def rotate_lineup(lineup: dict[int, int]) -> dict[int, int]:
    """Clockwise rotation: Z2 moves to Z1 and becomes the server."""
    return {
        1: lineup[2],
        2: lineup[3],
        3: lineup[4],
        4: lineup[5],
        5: lineup[6],
        6: lineup[1],
    }


def libero_issues(lineup: dict[int, int], libero: int | None) -> list[str]:
    if libero is None:
        return []
    issues: list[str] = []
    for zone, number in lineup.items():
        if number != libero:
            continue
        if zone in FRONT_ROW:
            issues.append(f"Libero #{libero} en zona delantera Z{zone} (FIVB 19.3.1).")
        if zone == 1:
            issues.append(f"Libero #{libero} en Z1 no puede sacar (FIVB 19.3.1).")
    return issues


def _alternate(first: str) -> str:
    return "B" if first == "A" else "A"


def award_point(state: MatchState, team: str) -> PointOutcome:
    if state.status != "live":
        raise ValueError("match is not live")
    if team not in ("A", "B"):
        raise ValueError("team must be 'A' or 'B'")

    new = state.model_copy(deep=True)
    side_out = team != new.serving
    if side_out:
        if team == "A":
            new.lineup_a = rotate_lineup(new.lineup_a)
        else:
            new.lineup_b = rotate_lineup(new.lineup_b)
        new.serving = team
        new.streak = 1
    else:
        new.streak += 1

    if team == "A":
        new.score_a += 1
    else:
        new.score_b += 1

    decider = new.set_number == new.best_of
    target = 15 if decider else 25
    own = new.score_a if team == "A" else new.score_b
    rival = new.score_b if team == "A" else new.score_a
    set_finished = own >= target and own - rival >= 2
    match_finished = False
    message = f"Punto {team} — {new.score_a}-{new.score_b}"

    if set_finished:
        if team == "A":
            new.sets_a += 1
        else:
            new.sets_b += 1
        match_finished = new.sets_a > new.best_of // 2 or new.sets_b > new.best_of // 2
        if match_finished:
            new.status = "finished"
            new.winner = team
            message = f"Partido para {team} ({new.sets_a}-{new.sets_b})."
        else:
            new.set_number += 1
            new.score_a = 0
            new.score_b = 0
            new.timeouts_a = 0
            new.timeouts_b = 0
            new.subs_a = 0
            new.subs_b = 0
            new.first_serving = _alternate(new.first_serving)
            new.serving = new.first_serving
            new.streak = 1
            message = f"Set para {team}. Nuevo set {new.set_number}."

    side_switch_due = decider and not set_finished and (new.score_a + new.score_b) == 8
    new.last_event = message
    return PointOutcome(
        state=new,
        rotated=side_out,
        side_switch_due=side_switch_due,
        set_finished=set_finished,
        match_finished=match_finished,
        message=message,
    )


def call_timeout(state: MatchState, team: str) -> ActionResult:
    if state.status != "live":
        raise ValueError("match is not live")
    new = state.model_copy(deep=True)
    if team == "A":
        if new.timeouts_a >= 2:
            raise ValueError("Team A already used both timeouts this set")
        new.timeouts_a += 1
    elif team == "B":
        if new.timeouts_b >= 2:
            raise ValueError("Team B already used both timeouts this set")
        new.timeouts_b += 1
    else:
        raise ValueError("team must be 'A' or 'B'")
    new.last_event = f"Time-out {team}"
    return ActionResult(state=new, message=new.last_event)


def substitute(state: MatchState, team: str, out_number: int, in_number: int) -> ActionResult:
    if state.status != "live":
        raise ValueError("match is not live")
    new = state.model_copy(deep=True)
    if team not in ("A", "B"):
        raise ValueError("team must be 'A' or 'B'")
    if team == "A":
        LINEUP: dict[int, int] = new.lineup_a
    else:
        LINEUP = new.lineup_b
    if out_number not in LINEUP.values():
        raise ValueError(f"player #{out_number} is not on court")
    if in_number in LINEUP.values():
        raise ValueError(f"player #{in_number} is already on court")
    if out_number in (new.libero_a, new.libero_b) or in_number in (new.libero_a, new.libero_b):
        raise ValueError("libero exchanges are unlimited and managed separately")
    if team == "A":
        if new.subs_a >= 6:
            raise ValueError("Team A already used the 6 substitutions")
        new.subs_a += 1
    else:
        if new.subs_b >= 6:
            raise ValueError("Team B already used the 6 substitutions")
        new.subs_b += 1
    for zone, number in list(LINEUP.items()):
        if number == out_number:
            LINEUP[zone] = in_number
    new.last_event = f"Sustitución {team}: #{out_number} por #{in_number}"
    return ActionResult(state=new, message=new.last_event)


def place_libero(state: MatchState, team: str, zone: int, libero: int) -> ActionResult:
    if zone not in BACK_ROW:
        raise ValueError("the libero can only enter in Z1, Z5 or Z6")
    new = state.model_copy(deep=True)
    LINEUP = new.lineup_a if team == "A" else new.lineup_b
    if team == "A":
        new.libero_a = libero
    elif team == "B":
        new.libero_b = libero
    else:
        raise ValueError("team must be 'A' or 'B'")
    previous = LINEUP[zone]
    LINEUP[zone] = libero
    new.last_event = f"Libero #{libero} entra por #{previous} en Z{zone}"
    return ActionResult(state=new, message=new.last_event)
