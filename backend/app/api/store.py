"""Ephemeral in-memory job store + HMAC receipts.

ponytail: in-process dict, jobs vanish on restart. Move to Redis/SQLite only if
multi-worker persistence is actually required.
"""

from __future__ import annotations

import hashlib
import hmac
import os
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

from pydantic import BaseModel


class Job(BaseModel):
    job_id: str
    module: str
    title: str
    kind: str = "report"
    summary: dict[str, Any] = {}
    rows: list[dict[str, Any]] = []
    is_paid: bool = False
    created_at: str
    paid_at: str | None = None


JOBS: dict[str, Job] = {}


def webhook_secret() -> str:
    return os.environ.get("PAYMENT_WEBHOOK_SECRET", "volleyos-dev-secret")


def sign(raw: bytes) -> str:
    return hmac.new(webhook_secret().encode(), raw, hashlib.sha256).hexdigest()


def verify_signature(raw: bytes, signature: str) -> bool:
    return hmac.compare_digest(sign(raw), signature.strip().lower())


def utc_now() -> str:
    return datetime.now(UTC).isoformat()


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
        job_id=uuid4().hex[:12],
        module=module,
        title=title,
        kind=kind,
        summary=summary,
        rows=rows,
        created_at=utc_now(),
    )
    JOBS[job.job_id] = job
    return job


def get_job(job_id: str) -> Job | None:
    return JOBS.get(job_id)


def mark_paid(job_id: str) -> Job | None:
    job = JOBS.get(job_id)
    if job is None:
        return None
    job.is_paid = True
    job.paid_at = utc_now()
    return job


def delete_job(job_id: str) -> dict[str, str] | None:
    job = JOBS.pop(job_id, None)
    if job is None:
        return None
    deleted_at = utc_now()
    proof = hmac.new(
        webhook_secret().encode(),
        f"{job_id}|{deleted_at}".encode(),
        hashlib.sha256,
    ).hexdigest()
    return {
        "job_id": job_id,
        "deleted_at": deleted_at,
        "receipt_signature": proof,
        "message": "Datos destruidos. Recibo criptográfico UTC emitido.",
    }
