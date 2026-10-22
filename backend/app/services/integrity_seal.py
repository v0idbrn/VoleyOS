"""Module 17 - canonical HMAC seal and tamper verification."""

from __future__ import annotations

import hashlib
import hmac
import json
import os
from collections.abc import Mapping
from decimal import Decimal
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class SealRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    payload: dict[str, Any]
    action: Literal["sign"] = "sign"


class SealReport(BaseModel):
    seal: str
    sha256: str
    canonical: str
    message: str


class VerifySealRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    payload: dict[str, Any]
    seal: str = Field(min_length=9, max_length=80)
    action: Literal["verify"] = "verify"
    original: dict[str, Any] | None = None


class VerifySealReport(BaseModel):
    tampered: bool
    expected_seal: str
    provided_seal: str
    changed_fields: list[str]
    message: str


def _default(value: Any) -> str:
    if isinstance(value, Decimal):
        return str(value)
    raise TypeError(f"non-canonical value: {type(value).__name__}")


def canonical_json(payload: Mapping[str, Any]) -> str:
    return json.dumps(
        payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=_default
    )


def seal_secret() -> str:
    return os.environ.get("INTEGRITY_SEAL_SECRET", "volleyos-integrity-dev")


def _seal_digest(canonical: str) -> str:
    return hmac.new(seal_secret().encode(), canonical.encode(), hashlib.sha256).hexdigest()


def build_seal(payload: dict[str, Any]) -> SealReport:
    canonical = canonical_json(payload)
    digest = _seal_digest(canonical)
    public = hashlib.sha256(canonical.encode()).hexdigest()
    return SealReport(
        seal=f"VOS-SEAL-{digest[:32].upper()}",
        sha256=public,
        canonical=canonical,
        message="Sello HMAC-SHA256 emitido sobre JSON can?nico ordenado.",
    )


def _diff(original: Any, current: Any, prefix: str = "") -> list[str]:
    changed: list[str] = []
    if isinstance(original, Mapping) and isinstance(current, Mapping):
        keys = sorted(set(original) | set(current))
        for key in keys:
            path = f"{prefix}.{key}" if prefix else str(key)
            if key not in original or key not in current:
                changed.append(path)
            else:
                changed.extend(_diff(original[key], current[key], path))
        return changed
    if original != current:
        changed.append(prefix or "payload")
    return changed


def verify_seal(
    payload: dict[str, Any], seal: str, original: dict[str, Any] | None = None
) -> VerifySealReport:
    report = build_seal(payload)
    tampered = not hmac.compare_digest(report.seal, seal.strip().upper())
    changed = _diff(original, payload) if original is not None else []
    if tampered and not changed:
        changed = ["payload"]
    return VerifySealReport(
        tampered=tampered,
        expected_seal=report.seal,
        provided_seal=seal.strip().upper(),
        changed_fields=changed,
        message=(
            "Acta alterada: el sello no coincide."
            if tampered
            else "Sello v?lido: el acta conserva su integridad."
        ),
    )
