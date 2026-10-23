from __future__ import annotations

import hashlib
import json

import pytest
from fastapi.testclient import TestClient

from app.api.store import sign
from app.main import app
from app.security import reset_rate_limits, verify_license_token
from app.services.excel_exporter import export_csv, export_xlsx
from app.services.integrity_seal import build_seal, verify_seal

client = TestClient(app)
CREATOR_KEY = "TEST-CREATOR-LICENCE-KEY"
CREATOR_DIGEST = hashlib.sha256(CREATOR_KEY.encode()).hexdigest()


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


def _create_unpaid_job() -> str:
    response = client.post(
        "/api/v1/jobs",
        json={
            "module": "scouting",
            "title": "Licencia",
            "summary": {"Ataques": 3, "audit_deep": "pro"},
            "rows": [{"Jugador": 7, "Zona": 4}, {"Jugador": 9, "Zona": 2}],
        },
    )
    assert response.status_code == 200
    return str(response.json()["job"]["job_id"])


def test_fake_license_cannot_download_xlsx() -> None:
    job_id = _create_unpaid_job()
    response = client.get(
        f"/api/v1/jobs/{job_id}/download",
        headers={"X-VoleyOS-License": "VOS-LIC-fake.123"},
    )
    assert response.status_code == 402


def test_unlock_with_fake_creator_key_is_forbidden(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CREATOR_KEY_SHA256", CREATOR_DIGEST)
    response = client.post(
        "/api/v1/security/creator-unlock",
        json={"creator_key": "TEST-CREATOR-WRONG"},
    )
    assert response.status_code == 403


def test_creator_key_issues_license_and_unlocks_download(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CREATOR_KEY_SHA256", CREATOR_DIGEST)
    job_id = _create_unpaid_job()

    locked = client.get(f"/api/v1/jobs/{job_id}/preview").json()
    assert locked["server_pro_audit_locked"] is True
    assert "audit_deep" not in locked["summary"]

    unlock = client.post(
        "/api/v1/security/creator-unlock",
        json={"creator_key": CREATOR_KEY, "job_id": job_id},
    )
    assert unlock.status_code == 200
    body = unlock.json()
    assert body["unlocked"] is True
    assert body["tier"] == "creator_pro"
    assert body["license_token"].startswith("VOS-LIC-")
    assert verify_license_token(body["license_token"]) is True

    paid = client.get(f"/api/v1/jobs/{job_id}/download")
    assert paid.status_code == 200
    assert paid.content.startswith(b"PK")


def test_license_header_authorizes_an_unpaid_report(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CREATOR_KEY_SHA256", CREATOR_DIGEST)
    job_id = _create_unpaid_job()
    unlock = client.post(
        "/api/v1/security/creator-unlock", json={"creator_key": CREATOR_KEY}
    ).json()

    download = client.get(
        f"/api/v1/jobs/{job_id}/download?format=csv",
        headers={"X-VoleyOS-License": unlock["license_token"]},
    )
    assert download.status_code == 200
    assert b"Jugador" in download.content

    preview = client.get(
        f"/api/v1/jobs/{job_id}/preview",
        headers={"X-Creator-Key": CREATOR_KEY},
    ).json()
    assert preview["locked"] is False
    assert "server_pro_audit_locked" not in preview
    assert preview["summary"]["audit_deep"] == "pro"


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
