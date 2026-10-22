"""Module 28 - verifiable 14-player roster pass for the scoring table."""

from __future__ import annotations

import hmac
from typing import Literal, Self

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.services.integrity_seal import build_seal

Role = Literal["setter", "outside", "middle", "opposite", "libero"]


class RosterPlayer(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=1, max_length=80)
    number: int = Field(ge=1, le=99)
    role: Role
    is_captain: bool = False
    is_libero: bool = False


class RosterRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    team: str = Field(min_length=1, max_length=80)
    tournament: str = Field(default="", max_length=80)
    players: list[RosterPlayer] = Field(min_length=6, max_length=14)

    @model_validator(mode="after")
    def _fivb_rules(self) -> Self:
        numbers = [player.number for player in self.players]
        if len(set(numbers)) != len(numbers):
            raise ValueError("dorsal numbers must be unique")
        liberos = [player for player in self.players if player.is_libero]
        if len(liberos) > 2:
            raise ValueError("a roster accepts at most two liberos")
        captains = [player for player in self.players if player.is_captain]
        if len(captains) != 1:
            raise ValueError("exactly one captain is required")
        if captains[0].is_libero:
            raise ValueError("the captain cannot be the libero")
        return self


class RosterPlayerReport(BaseModel):
    name: str
    number: int
    role: str
    is_captain: bool
    is_libero: bool


class RosterReport(BaseModel):
    team: str
    tournament: str
    players: list[RosterPlayerReport]
    captain: str
    liberos: int
    pass_code: str
    seal: str
    sha256: str
    checks: list[str]
    message: str


def _seal_payload(request: RosterRequest) -> dict[str, object]:
    return {
        "team": request.team,
        "tournament": request.tournament,
        "players": [
            player.model_dump(mode="json")
            for player in sorted(request.players, key=lambda item: item.number)
        ],
    }


def build_roster_pass(request: RosterRequest) -> RosterReport:
    seal = build_seal(_seal_payload(request))
    digest = seal.seal.removeprefix("VOS-SEAL-")
    return RosterReport(
        team=request.team,
        tournament=request.tournament,
        players=[
            RosterPlayerReport(
                name=player.name,
                number=player.number,
                role=player.role,
                is_captain=player.is_captain,
                is_libero=player.is_libero,
            )
            for player in sorted(request.players, key=lambda item: item.number)
        ],
        captain=next(
            player.name for player in request.players if player.is_captain
        ),
        liberos=sum(1 for player in request.players if player.is_libero),
        pass_code=f"VOS-ROSTER-{digest[:24]}",
        seal=seal.seal,
        sha256=seal.sha256,
        checks=[
            "dorsales_unicos",
            "maximo_dos_liberos",
            "capitan_unico",
            "capitan_no_libero",
        ],
        message=(
            "Pase de plantel verificado: dorsales unicos, liberos y capitan "
            "conformes al reglamento para entregar en mesa."
        ),
    )


def verify_roster_pass(request: RosterRequest, pass_code: str) -> bool:
    expected = build_roster_pass(request).pass_code
    return hmac.compare_digest(expected, pass_code.strip().upper())
