"""Module 35 - broadcast play-by-play feed in three languages."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

KIND = Literal["point", "timeout", "substitution", "card", "set_end"]
TEAM = Literal["home", "away"]


class MatchEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    kind: KIND
    team: TEAM
    player: str = Field(default="", max_length=60)
    score_home: int = Field(ge=0, le=99)
    score_away: int = Field(ge=0, le=99)
    set_number: int = Field(ge=1, le=5)


class PlayByPlayRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    home_team: str = Field(min_length=1, max_length=60)
    away_team: str = Field(min_length=1, max_length=60)
    events: list[MatchEvent] = Field(min_length=1, max_length=500)


class FeedEntry(BaseModel):
    index: int
    kind: str
    team: str
    score: str
    headline: str
    commentary: str
    clutch: bool
    lead_change: bool


class PlayByPlayReport(BaseModel):
    feed: list[FeedEntry]
    clutch_points: int
    lead_changes: int
    final_score: str
    summary: dict[str, str]


def _leader(home: int, away: int) -> str | None:
    if home > away:
        return "home"
    if away > home:
        return "away"
    return None


def _headline(event: MatchEvent, team_name: str, clutch: bool) -> str:
    if event.kind == "point":
        return "PUNTO CLUTCH" if clutch else f"Punto para {team_name}"
    if event.kind == "timeout":
        return f"Tiempo muerto de {team_name}"
    if event.kind == "substitution":
        return f"Cambio en {team_name}"
    if event.kind == "card":
        return f"Tarjeta para {team_name}"
    return f"Fin del set {event.set_number}"


def _commentary(event: MatchEvent, team_name: str, clutch: bool) -> str:
    actor = f" {event.player}" if event.player else ""
    score = f"{event.score_home}-{event.score_away}"
    if event.kind == "point":
        prefix = "Punto de alta presion" if clutch else "Punto"
        return f"{prefix} de{actor} ({team_name}). Marcador {score}."
    if event.kind == "timeout":
        return f"{team_name} pide tiempo muerto con {score}."
    if event.kind == "substitution":
        return f"{team_name} mueve el banco: entra{actor}. Marcador {score}."
    if event.kind == "card":
        return f"El arbitro amonesta a{actor} ({team_name}). Marcador {score}."
    return f"Se cierra el set {event.set_number} con {score}."


def build_play_by_play(request: PlayByPlayRequest) -> PlayByPlayReport:
    feed: list[FeedEntry] = []
    clutch_points = 0
    lead_changes = 0
    last_leader: str | None = None
    for index, event in enumerate(request.events, start=1):
        team_name = request.home_team if event.team == "home" else request.away_team
        clutch = (
            event.kind == "point"
            and event.score_home >= 20
            and event.score_away >= 20
        )
        if clutch:
            clutch_points += 1
        leader = _leader(event.score_home, event.score_away)
        changed = leader is not None and last_leader is not None and leader != last_leader
        if changed:
            lead_changes += 1
        if leader is not None:
            last_leader = leader
        feed.append(
            FeedEntry(
                index=index,
                kind=event.kind,
                team=event.team,
                score=f"{event.score_home}-{event.score_away}",
                headline=_headline(event, team_name, clutch),
                commentary=_commentary(event, team_name, clutch),
                clutch=clutch,
                lead_change=changed,
            )
        )
    last = request.events[-1]
    score = f"{last.score_home}-{last.score_away}"
    return PlayByPlayReport(
        feed=feed,
        clutch_points=clutch_points,
        lead_changes=lead_changes,
        final_score=score,
        summary={
            "es": (
                f"{request.home_team} {score} {request.away_team}. "
                f"{clutch_points} puntos clutch y {lead_changes} cambios de liderazgo."
            ),
            "en": (
                f"{request.home_team} {score} {request.away_team}. "
                f"{clutch_points} clutch points and {lead_changes} lead changes."
            ),
            "pt": (
                f"{request.home_team} {score} {request.away_team}. "
                f"{clutch_points} pontos clutch e {lead_changes} viradas de lideranca."
            ),
        },
    )
