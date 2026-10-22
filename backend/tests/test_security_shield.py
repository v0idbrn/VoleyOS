from __future__ import annotations

import json

import pytest
from fastapi.testclient import TestClient

from app.api.store import sign
from app.main import app
from app.security import reset_rate_limits
from app.services.excel_exporter import export_csv, export_xlsx
from app.services.integrity_seal import build_seal, verify_seal

client = TestClient(app)


@pytest.fixture(autouse=True)
def _clean_rate_state() -> None:
    reset_rate_limits()


def test_extra_fields_cannot_inject_payment_state() -> None:
    response = client.post(
        "/api/v1/jobs",
        json={"module": "scouting", "title": "Hack", "is_paid": True},
    )
    assert response.status_code == 422


def test_payload_over_256kb_is_rejected() -> None:
    response = client.post(
        "/api/v1/modules/var/run",
        content=b"{" + b"x" * 300_000 + b"}",
        headers={"Content-Type": "application/json"},
    )
    assert response.status_code == 413


def test_xss_is_sanitised_in_module_payloads() -> None:
    response = client.post(
        "/api/v1/modules/tournament/run",
        json={"teams": ["<script>alert(1)</script>Tiburones", "CONDORES"], "matches": []},
    )
    assert response.status_code == 200
    text = response.text
    assert "<script>" not in text
    assert "Tiburones" in text


def test_formula_injection_is_neutralised_in_exports() -> None:
    rows = [{"Jugador": "=CMD|'/C calc'!A0", "Puntos": 12}]
    csv_bytes = export_csv([dict(rows[0])])
    assert b"'=CMD" in csv_bytes
    assert b"\n=CMD" not in csv_bytes
    xlsx = export_xlsx(
        kind="scouting", title="Injection", summary={"ok": "1"}, rows=[dict(rows[0])]
    )
    assert xlsx[:2] == b"PK"


def test_seal_tamper_after_one_point_change() -> None:
    original = {"match": "TIB-CON", "set": 2, "score": {"home": 25, "away": 24}}
    seal = build_seal(original).seal
    changed = {"match": "TIB-CON", "set": 2, "score": {"home": 26, "away": 24}}
    report = verify_seal(changed, seal, original)
    assert report.tampered is True
    assert report.changed_fields


def test_verify_seal_endpoint_rejects_modified_payload() -> None:
    original = {"match": "TIB-CON", "score": {"home": 25, "away": 23}}
    seal = build_seal(original).seal
    ok = client.post("/api/v1/security/verify-seal", json={"payload": original, "seal": seal})
    assert ok.status_code == 200
    assert ok.json()["tampered"] is False
    bad = client.post(
        "/api/v1/security/verify-seal",
        json={"payload": {"match": "TIB-CON", "score": {"home": 26, "away": 23}}, "seal": seal},
    )
    assert bad.status_code == 200
    assert bad.json()["tampered"] is True


def test_owasp_headers_present() -> None:
    response = client.get("/")
    assert response.headers["content-security-policy"].startswith("default-src 'self'")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "SAMEORIGIN"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert "camera=(self)" in response.headers["permissions-policy"]


def test_rate_limit_returns_429_and_retry_after(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("VOLLEYOS_RATE_LIMIT", "2")
    reset_rate_limits()
    assert client.post("/api/v1/modules/tempo/run", json={}).status_code == 200
    assert client.post("/api/v1/modules/tempo/run", json={}).status_code == 200
    response = client.post("/api/v1/modules/tempo/run", json={})
    assert response.status_code == 429
    assert int(response.headers["retry-after"]) >= 1


def test_webhook_constant_time_signature_still_works() -> None:
    created = client.post(
        "/api/v1/jobs",
        json={"module": "scouting", "title": "Signed", "rows": [{"Jugador": 7}]},
    )
    job_id = created.json()["job"]["job_id"]
    raw = json.dumps({"event": "paid", "job_id": job_id}).encode()
    response = client.post(
        "/api/v1/jobs/webhook/payment",
        content=raw,
        headers={"X-VolleyOS-Signature": sign(raw), "Content-Type": "application/json"},
    )
    assert response.status_code == 200
    assert response.json()["is_paid"] is True
