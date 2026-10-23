import base64
import hashlib
import hmac

import pytest
from pydantic import ValidationError

from app.services.qr_sync import QrSyncRequest, build_qr_sync


def test_token_signature_and_checksum_are_deterministic() -> None:
    request = QrSyncRequest(kind="match", payload={"match": "A-1", "set": 2})
    first = build_qr_sync(request)
    second = build_qr_sync(request)
    assert first.token == second.token
    assert first.signature == second.signature
    assert first.checksum == second.checksum
    assert first.svg == second.svg


def test_signature_matches_hmac_of_canonical_payload(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("INTEGRITY_SEAL_SECRET", raising=False)
    report = build_qr_sync(
        QrSyncRequest(kind="rotation", payload={"a": 1, "b": "x"})
    )
    canonical = '{"a":1,"b":"x"}'
    expected = hmac.new(
        b"volleyos-dev-seal", canonical.encode(), hashlib.sha256
    ).hexdigest()[:12]
    assert report.signature == expected
    assert report.checksum == hashlib.sha256(canonical.encode()).hexdigest()
    assert report.token == base64.urlsafe_b64encode(
        f"{canonical}|{expected}".encode()
    ).decode().rstrip("=")


def test_token_is_unpadded_urlsafe_base64() -> None:
    report = build_qr_sync(QrSyncRequest(kind="player", payload={"name": "Ana"}))
    assert "=" not in report.token
    assert report.token == report.token.rstrip("=")
    assert report.byte_length == len(report.token.encode("ascii"))
    assert len(report.signature) == 12
    assert len(report.checksum) == 64
    int(report.signature, 16)
    int(report.checksum, 16)


def test_svg_has_finder_patterns_and_requested_size() -> None:
    report = build_qr_sync(QrSyncRequest(kind="match", payload={"id": "X"}))
    assert report.matrix_size == 21
    assert report.svg.startswith("<svg")
    assert report.svg.endswith("</svg>")
    assert '<rect width="200" height="200" fill="#ffffff"/>' in report.svg
    assert report.svg.count("<rect") >= 3


def test_matrix_size_29_and_payload_change() -> None:
    base = build_qr_sync(QrSyncRequest(kind="match", payload={"id": "X"}))
    large = build_qr_sync(
        QrSyncRequest(kind="match", payload={"id": "X"}, matrix_size=29)
    )
    changed = build_qr_sync(QrSyncRequest(kind="match", payload={"id": "Y"}))
    assert large.matrix_size == 29
    assert 'viewBox="0 0 264 264"' in large.svg
    assert large.svg != base.svg
    assert changed.signature != base.signature


def test_validation_bounds() -> None:
    with pytest.raises(ValidationError):
        QrSyncRequest(kind="match", payload={f"k{i}": i for i in range(31)})
    with pytest.raises(ValidationError):
        QrSyncRequest(kind="match", payload={"a": 1}, matrix_size=25)
    with pytest.raises(ValidationError):
        QrSyncRequest(kind="referee", payload={"a": 1})
    with pytest.raises(ValidationError):
        QrSyncRequest(kind="match", payload={"a": 1}, extra="x")
