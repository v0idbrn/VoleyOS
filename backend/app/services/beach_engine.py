"""Module 9 — beach volley 2v2 with 7/5 point side switches."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class BeachTeam(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str
    players: list[str] = Field(min_length=2, max_length=2)
    sets: int = 0
    points: int = 0
    server_index: int = 0


class BeachState(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    team_a: BeachTeam
    team_b: BeachTeam
    best_of: int = 3
    set_number: int = 1
    serving: str = "A"
    first_serving: str = "A"
    status: str = "live"
    winner: str | None = None
    side_switches: int = 0
    last_event: str = ""


class BeachOutcome(BaseModel):
    state: BeachState
    side_switch_due: bool
    set_finished: bool
    match_finished: bool
    message: str


def new_beach_match(team_a: list[str], team_b: list[str], best_of: int = 3) -> BeachState:
    if best_of not in (1, 3):
        raise ValueError("beach best_of must be 1 or 3")
    if len(team_a) != 2 or len(team_b) != 2:
        raise ValueError("beach teams have exactly 2 players")
    if len(set(team_a)) != 2 or len(set(team_b)) != 2:
        raise ValueError("duplicate beach players")
    return BeachState(
        team_a=BeachTeam(name="Dupla A", players=team_a),
        team_b=BeachTeam(name="Dupla B", players=team_b),
        best_of=best_of,
    )


def _team(state: BeachState, side: str) -> BeachTeam:
    if side == "A":
        return state.team_a
    if side == "B":
        return state.team_b
    raise ValueError("team must be 'A' or 'B'")


def server_name(state: BeachState) -> str:
    team = _team(state, state.serving)
    return team.players[team.server_index]


def switch_interval(state: BeachState) -> int:
    return 5 if state.set_number == state.best_of else 7


def side_switch_due(state: BeachState) -> bool:
    total = state.team_a.points + state.team_b.points
    return total > 0 and total % switch_interval(state) == 0


def award_point(state: BeachState, side: str) -> BeachOutcome:
    if state.status != "live":
        raise ValueError("match is not live")
    _team(state, side)
    new = state.model_copy(deep=True)
    scoring = _team(new, side)
    scoring.points += 1

    if side != new.serving:
        scoring.server_index = 1 - scoring.server_index
        new.serving = side

    decider = new.set_number == new.best_of
    target = 15 if decider else 21
    rival = new.team_b.points if side == "A" else new.team_a.points
    set_finished = scoring.points >= target and scoring.points - rival >= 2
    match_finished = False
    message = f"Punto {side} — {new.team_a.points}-{new.team_b.points}"
    switched = False

    if set_finished:
        scoring.sets += 1
        match_finished = scoring.sets > new.best_of // 2
        if match_finished:
            new.status = "finished"
            new.winner = side
            message = f"Partido para {side}."
        else:
            new.set_number += 1
            new.team_a.points = 0
            new.team_b.points = 0
            new.first_serving = "B" if new.first_serving == "A" else "A"
            new.serving = new.first_serving
            message = f"Set para {side}. Nuevo set {new.set_number}."
    else:
        switched = side_switch_due(new)
        if switched:
            new.side_switches += 1

    new.last_event = message
    return BeachOutcome(
        state=new,
        side_switch_due=switched,
        set_finished=set_finished,
        match_finished=match_finished,
        message=message,
    )
