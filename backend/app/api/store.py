"""Compatibility facade over the SQLite WAL store."""

from __future__ import annotations

import hashlib
import hmac
import os

from app.services.persistent_store import (
    Job,
    create_job,
    delete_job,
    get_job,
    list_jobs,
    mark_paid,
    utc_now,
)


def webhook_secret() -> str:
    return os.environ.get("PAYMENT_WEBHOOK_SECRET", "volleyos-dev-secret")


def sign(raw: bytes) -> str:
    return hmac.new(webhook_secret().encode(), raw, hashlib.sha256).hexdigest()


def verify_signature(raw: bytes, signature: str) -> bool:
    return hmac.compare_digest(sign(raw), signature.strip().lower())


__all__ = [
    "Job",
    "create_job",
    "delete_job",
    "get_job",
    "list_jobs",
    "mark_paid",
    "sign",
    "utc_now",
    "verify_signature",
    "webhook_secret",
]
