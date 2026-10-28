"""Module 24 - MVP and third-half awards with a sealed share card."""

from __future__ import annotations

from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.services.integrity_seal import build_seal

ZERO = Decimal("0")


class PlayerStats(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=80)
    team: str = "Equipo"
    points: int = Field(default=0, ge=0, le=999)
    blocks: int = Field(default=0, ge=0, le=999)
    aces: int = Field(default=0, ge=0, le=999)
    digs: int = Field(default=0, ge=0, le=999)
    assists: int = Field(default=0, ge=0, le=999)
    errors: int = Field(default=0, ge=0, le=999)
    pressure_points: int = Field(default=0, ge=0, le=999)
    votes: int = Field(default=0, ge=0, le=999)
    is_libero: bool = False


class MvpRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    match: str = "Partido VolleyOS"
    players: list[PlayerStats] = Field(default_factory=list)


class Award(BaseModel):
    key: str
    label: str
    emoji: str
    winner: str
    team: str
    metric: str
    value: str
    message: str


class MvpReport(BaseModel):
    match: str
    awards: list[Award]
    mvp_score: str
    card: str
    share_text: str
    seal: str
    sha256: str
    message: str


def _score(player: PlayerStats) -> Decimal:
    return (
        Decimal(player.points)
        + Decimal(player.blocks) * Decimal("1.5")
        + Decimal(player.aces) * Decimal("1.3")
        + Decimal(player.digs) * Decimal("0.6")
        + Decimal(player.assists) * Decimal("0.5")
        + Decimal(player.votes) * Decimal("2")
        + Decimal(player.pressure_points) * Decimal("1.2")
        - Decimal(player.errors) * Decimal("0.5")
    )


def _best(players: list[PlayerStats], metric: str) -> tuple[PlayerStats, Decimal]:
    def value(player: PlayerStats) -> Decimal:
        if metric == "score":
            return _score(player)
        if metric == "blocks":
            return Decimal(player.blocks) + (Decimal("0.1") if player.is_libero else ZERO)
        if metric == "digs":
            return Decimal(player.digs) + (Decimal("2") if player.is_libero else ZERO)
        if metric == "aces":
            return Decimal(player.aces)
        if metric == "assists":
            return Decimal(player.assists)
        return Decimal(player.pressure_points)

    winner = max(players, key=lambda player: (value(player), player.name))
    return winner, value(winner)


AWARDS: tuple[tuple[str, str, str, str, str], ...] = (
    ("MVP", "MVP Global", "🏆", "score", "Mejor rendimiento global del partido."),
    ("WALL", "El Muro", "🧱", "blocks", "Mayor cantidad de bloqueos."),
    ("LOCK", "El Candado", "🛡️", "digs", "Defensa más confiable, con bonus para líbero."),
    ("SNIPER", "Francotirador", "🎯", "aces", "Saque más letal del encuentro."),
    ("BUILDER", "El Albañil", "👷", "assists", "Más asistencias y construcción de juego."),
    ("ICE", "Sangre Fría 24-24", "🧊", "pressure_points", "Puntos en los momentos más calientes."),
)


def award_mvp(request: MvpRequest) -> MvpReport:
    if not request.players:
        raise ValueError("at least one player is required")
    awards: list[Award] = []
    for key, label, emoji, metric, description in AWARDS:
        winner, value = _best(request.players, metric)
        awards.append(
            Award(
                key=key,
                label=label,
                emoji=emoji,
                winner=winner.name,
                team=winner.team,
                metric=metric,
                value=str(value.normalize()),
                message=f"{description} {winner.name} ({winner.team}).",
            )
        )

    mvp = awards[0]
    card_lines = [
        f"🏐 {request.match}",
        "",
    ]
    for award in awards:
        card_lines.append(f"{award.emoji} {award.label}: {award.winner} ({award.team})")
    card = "\n".join(card_lines)
    payload = {
        "match": request.match,
        "awards": [
            {
                "key": award.key,
                "winner": award.winner,
                "team": award.team,
                "value": award.value,
            }
            for award in awards
        ],
    }
    seal = build_seal(payload)
    share_text = f"{card}\n\n{seal.seal}"
    return MvpReport(
        match=request.match,
        awards=awards,
        mvp_score=mvp.value,
        card=card,
        share_text=share_text,
        seal=seal.seal,
        sha256=seal.sha256,
        message=f"Tarjeta de premios sellada. MVP: {mvp.winner}.",
    )
