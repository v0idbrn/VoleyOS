"""Module 20 - FIVB six-substitution tracker (Rules 15.5-15.6)."""

from __future__ import annotations

from dataclasses import dataclass, field

from pydantic import BaseModel, ConfigDict, Field

MAX_SUBS = 6


class SubEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    team: str
    out_number: int = Field(ge=1, le=99)
    in_number: int = Field(ge=1, le=99)
    position: int = Field(ge=1, le=6)
    exceptional: bool = False


class SubstitutionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    set_number: int = Field(default=1, ge=1, le=5)
    substitutions: list[SubEvent] = Field(default_factory=list)


class SubstitutionResult(BaseModel):
    index: int
    team: str
    position: int
    out_number: int
    in_number: int
    status: str
    reason: str
    remaining_subs: int
    exceptional: bool


class SubPair(BaseModel):
    team: str
    position: int
    starter: int
    substitute: int
    status: str


class SubstitutionReport(BaseModel):
    set_number: int
    events: list[SubstitutionResult]
    pairs: list[SubPair]
    remaining_subs: dict[str, int]
    message: str


@dataclass
class _Pair:
    position: int
    starter: int
    substitute: int
    status: str = "open"


@dataclass
class _Team:
    subs: int = 0
    pairs: dict[int, _Pair] = field(default_factory=dict)
    substitutes: set[int] = field(default_factory=set)
    reentered: set[int] = field(default_factory=set)


def _pair_for_sub(team: _Team, number: int) -> _Pair | None:
    return next((pair for pair in team.pairs.values() if pair.substitute == number), None)


def _apply(team: _Team, event: SubEvent) -> tuple[str, str]:
    if event.out_number == event.in_number:
        return "ILLEGAL_SUBSTITUTION", "a player cannot substitute themself"

    pair = team.pairs.get(event.position)
    if event.exceptional:
        if event.in_number in team.substitutes:
            return "ILLEGAL_SUBSTITUTION", "substitute cannot re-enter the same set"
        if pair is not None and pair.status == "closed":
            return "ILLEGAL_SUBSTITUTION", "pair is already closed for this position"
        if pair is not None:
            pair.status = "closed"
        else:
            team.pairs[event.position] = _Pair(
                position=event.position,
                starter=event.out_number,
                substitute=event.in_number,
                status="closed",
            )
        team.substitutes.add(event.in_number)
        return "LEGAL", "exceptional injury substitution does not consume the six-sub limit"

    if team.subs >= MAX_SUBS:
        return "ILLEGAL_SUBSTITUTION", "team already used its six substitutions this set"

    if pair is not None:
        if pair.status == "closed":
            return (
                "ILLEGAL_SUBSTITUTION",
                "pair is closed; substitute cannot re-enter the same set",
            )
        if event.out_number == pair.substitute and event.in_number == pair.starter:
            pair.status = "closed"
            team.reentered.add(pair.starter)
            team.subs += 1
            return "LEGAL", "starter re-enters once for the same substitute at this position"
        return (
            "ILLEGAL_SUBSTITUTION",
            f"position {event.position} is bound to the pair "
            f"#{pair.starter}/#{pair.substitute}",
        )

    existing = _pair_for_sub(team, event.out_number)
    if existing is not None or event.out_number in team.substitutes:
        return (
            "ILLEGAL_SUBSTITUTION",
            f"pair is bound to position {existing.position if existing else event.position}; "
            "the substitute cannot re-enter",
        )
    if event.in_number in team.substitutes:
        return "ILLEGAL_SUBSTITUTION", "substitute cannot re-enter the same set"
    if event.out_number in team.reentered:
        return "ILLEGAL_SUBSTITUTION", "starter already used their one re-entry this set"

    team.pairs[event.position] = _Pair(
        position=event.position,
        starter=event.out_number,
        substitute=event.in_number,
    )
    team.substitutes.add(event.in_number)
    team.subs += 1
    return "LEGAL", "substitution registered inside the FIVB limit"


def track_substitutions(request: SubstitutionRequest) -> SubstitutionReport:
    teams = {"A": _Team(), "B": _Team()}
    results: list[SubstitutionResult] = []
    for index, event in enumerate(request.substitutions, start=1):
        if event.team not in teams:
            raise ValueError("team must be A or B")
        team = teams[event.team]
        status, reason = _apply(team, event)
        results.append(
            SubstitutionResult(
                index=index,
                team=event.team,
                position=event.position,
                out_number=event.out_number,
                in_number=event.in_number,
                status=status,
                reason=reason,
                remaining_subs=MAX_SUBS - team.subs,
                exceptional=event.exceptional,
            )
        )

    pairs = [
        SubPair(
            team=side,
            position=pair.position,
            starter=pair.starter,
            substitute=pair.substitute,
            status=pair.status,
        )
        for side, team in teams.items()
        for pair in sorted(team.pairs.values(), key=lambda item: item.position)
    ]
    remaining = {side: MAX_SUBS - team.subs for side, team in teams.items()}
    illegal = sum(1 for row in results if row.status != "LEGAL")
    message = (
        f"Set {request.set_number}: {len(results)} cambios, {illegal} ilegales. "
        f"Quedan {remaining['A']} cambios A y {remaining['B']} B."
    )
    return SubstitutionReport(
        set_number=request.set_number,
        events=results,
        pairs=pairs,
        remaining_subs=remaining,
        message=message,
    )
