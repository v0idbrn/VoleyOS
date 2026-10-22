from __future__ import annotations

import json
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.api.demo_data import MODULE_SLUGS
from app.api.store import sign
from app.main import app

client = TestClient(app)


def create_job(rows: list[dict[str, Any]] | None = None) -> str:
    response = client.post(
        "/api/v1/jobs",
        json={
            "module": "scouting",
            "title": "Scouting Final",
            "kind": "scouting",
            "summary": {"Ataques": 24, "Eficiencia": "0.42"},
            "rows": rows
            or [
                {"Jugador": 7, "Zona": 4, "Resultado": "KILL", "Eficiencia": "0.50"},
                {"Jugador": 9, "Zona": 2, "Resultado": "ERROR", "Eficiencia": "-0.10"},
            ],
        },
    )
    assert response.status_code == 200
    return str(response.json()["job"]["job_id"])


def signed_webhook(job_id: str, event: str = "paid") -> dict[str, str]:
    raw = json.dumps({"job_id": job_id, "event": event}).encode()
    return {"X-VolleyOS-Signature": sign(raw)}


def test_root_and_privacy_headers() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["license"] == "AGPL-3.0-or-later"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "SAMEORIGIN"
    assert response.headers["referrer-policy"] == "no-referrer"


def test_cors_wildcard() -> None:
    response = client.options(
        "/api/v1/catalog/modules",
        headers={
            "Origin": "https://example.org",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "*"
    assert response.headers.get("access-control-allow-credentials") is None


def test_catalog_has_twenty_four_modules() -> None:
    response = client.get("/api/v1/catalog/modules")
    body = response.json()
    assert response.status_code == 200
    assert body["count"] == 24
    assert {module["slug"] for module in body["modules"]} == set(MODULE_SLUGS)
    assert len(body["pricing"]) == 3


@pytest.mark.parametrize("slug", MODULE_SLUGS)
def test_demo_runs_for_every_module(slug: str) -> None:
    response = client.post(f"/api/v1/modules/{slug}/demo")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["module"] == slug
    assert body["result"]


def test_demo_unknown_module() -> None:
    assert client.post("/api/v1/modules/teleport/demo").status_code == 404


def test_run_biomechanics_demo_input() -> None:
    demo = client.post("/api/v1/modules/biomechanics/demo").json()
    response = client.post("/api/v1/modules/biomechanics/run", json=demo["input"])
    assert response.status_code == 200
    assert response.json()["result"]["score"] == 100


def test_run_unknown_module() -> None:
    assert client.post("/api/v1/modules/nope/run", json={}).status_code == 404


def test_run_invalid_payload() -> None:
    response = client.post("/api/v1/modules/biomechanics/run", json={"frames": []})
    assert response.status_code == 422


def test_scoreboard_demo_rotates_on_side_out() -> None:
    body = client.post("/api/v1/modules/scoreboard/demo").json()["result"]
    assert body["rotated"] is True
    assert body["state"]["serving"] == "B"
    assert body["state"]["score_b"] == 21


def test_rotation_demo_reports_fault() -> None:
    result = client.post("/api/v1/modules/rotation/demo").json()["result"]
    assert result["valid"] is False
    assert result["faults"]


def test_scouting_demo_has_parser_and_report() -> None:
    result = client.post("/api/v1/modules/scouting/demo").json()["result"]
    assert result["parsed"]["player"] == 7
    assert result["report"]["attempts"] > 5
    assert len(result["heatmap"]) == 9


def test_tournament_demo_standings_sorted() -> None:
    result = client.post("/api/v1/modules/tournament/demo").json()["result"]
    positions = [row["position"] for row in result["standings"]]
    assert positions == sorted(positions)
    assert "bracket" in result


def test_pickup_demo_teams_have_setters() -> None:
    result = client.post("/api/v1/modules/pickup/demo").json()["result"]
    assert len(result["teams"]) == 2
    assert all(team["setters"] >= 1 for team in result["teams"])
    assert result["king_of_court"]["champion"] == "Tiburones"


def test_health_deep_all_engines_ok() -> None:
    body = client.get("/api/v1/health/deep").json()
    assert body["status"] == "ok"
    assert body["count"] == 24
    assert all(engine["status"] == "ok" for engine in body["engines"])


def test_job_paywall_flow() -> None:
    job_id = create_job()

    preview = client.get(f"/api/v1/jobs/{job_id}/preview")
    assert preview.status_code == 200
    assert preview.json()["locked"] is True
    assert "rows" not in preview.json()
    assert len(preview.json()["preview_rows"]) == 2

    blocked = client.get(f"/api/v1/jobs/{job_id}/download")
    assert blocked.status_code == 402

    unlocked = client.post(
        "/api/v1/jobs/webhook/payment",
        content=json.dumps({"job_id": job_id, "event": "paid"}),
        headers=signed_webhook(job_id),
    )
    assert unlocked.status_code == 200
    assert unlocked.json()["is_paid"] is True

    download = client.get(f"/api/v1/jobs/{job_id}/download")
    assert download.status_code == 200
    assert download.content.startswith(b"PK")
    assert "spreadsheetml" in download.headers["content-type"]
    assert "attachment" in download.headers["content-disposition"]

    paid_preview = client.get(f"/api/v1/jobs/{job_id}/preview").json()
    assert paid_preview["is_paid"] is True
    assert len(paid_preview["rows"]) == 2


def test_job_csv_download() -> None:
    job_id = create_job()
    client.post(
        "/api/v1/jobs/webhook/payment",
        content=json.dumps({"job_id": job_id, "event": "payment.succeeded"}),
        headers=signed_webhook(job_id, "payment.succeeded"),
    )
    response = client.get(f"/api/v1/jobs/{job_id}/download?format=csv")
    assert response.status_code == 200
    assert response.text.startswith("Jugador,Zona")


def test_job_destroy_receipt() -> None:
    job_id = create_job()
    response = client.delete(f"/api/v1/jobs/{job_id}")
    assert response.status_code == 200
    body = response.json()
    assert body["job_id"] == job_id
    assert len(body["receipt_signature"]) == 64
    assert client.get(f"/api/v1/jobs/{job_id}/preview").status_code == 404
    assert client.delete(f"/api/v1/jobs/{job_id}").status_code == 404


def test_webhook_requires_signature() -> None:
    response = client.post(
        "/api/v1/jobs/webhook/payment",
        content=json.dumps({"job_id": "x", "event": "paid"}),
    )
    assert response.status_code == 401


def test_webhook_rejects_bad_signature() -> None:
    response = client.post(
        "/api/v1/jobs/webhook/payment",
        content=json.dumps({"job_id": "x", "event": "paid"}),
        headers={"X-VolleyOS-Signature": "deadbeef"},
    )
    assert response.status_code == 401


def test_webhook_rejects_unknown_event() -> None:
    raw = json.dumps({"job_id": "x", "event": "refund"}).encode()
    response = client.post(
        "/api/v1/jobs/webhook/payment",
        content=raw,
        headers={"X-VolleyOS-Signature": sign(raw)},
    )
    assert response.status_code == 400


def test_webhook_unknown_job() -> None:
    raw = json.dumps({"job_id": "missing", "event": "paid"}).encode()
    response = client.post(
        "/api/v1/jobs/webhook/payment",
        content=raw,
        headers={"X-VolleyOS-Signature": sign(raw)},
    )
    assert response.status_code == 404


def test_preview_missing_job() -> None:
    assert client.get("/api/v1/jobs/doesnotexist/preview").status_code == 404


def test_job_validation() -> None:
    response = client.post("/api/v1/jobs", json={"module": "scouting", "title": " "})
    assert response.status_code == 422


def test_job_with_decimal_summary_roundtrip() -> None:
    job_id = create_job(rows=[{"Jugador": 7, "Eficiencia": "0.5"}])
    preview = client.get(f"/api/v1/jobs/{job_id}/preview").json()
    assert preview["row_count"] == 1


def test_list_jobs() -> None:
    create_job()
    body = client.get("/api/v1/jobs").json()
    assert body["count"] >= 1
