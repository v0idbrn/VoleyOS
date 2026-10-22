"""Module 18 - portable .volleyos capsule export/import with checksum."""

from __future__ import annotations

import hashlib
import json
import re
from datetime import UTC, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.services.integrity_seal import canonical_json

CAPSULE_VERSION = 2
REQUIRED_KEYS = {"format", "version", "created_at", "title", "checksum", "data"}


class CapsuleRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    action: Literal["export", "import"] = "export"
    title: str = Field(default="VolleyOS Capsule", min_length=1, max_length=80)
    data: dict[str, Any] = Field(default_factory=dict)
    capsule: str | None = Field(default=None, max_length=262144)


class CapsuleReport(BaseModel):
    action: str
    filename: str
    capsule: str
    checksum: str
    bytes: int
    title: str
    data: dict[str, Any]
    message: str


def _checksum(data: dict[str, Any]) -> str:
    return hashlib.sha256(canonical_json(data).encode()).hexdigest()


def _filename(title: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", title.strip()).strip("-").lower() or "volleyos"
    return f"{slug}.volleyos"


def export_capsule(title: str, data: dict[str, Any]) -> CapsuleReport:
    checksum = _checksum(data)
    envelope = {
        "format": "volleyos.capsule",
        "version": CAPSULE_VERSION,
        "created_at": datetime.now(UTC).isoformat(),
        "title": title,
        "checksum": checksum,
        "data": data,
    }
    text = canonical_json(envelope)
    return CapsuleReport(
        action="export",
        filename=_filename(title),
        capsule=text,
        checksum=checksum,
        bytes=len(text.encode("utf-8")),
        title=title,
        data=data,
        message="C?psula .volleyos sellada con SHA-256. Comp?rtela offline.",
    )


def import_capsule(text: str) -> CapsuleReport:
    try:
        envelope = json.loads(text)
    except json.JSONDecodeError as error:
        raise ValueError("capsule is not valid JSON") from error
    if not isinstance(envelope, dict):
        raise ValueError("capsule must be a JSON object")
    if set(envelope) != REQUIRED_KEYS:
        raise ValueError("capsule envelope has missing or unknown fields")
    if envelope.get("format") != "volleyos.capsule":
        raise ValueError("unsupported capsule format")
    if envelope.get("version") != CAPSULE_VERSION:
        raise ValueError("unsupported capsule version")
    data = envelope.get("data")
    if not isinstance(data, dict):
        raise ValueError("capsule data must be an object")
    checksum = _checksum(data)
    if checksum != envelope.get("checksum"):
        raise ValueError("capsule checksum mismatch: file was modified")
    title = str(envelope.get("title", "VolleyOS Capsule"))
    return CapsuleReport(
        action="import",
        filename=_filename(title),
        capsule=text,
        checksum=checksum,
        bytes=len(text.encode("utf-8")),
        title=title,
        data=data,
        message="C?psula importada y verificada: checksum SHA-256 v?lido.",
    )


def run_capsule(request: CapsuleRequest) -> CapsuleReport:
    if request.action == "import":
        if not request.capsule:
            raise ValueError("capsule is required for import")
        return import_capsule(request.capsule)
    if not request.data:
        raise ValueError("data is required for export")
    return export_capsule(request.title, request.data)
