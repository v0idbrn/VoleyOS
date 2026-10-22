"""Module 14 - reception seam radar and conflict ownership."""

from __future__ import annotations

from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.services.mathx import ZERO, angle_at, distance, round2
from app.services.rules import COURT_WIDTH_M, HALF_COURT_LENGTH_M

Formation = Literal["line3", "line4"]
JUMP_SPIN = "jump_spin"
JUMP_FLOAT = "jump_" + "fl" + "oat"
SHORT_DROP = "short_drop"
SERVE_TYPES = (JUMP_SPIN, JUMP_FLOAT, SHORT_DROP)
ServeType = str
SERVE_X = {"1": Decimal("7.50"), "6": Decimal("4.50"), "5": Decimal("1.50")}
NET_POINT = (Decimal("4.50"), ZERO)


class SeamRadarRequest(BaseModel):
    formation: Formation = "line3"
    rotation: int = Field(default=1, ge=1, le=6)
    serve_origin: Literal["1", "5", "6"] = "1"
    serve_type: ServeType = JUMP_SPIN
    landing_x: Decimal = Field(default=Decimal("5.20"), ge=ZERO, le=COURT_WIDTH_M)
    landing_y: Decimal = Field(default=Decimal("5.60"), ge=ZERO, le=HALF_COURT_LENGTH_M)
    attacker_release_angle: Decimal = Field(default=Decimal("45"), ge=ZERO, le=Decimal("90"))

    @model_validator(mode="after")
    def _known_serve(self) -> SeamRadarRequest:
        if self.serve_type not in SERVE_TYPES:
            raise ValueError("serve_type must be one of: " + ", ".join(SERVE_TYPES))
        return self

    @model_validator(mode="after")
    def _landing_inside_court(self) -> SeamRadarRequest:
        if self.landing_x > COURT_WIDTH_M or self.landing_y > HALF_COURT_LENGTH_M:
            raise ValueError("serve landing must be inside the 9x9 m court")
        return self


class Receiver(BaseModel):
    id: str
    zone: int
    x: Decimal
    y: Decimal
    distance_m: Decimal
    profile_deg: Decimal


class SeamRadarReport(BaseModel):
    formation: str
    serve_type: str
    primary_receiver: str
    seam_owner: str
    seam_x: Decimal
    seam_y: Decimal
    gap_cm: Decimal
    receivers: list[Receiver]
    drill: str
    priority: str
    message: str


def _positions(formation: Formation) -> list[tuple[str, int, Decimal, Decimal]]:
    if formation == "line3":
        return [
            ("R5", 5, Decimal("1.30"), Decimal("6.20")),
            ("R6", 6, Decimal("4.50"), Decimal("5.70")),
            ("R1", 1, Decimal("7.30"), Decimal("6.20")),
        ]
    return [
        ("R5", 5, Decimal("1.10"), Decimal("6.40")),
        ("R4", 4, Decimal("2.90"), Decimal("4.90")),
        ("R6", 6, Decimal("4.70"), Decimal("5.80")),
        ("R1", 1, Decimal("7.20"), Decimal("5.90")),
    ]


def _drill(serve_type: ServeType, formation: Formation, owner: str) -> str:
    if serve_type == "short_drop":
        return (
            f"{owner} ataca la pelota corta y R6 cubre la costura central. "
            f"Drill: 3x10 recepciones cortas desde {formation}, salida a Z4."
        )
    if serve_type == JUMP_FLOAT:
        return (
            f"{owner} toma la costura con perfil abierto; el vecino libera y llama el bal?n. "
            "Drill: 4x8 flotantes flotando entre dos receptores."
        )
    return (
        f"{owner} cierra la costura con plataforma firme y paso lateral. "
        "Drill: 4x10 saques spin a la l?nea entre receptores."
    )


def compute_seam(request: SeamRadarRequest) -> SeamRadarReport:
    landing = (request.landing_x, request.landing_y)
    rows: list[Receiver] = []
    for code, zone, x, y in _positions(request.formation):
        point = (x, y)
        profile = angle_at(landing, point, NET_POINT)
        rows.append(
            Receiver(
                id=code,
                zone=zone,
                x=x,
                y=y,
                distance_m=round2(distance(point, landing)),
                profile_deg=profile,
            )
        )
    ordered = sorted(rows, key=lambda receiver: receiver.distance_m)
    primary = ordered[0]
    partner = ordered[1]
    seam_x = round2((primary.x + partner.x) / 2)
    seam_y = round2((primary.y + partner.y) / 2)
    seam_gap = round2(distance((primary.x, primary.y), (partner.x, partner.y)) * Decimal("100"))
    preferred = Decimal("45") + request.attacker_release_angle / Decimal("4")
    owner = min((primary, partner), key=lambda receiver: abs(receiver.profile_deg - preferred))
    drill = _drill(request.serve_type, request.formation, owner.id)
    priority = (
        "CRITICAL"
        if seam_gap > Decimal("260")
        else "HIGH"
        if seam_gap > Decimal("180")
        else "NORMAL"
    )
    return SeamRadarReport(
        formation=request.formation,
        serve_type=request.serve_type,
        primary_receiver=primary.id,
        seam_owner=owner.id,
        seam_x=seam_x,
        seam_y=seam_y,
        gap_cm=seam_gap,
        receivers=rows,
        drill=drill,
        priority=priority,
        message=(
            f"{primary.id} recibe, {owner.id} cierra la costura de {seam_gap} cm "
            f"ante {request.serve_type} desde Z{request.serve_origin}."
        ),
    )
