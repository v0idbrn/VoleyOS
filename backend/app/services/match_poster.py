"""Module 30 - escaped SVG match poster for stories and feeds."""

from __future__ import annotations

import hashlib
import re
from html import escape
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.services.integrity_seal import build_seal

THEMES: dict[str, tuple[str, str, str]] = {
    "obsidian": ("#0B0B0F", "#FF3B5C", "#F5F5F7"),
    "crimson": ("#2A0A12", "#FF3355", "#FFF4F6"),
    "volt": ("#0A0F0A", "#C6FF00", "#F4FFE0"),
}
ROOM_PATTERN = re.compile(r"^[A-Za-z0-9-]+$")


class PosterPeriod(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    home: int = Field(ge=0, le=99)
    away: int = Field(ge=0, le=99)


class MatchPosterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    home_team: str = Field(min_length=1, max_length=60)
    away_team: str = Field(min_length=1, max_length=60)
    sets_home: int = Field(default=0, ge=0, le=5)
    sets_away: int = Field(default=0, ge=0, le=5)
    periods: list[PosterPeriod] = Field(min_length=1, max_length=5)
    tournament: str = Field(default="", max_length=80)
    mvp: str = Field(default="", max_length=80)
    room_id: str = Field(default="", max_length=20)
    theme: Literal["obsidian", "crimson", "volt"] = "obsidian"
    format: Literal["story", "feed"] = "story"

    @field_validator("room_id")
    @classmethod
    def _safe_room(cls, value: str) -> str:
        if value and not ROOM_PATTERN.fullmatch(value):
            raise ValueError("room_id only accepts letters, digits and hyphens")
        return value


class MatchPosterReport(BaseModel):
    width: int
    height: int
    theme: str
    format: str
    room_matrix: list[str]
    svg: str
    filename: str
    seal: str
    sha256: str
    message: str


def _room_matrix(value: str) -> list[str]:
    digest = hashlib.sha256(value.encode()).hexdigest()
    return [str(int(char, 16) % 2) for char in digest[:25]]


def build_match_poster(request: MatchPosterRequest) -> MatchPosterReport:
    background, accent, text = THEMES[request.theme]
    width, height = (1080, 1920) if request.format == "story" else (1080, 1080)
    payload = request.model_dump(mode="json")
    seal = build_seal(payload)
    matrix = _room_matrix(request.room_id or seal.sha256)
    home = escape(request.home_team)
    away = escape(request.away_team)
    tournament = escape(request.tournament or "VOLLEYOS ARENA")
    mvp = escape(request.mvp or "MVP DEL PARTIDO")
    room = escape(request.room_id or "VOS-ROOM")
    period_text = "  ".join(
        f"{period.home}-{period.away}" for period in request.periods
    )
    score_y = 720 if request.format == "story" else 500
    matrix_y = score_y + 260
    cells = "".join(
        (
            f'<rect x="{120 + (index % 5) * 46}" y="{matrix_y + (index // 5) * 46}" '
            f'width="34" height="34" rx="6" fill="{accent}" '
            f'opacity="{0.25 + int(cell) * 0.55}"/>'
        )
        for index, cell in enumerate(matrix)
    )
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" '
        f'height="{height}" viewBox="0 0 {width} {height}" role="img">'
        f'<title>{home} vs {away}</title>'
        f'<rect width="{width}" height="{height}" fill="{background}"/>'
        f'<circle cx="{width - 90}" cy="110" r="220" fill="{accent}" opacity="0.12"/>'
        f'<text x="90" y="150" fill="{accent}" font-family="Arial, sans-serif" '
        f'font-size="34" letter-spacing="8">{tournament}</text>'
        f'<text x="90" y="330" fill="{text}" font-family="Arial, sans-serif" '
        f'font-size="62" font-weight="700">{home}</text>'
        f'<text x="90" y="430" fill="{accent}" font-family="Arial, sans-serif" '
        f'font-size="46" font-weight="700">SETS {request.sets_home} - '
        f'{request.sets_away}</text>'
        f'<text x="90" y="530" fill="{text}" font-family="Arial, sans-serif" '
        f'font-size="62" font-weight="700">{away}</text>'
        f'<text x="90" y="{score_y}" fill="{text}" font-family="Arial, sans-serif" '
        f'font-size="48" letter-spacing="6">{period_text}</text>'
        f'<rect x="90" y="{score_y + 70}" width="900" height="120" rx="24" '
        f'fill="{accent}" opacity="0.18"/>'
        f'<text x="120" y="{score_y + 145}" fill="{text}" '
        f'font-family="Arial, sans-serif" font-size="38" font-weight="700">MVP '
        f'{mvp}</text>'
        f'<text x="90" y="{matrix_y - 40}" fill="{text}" '
        f'font-family="Arial, sans-serif" font-size="30">SALA {room}</text>'
        f"{cells}"
        f'<text x="90" y="{height - 110}" fill="{accent}" '
        f'font-family="Arial, sans-serif" font-size="28" letter-spacing="4">'
        f"VOLLEYOS // MATCH POSTER</text>"
        f'<text x="90" y="{height - 60}" fill="{text}" opacity="0.72" '
        f'font-family="Arial, sans-serif" font-size="24">{seal.seal}</text>'
        f"</svg>"
    )
    return MatchPosterReport(
        width=width,
        height=height,
        theme=request.theme,
        format=request.format,
        room_matrix=matrix,
        svg=svg,
        filename=f"volleyos-match-poster-{request.format}.svg",
        seal=seal.seal,
        sha256=seal.sha256,
        message=(
            "Poster SVG generado con nombres escapados, sello HMAC y matriz "
            "de sala para compartir en historia o feed."
        ),
    )

