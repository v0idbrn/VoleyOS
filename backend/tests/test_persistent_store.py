from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.persistent_store import (
    create_job,
    create_live_room,
    db_path,
    get_job,
    get_live_room,
    list_jobs,
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def isolated_db(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("VOLLEYOS_DB_PATH", str(tmp_path / "volleyos.db"))


def test_jobs_are_written_to_wal_sqlite() -> None:
    job = create_job("scouting", "Persistente", {"Ataques": 12}, [{"Jugador": 7}])
    assert get_job(job.job_id) == job
    assert db_path().exists()
    connection = sqlite3.connect(db_path())
    try:
        assert connection.execute("PRAGMA journal_mode").fetchone()[0] == "wal"
        count = connection.execute("SELECT COUNT(*) FROM jobs").fetchone()[0]
    finally:
        connection.close()
    assert count == 1
    assert len(list_jobs()) == 1


def test_jobs_survive_api_restart() -> None:
    created = client.post(
        "/api/v1/jobs",
        json={"module": "scouting", "title": "Sobrevive", "rows": [{"Jugador": 9}]},
    )
    assert created.status_code == 200
    job_id = created.json()["job"]["job_id"]
    restarted = TestClient(app)
    preview = restarted.get(f"/api/v1/jobs/{job_id}/preview")
    assert preview.status_code == 200
    assert preview.json()["title"] == "Sobrevive"


def test_live_room_full_cycle() -> None:
    created = client.post(
        "/api/v1/live",
        json={
            "module": "scoreboard",
            "title": "Final Tiburones vs Condores",
            "state": {"score_a": 20, "score_b": 18, "rotation": 3},
        },
    )
    assert created.status_code == 200, created.text
    room = created.json()
    room_id = room["room_id"]
    token = room["admin_token"]
    assert room["share_path"] == f"/live/{room_id}"
    assert room["seal"].startswith("VOS-SEAL-")

    public = client.get(f"/api/v1/live/{room_id}")
    assert public.status_code == 200
    assert public.json()["state"]["score_a"] == 20
    assert "admin_token" not in public.json()

    denied = client.patch(f"/api/v1/live/{room_id}", json={"state": {"score_a": 21}})
    assert denied.status_code == 403
    forged = client.patch(
        f"/api/v1/live/{room_id}",
        json={"state": {"score_a": 21}},
        headers={"X-Admin-Token": "forged"},
    )
    assert forged.status_code == 403

    updated = client.patch(
        f"/api/v1/live/{room_id}",
        json={"points": {"A": 21, "B": 18}, "cards": [{"team": "A", "type": "yellow"}]},
        headers={"X-Admin-Token": token},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["state"]["points"]["A"] == 21
    assert updated.json()["state"]["cards"][0]["type"] == "yellow"
    assert updated.json()["seal"] != room["seal"]

    denied_delete = client.delete(f"/api/v1/live/{room_id}")
    assert denied_delete.status_code == 403
    deleted = client.delete(
        f"/api/v1/live/{room_id}",
        headers={"X-Admin-Token": token},
    )
    assert deleted.status_code == 200
    assert len(deleted.json()["receipt_signature"]) == 64
    assert client.get(f"/api/v1/live/{room_id}").status_code == 404


def test_live_room_persists_across_connections() -> None:
    room, token = create_live_room("beach", "Playa", {"points_a": 7})
    assert token
    assert get_live_room(room.room_id) is not None
    connection = sqlite3.connect(db_path())
    try:
        row = connection.execute(
            "SELECT module_slug, state FROM live_rooms WHERE room_id = ?",
            (room.room_id,),
        ).fetchone()
    finally:
        connection.close()
    assert row is not None
    assert row[0] == "beach"
    assert json.loads(row[1])["points_a"] == 7


@pytest.mark.parametrize("module", ["biomechanics", "scouting", "volleycard"])
def test_live_rooms_reject_non_live_modules(module: str) -> None:
    response = client.post("/api/v1/live", json={"module": module, "title": "No"})
    assert response.status_code == 422


def test_missing_live_room_is_404() -> None:
    assert client.get("/api/v1/live/doesnotexist").status_code == 404
    assert client.patch("/api/v1/live/doesnotexist", json={}).status_code == 404
    assert client.delete("/api/v1/live/doesnotexist").status_code == 404
