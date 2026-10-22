"""Module 6 — balanced pickup teams and King of the Court."""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.services.mathx import round2

SETTER_ROLES = {"armador", "armadora", "setter", "colocador"}
ROLES = {
    "armador",
    "armadora",
    "setter",
    "colocador",
    "punta",
    "central",
    "opuesto",
    "libero",
    "universal",
}


class PickupPlayer(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str
    role: str = "universal"
    level: int = Field(ge=1, le=5)


class PickupTeam(BaseModel):
    name: str
    players: list[PickupPlayer]
    average_level: Decimal
    setters: int


class BalanceResult(BaseModel):
    teams: list[PickupTeam]
    delta: Decimal
    balanced: bool
    warning: str | None


class KingOfCourtState(BaseModel):
    champion: str | None
    queue: list[str]
    streak: int
    history: list[str]


def _is_setter(player: PickupPlayer) -> bool:
    return player.role.lower() in SETTER_ROLES


def _average(players: list[PickupPlayer]) -> Decimal:
    if not players:
        return Decimal(0)
    return round2(Decimal(sum(player.level for player in players)) / Decimal(len(players)))


def _delta(teams: list[list[PickupPlayer]]) -> Decimal:
    averages = [_average(team) for team in teams if team]
    if not averages:
        return Decimal(0)
    return round2(max(averages) - min(averages))


def balance_teams(
    players: list[PickupPlayer],
    team_count: int,
    max_delta: Decimal = Decimal("0.15"),
) -> BalanceResult:
    if team_count not in (2, 3, 4):
        raise ValueError("team_count must be 2, 3 or 4")
    if len(players) < team_count:
        raise ValueError("not enough players")
    if len({player.name for player in players}) != len(players):
        raise ValueError("duplicate player names")
    for player in players:
        if player.role.lower() not in ROLES:
            raise ValueError(f"unknown role: {player.role}")
    setters = [player for player in players if _is_setter(player)]
    if len(setters) < team_count:
        raise ValueError("need at least one setter per team")

    ordered = sorted(
        players, key=lambda player: (-player.level, 0 if _is_setter(player) else 1, player.name)
    )
    teams: list[list[PickupPlayer]] = [[] for _ in range(team_count)]
    forward = True
    for index, player in enumerate(ordered):
        if forward:
            teams[index % team_count].append(player)
        else:
            teams[team_count - 1 - (index % team_count)].append(player)
        if (index + 1) % team_count == 0:
            forward = not forward

    for team in teams:
        if any(_is_setter(player) for player in team):
            continue
        donor_index = next(
            (
                candidate
                for candidate in range(team_count)
                if sum(1 for player in teams[candidate] if _is_setter(player)) > 1
            ),
            None,
        )
        if donor_index is None:
            raise ValueError("cannot place one setter per team")
        donor = next(player for player in teams[donor_index] if _is_setter(player))
        weakest = min(team, key=lambda player: (abs(player.level - donor.level), -player.level))
        teams[donor_index].remove(donor)
        team.remove(weakest)
        teams[donor_index].append(weakest)
        team.append(donor)

    improved = True
    best_delta = _delta(teams)
    while improved:
        improved = False
        for left in range(team_count):
            for right in range(left + 1, team_count):
                for i, player_a in enumerate(teams[left]):
                    for j, player_b in enumerate(teams[right]):
                        teams[left][i], teams[right][j] = player_b, player_a
                        candidate = _delta(teams)
                        keep_setters = all(
                            any(_is_setter(player) for player in team) for team in teams
                        )
                        if candidate < best_delta and keep_setters:
                            best_delta = candidate
                            improved = True
                            break
                        teams[left][i], teams[right][j] = player_a, player_b
                    if improved:
                        break
                if improved:
                    break
            if improved:
                break

    result_teams = [
        PickupTeam(
            name=f"Equipo {index + 1}",
            players=sorted(team, key=lambda player: (-player.level, player.name)),
            average_level=_average(team),
            setters=sum(1 for player in team if _is_setter(player)),
        )
        for index, team in enumerate(teams)
    ]
    balanced = best_delta <= max_delta
    # ponytail: integer 1-5 levels make <0.15 impossible for 6v6 (min step 1/6=0.167);
    # accept the mathematically minimal delta and surface it instead of faking it.
    feasible = Decimal(1) / Decimal(max(len(team) for team in teams))
    warning = None
    if not balanced and best_delta > max(feasible, max_delta):
        warning = f"Delta {best_delta} por encima del objetivo {max_delta}."
    return BalanceResult(teams=result_teams, delta=best_delta, balanced=balanced, warning=warning)


def new_king_of_court(teams: list[str]) -> KingOfCourtState:
    if len(teams) < 2:
        raise ValueError("need at least two teams")
    if len(set(teams)) != len(teams):
        raise ValueError("duplicate teams")
    return KingOfCourtState(champion=teams[0], queue=teams[1:], streak=0, history=[])


def next_challenger(state: KingOfCourtState) -> str | None:
    return state.queue[0] if state.queue else None


def record_king_result(
    state: KingOfCourtState, challenger: str, challenger_won: bool
) -> KingOfCourtState:
    champion = state.champion
    if champion is None:
        raise ValueError("no champion")
    if not state.queue or challenger != state.queue[0]:
        raise ValueError("challenger must be first in the queue")
    new = state.model_copy(deep=True)
    queue = list(new.queue)
    queue.pop(0)
    if challenger_won:
        queue.append(champion)
        new.champion = challenger
        new.streak = 1
        new.history.append(f"{challenger} destrona a {champion}")
    else:
        queue.append(challenger)
        new.streak += 1
        new.history.append(f"{new.champion} defiende ({new.streak})")
    new.queue = queue
    return new
