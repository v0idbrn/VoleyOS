"""Module 42 - signed QR sync token with a deterministic SVG matrix."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

QrKind = Literal["match", "rotation", "player"]
QrSize = Literal[21, 29]
PAYLOAD_LIMIT = 30
MARGIN = 16
MODULE = 8
FINDER = 7


class QrSyncRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    kind: QrKind
    payload: dict[str, str | int | bool] = Field(max_length=PAYLOAD_LIMIT)
    matrix_size: QrSize = 21


class QrSyncReport(BaseModel):
    token: str
    signature: str
    checksum: str
    matrix_size: int
    svg: str
    byte_length: int
    message: str


def _secret() -> str:
    return os.environ.get("INTEGRITY_SEAL_SECRET", "volleyos-dev-seal")


def _canonical(payload: dict[str, str | int | bool]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def _signature(canonical: str) -> str:
    return hmac.new(
        _secret().encode(), canonical.encode(), hashlib.sha256
    ).hexdigest()[:12]


def _token(canonical: str, signature: str) -> str:
    raw = f"{canonical}|{signature}".encode()
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _bitstream(seed: bytes, needed: int) -> bytes:
    blocks = (needed + 31) // 32
    return b"".join(
        hashlib.sha256(seed + index.to_bytes(4, "big")).digest() for index in range(blocks)
    )[:needed]


def _in_finder(size: int, row: int, col: int) -> bool:
    return (
        (row < FINDER and col < FINDER)
        or (row < FINDER and col >= size - FINDER)
        or (row >= size - FINDER and col < FINDER)
    )


def _finder_bit(size: int, row: int, col: int) -> int:
    if row < FINDER and col < FINDER:
        local_row, local_col = row, col
    elif row < FINDER:
        local_row, local_col = row, col - (size - FINDER)
    else:
        local_row, local_col = row - (size - FINDER), col
    if (
        local_row in (0, 6)
        or local_col in (0, 6)
        or (2 <= local_row <= 4 and 2 <= local_col <= 4)
    ):
        return 1
    return 0


def _svg(size: int, seed: bytes) -> str:
    needed = (size * size + 7) // 8
    stream = _bitstream(seed, needed)
    cells: list[str] = []
    for row in range(size):
        for col in range(size):
            if _in_finder(size, row, col):
                bit = _finder_bit(size, row, col)
            else:
                index = row * size + col
                bit = (stream[index // 8] >> (index % 8)) & 1
            if bit:
                cells.append(
                    f'<rect x="{MARGIN + col * MODULE}" '
                    f'y="{MARGIN + row * MODULE}" width="{MODULE}" height="{MODULE}"/>'
                )
    pixels = size * MODULE + MARGIN * 2
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{pixels}" height="{pixels}" '
        f'viewBox="0 0 {pixels} {pixels}" role="img">'
        f"<title>VolleyOS QR sync</title>"
        f'<rect width="{pixels}" height="{pixels}" fill="#ffffff"/>'
        f'<g fill="#000000">{"".join(cells)}</g>'
        f"</svg>"
    )


def build_qr_sync(request: QrSyncRequest) -> QrSyncReport:
    canonical = _canonical(request.payload)
    signature = _signature(canonical)
    token = _token(canonical, signature)
    checksum = hashlib.sha256(canonical.encode()).hexdigest()
    seed = hashlib.sha256(f"{canonical}|{signature}".encode()).digest()
    return QrSyncReport(
        token=token,
        signature=signature,
        checksum=checksum,
        matrix_size=request.matrix_size,
        svg=_svg(request.matrix_size, seed),
        byte_length=len(token.encode("ascii")),
        message=(
            f"QR {request.kind} de {request.matrix_size}x{request.matrix_size} "
            "firmado con HMAC-SHA256."
        ),
    )
