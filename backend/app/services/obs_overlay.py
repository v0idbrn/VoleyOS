"""Module 7 — transparent OBS/TV overlay payload (VNL/ESPN style)."""

from __future__ import annotations

from pydantic import BaseModel

from app.services.scoreboard_engine import MatchState, server_number


class OverlayTeam(BaseModel):
    name: str
    sets: int
    points: int
    serving: bool
    timeouts: int


class OverlayState(BaseModel):
    team_a: OverlayTeam
    team_b: OverlayTeam
    set_number: int
    best_of: int
    serving: str
    server_number: int
    streak: int
    banner: str | None
    banner_kind: str | None
    sponsor: str | None
    transparent: bool = True
    style: str = "VNL"


def _is_set_point(state: MatchState, team: str) -> bool:
    decider = state.set_number == state.best_of
    target = 15 if decider else 25
    own = state.score_a if team == "A" else state.score_b
    rival = state.score_b if team == "A" else state.score_a
    return own >= target - 1 and own - rival >= 1


def _is_match_point(state: MatchState, team: str) -> bool:
    if not _is_set_point(state, team):
        return False
    sets = state.sets_a if team == "A" else state.sets_b
    return sets == state.best_of // 2


def detect_banner(
    state: MatchState, timeout_team: str | None = None
) -> tuple[str | None, str | None]:
    if state.status == "finished":
        return ("FINAL", "final")
    if timeout_team in ("A", "B"):
        return ("TIME-OUT", "timeout")
    for team in ("A", "B"):
        if _is_match_point(state, team):
            return ("MATCH POINT", "match_point")
    for team in ("A", "B"):
        if _is_set_point(state, team):
            return ("SET POINT", "set_point")
    return (None, None)


def build_overlay(
    state: MatchState,
    banner: str | None = None,
    sponsor: str | None = None,
    timeout_team: str | None = None,
) -> OverlayState:
    auto_banner, banner_kind = detect_banner(state, timeout_team)
    return OverlayState(
        team_a=OverlayTeam(
            name=state.team_a,
            sets=state.sets_a,
            points=state.score_a,
            serving=state.serving == "A",
            timeouts=state.timeouts_a,
        ),
        team_b=OverlayTeam(
            name=state.team_b,
            sets=state.sets_b,
            points=state.score_b,
            serving=state.serving == "B",
            timeouts=state.timeouts_b,
        ),
        set_number=state.set_number,
        best_of=state.best_of,
        serving=state.serving,
        server_number=server_number(state),
        streak=state.streak,
        banner=banner if banner is not None else auto_banner,
        banner_kind=banner_kind,
        sponsor=sponsor,
    )
