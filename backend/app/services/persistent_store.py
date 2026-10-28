"""SQLite WAL persistence for jobs and shareable live rooms.

Every call opens a short-lived connection so the API stays safe across worker
threads and process restarts. Relative `VOLLEYOS_DB_PATH` values resolve from
the process working directory; the default is `./.tmp/volleyos.db`.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import secrets
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field

from app.services.integrity_seal import build_seal, canonical_json, seal_secret

DEFAULT_DB_PATH = "./.tmp/volleyos.db"
LIVE_MODULES = ("scoreboard", "beach", "referee-console", "tournament")


class Job(BaseModel):
    job_id: str
    module: str
    title: str
    kind: str = "report"
    summary: dict[str, Any] = Field(default_factory=dict)
    rows: list[dict[str, Any]] = Field(default_factory=list)
    is_paid: bool = False
    created_at: str
    paid_at: str | None = None
    signature: str = ""


class LiveRoom(BaseModel):
    room_id: str
    module_slug: str
    title: str
    state: dict[str, Any] = Field(default_factory=dict)
    created_at: str
    updated_at: str


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


def db_path() -> Path:
    raw = os.environ.get("VOLLEYOS_DB_PATH", DEFAULT_DB_PATH)
    path = Path(raw)
    if not path.is_absolute():
        path = Path.cwd() / path
    path.parent.mkdir(parents=True, exist_ok=True)
    return path


def _secret(name: str, default: str) -> str:
    return os.environ.get(name, default)


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(str(db_path()), timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL")
    connection.execute("PRAGMA synchronous=NORMAL")
    connection.execute("PRAGMA busy_timeout=5000")
    _ensure_schema(connection)
    return connection


def _ensure_schema(connection: sqlite3.Connection) -> None:
    connection.executescript(
        """
        CREATE TABLE IF NOT EXISTS jobs (
            job_id TEXT PRIMARY KEY,
            module TEXT NOT NULL,
            title TEXT NOT NULL,
            kind TEXT NOT NULL,
            summary TEXT NOT NULL,
            rows TEXT NOT NULL,
            is_paid INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            paid_at TEXT,
            signature TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS live_rooms (
            room_id TEXT PRIMARY KEY,
            module_slug TEXT NOT NULL,
            title TEXT NOT NULL,
            state TEXT NOT NULL,
            admin_token_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """
    )
    connection.commit()


def _json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False)


def _dict(raw: str) -> dict[str, Any]:
    value = json.loads(raw)
    return value if isinstance(value, dict) else {}


def _job_signature(job: Job) -> str:
    material = "|".join(
        (
            job.job_id,
            job.module,
            job.title,
            job.kind,
            job.created_at,
            canonical_json(job.summary),
            canonical_json({"rows": job.rows}),
        )
    )
    return hmac.new(
        _secret("PAYMENT_WEBHOOK_SECRET", "volleyos-dev-secret").encode(),
        material.encode(),
        hashlib.sha256,
    ).hexdigest()


def _job_from_row(row: sqlite3.Row) -> Job:
    return Job(
        job_id=str(row["job_id"]),
        module=str(row["module"]),
        title=str(row["title"]),
        kind=str(row["kind"]),
        summary=_dict(str(row["summary"])),
        rows=list(json.loads(str(row["rows"]))),
        is_paid=bool(row["is_paid"]),
        created_at=str(row["created_at"]),
        paid_at=str(row["paid_at"]) if row["paid_at"] is not None else None,
        signature=str(row["signature"]),
    )


def create_job(
    module: str,
    title: str,
    summary: dict[str, Any],
    rows: list[dict[str, Any]],
    kind: str = "report",
) -> Job:
    if not module.strip():
        raise ValueError("module is required")
    if not title.strip():
        raise ValueError("title is required")
    job = Job(
        job_id=secrets.token_hex(6),
        module=module,
        title=title,
        kind=kind,
        summary=summary,
        rows=rows,
        created_at=utc_now(),
    )
    job = job.model_copy(update={"signature": _job_signature(job)})
    with _connect() as connection:
        connection.execute(
            """
            INSERT INTO jobs
                (job_id, module, title, kind, summary, rows, is_paid, created_at,
                 paid_at, signature)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                job.job_id,
                job.module,
                job.title,
                job.kind,
                _json(job.summary),
                _json(job.rows),
                0,
                job.created_at,
                None,
                job.signature,
            ),
        )
        connection.commit()
    return job


def get_job(job_id: str) -> Job | None:
    with _connect() as connection:
        row = connection.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
    return _job_from_row(row) if row is not None else None


def list_jobs() -> list[Job]:
    with _connect() as connection:
        rows = connection.execute("SELECT * FROM jobs ORDER BY created_at").fetchall()
    return [_job_from_row(row) for row in rows]


def mark_paid(job_id: str) -> Job | None:
    paid_at = utc_now()
    with _connect() as connection:
        result = connection.execute(
            "UPDATE jobs SET is_paid = 1, paid_at = ? WHERE job_id = ?",
            (paid_at, job_id),
        )
        connection.commit()
    if result.rowcount == 0:
        return None
    return get_job(job_id)


def delete_job(job_id: str) -> dict[str, str] | None:
    job = get_job(job_id)
    if job is None:
        return None
    with _connect() as connection:
        connection.execute("DELETE FROM jobs WHERE job_id = ?", (job_id,))
        connection.commit()
    deleted_at = utc_now()
    proof = hmac.new(
        _secret("PAYMENT_WEBHOOK_SECRET", "volleyos-dev-secret").encode(),
        f"{job_id}|{deleted_at}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return {
        "job_id": job_id,
        "deleted_at": deleted_at,
        "receipt_signature": proof,
        "message": "Datos destruidos. Recibo criptográfico UTC emitido.",
    }


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _make_admin_token(room_id: str, issued_at: str) -> str:
    material = f"{room_id}|{issued_at}"
    digest = hmac.new(
        seal_secret().encode(), material.encode(), hashlib.sha256
    ).hexdigest()
    return f"{issued_at}.{digest}"


def _room_from_row(row: sqlite3.Row) -> LiveRoom:
    return LiveRoom(
        room_id=str(row["room_id"]),
        module_slug=str(row["module_slug"]),
        title=str(row["title"]),
        state=_dict(str(row["state"])),
        created_at=str(row["created_at"]),
        updated_at=str(row["updated_at"]),
    )


def create_live_room(
    module_slug: str,
    title: str,
    state: dict[str, Any],
) -> tuple[LiveRoom, str]:
    if module_slug not in LIVE_MODULES:
        raise ValueError(f"module does not support live rooms: {module_slug}")
    created_at = utc_now()
    room_id = secrets.token_hex(6)
    token = _make_admin_token(room_id, created_at)
    room = LiveRoom(
        room_id=room_id,
        module_slug=module_slug,
        title=title,
        state=state,
        created_at=created_at,
        updated_at=created_at,
    )
    with _connect() as connection:
        connection.execute(
            """
            INSERT INTO live_rooms
                (room_id, module_slug, title, state, admin_token_hash, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                room.room_id,
                room.module_slug,
                room.title,
                _json(room.state),
                _token_hash(token),
                room.created_at,
                room.updated_at,
            ),
        )
        connection.commit()
    return room, token


def get_live_room(room_id: str) -> LiveRoom | None:
    with _connect() as connection:
        row = connection.execute(
            "SELECT * FROM live_rooms WHERE room_id = ?", (room_id,)
        ).fetchone()
    return _room_from_row(row) if row is not None else None


def verify_admin_token(room_id: str, token: str) -> bool:
    if not token.strip():
        return False
    with _connect() as connection:
        row = connection.execute(
            "SELECT admin_token_hash FROM live_rooms WHERE room_id = ?", (room_id,)
        ).fetchone()
    if row is None:
        return False
    return hmac.compare_digest(_token_hash(token.strip()), str(row["admin_token_hash"]))


def update_live_room(room_id: str, state: dict[str, Any]) -> LiveRoom | None:
    updated_at = utc_now()
    with _connect() as connection:
        result = connection.execute(
            "UPDATE live_rooms SET state = ?, updated_at = ? WHERE room_id = ?",
            (_json(state), updated_at, room_id),
        )
        connection.commit()
    if result.rowcount == 0:
        return None
    return get_live_room(room_id)


def delete_live_room(room_id: str) -> dict[str, str] | None:
    room = get_live_room(room_id)
    if room is None:
        return None
    with _connect() as connection:
        connection.execute("DELETE FROM live_rooms WHERE room_id = ?", (room_id,))
        connection.commit()
    deleted_at = utc_now()
    proof = hmac.new(
        seal_secret().encode(),
        f"{room_id}|{deleted_at}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return {
        "room_id": room_id,
        "deleted_at": deleted_at,
        "receipt_signature": proof,
        "message": "Sala eliminada. Recibo criptográfico UTC emitido.",
    }


def room_payload(room: LiveRoom) -> dict[str, Any]:
    seal = build_seal(
        {
            "room_id": room.room_id,
            "module": room.module_slug,
            "title": room.title,
            "state": room.state,
            "updated_at": room.updated_at,
        }
    )
    return {
        "room_id": room.room_id,
        "module": room.module_slug,
        "title": room.title,
        "state": room.state,
        "created_at": room.created_at,
        "updated_at": room.updated_at,
        "seal": seal.seal,
        "sha256": seal.sha256,
        "share_path": f"/live/{room.room_id}",
    }
