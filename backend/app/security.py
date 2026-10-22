"""Active security shield: payload limits, rate limiting, sanitisation."""

from __future__ import annotations

import os
import re
import time
from collections import defaultdict, deque
from collections.abc import Mapping
from typing import Any

from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send

MAX_BODY_BYTES = 262144
RATE_LIMIT = 120
RATE_WINDOW_SECONDS = 60
MUTATING_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
SCRIPT_TAG = re.compile(r"(?is)<script.*?</script>")
HTML_TAG = re.compile(r"(?s)<[^>]*>")
CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")

_hits: dict[str, deque[int]] = defaultdict(deque)


def reset_rate_limits() -> None:
    _hits.clear()


def clean_text(value: str, limit: int = 400) -> str:
    text = SCRIPT_TAG.sub("", value)
    text = HTML_TAG.sub("", text)
    text = text.replace("javascript:", "").replace("JavaScript:", "")
    text = re.sub(r"(?i)on\w+\s*=", "", text)
    text = CONTROL_CHARS.sub("", text)
    return text.strip()[:limit]


def sanitize_value(value: Any) -> Any:
    if isinstance(value, str):
        return clean_text(value)
    if isinstance(value, Mapping):
        return {
            clean_text(str(key), 80): sanitize_value(item)
            for key, item in value.items()
            if str(key) not in {"__proto__", "constructor", "prototype"}
        }
    if isinstance(value, list):
        return [sanitize_value(item) for item in value]
    return value


def protect_cell(value: Any) -> Any:
    """Neutralise spreadsheet formula/DDE injection in CSV and XLSX cells."""
    if isinstance(value, str) and value.startswith(FORMULA_PREFIXES):
        return "'" + value
    return value


def rate_limit_disabled() -> bool:
    return os.environ.get("VOLLEYOS_DISABLE_RATE_LIMIT", "").lower() in {"1", "true", "yes"}


def _client_ip(scope: Scope) -> str:
    client = scope.get("client")
    return str(client[0]) if client else "unknown"


def _rate_limited(ip: str, now: int) -> tuple[bool, int]:
    window = RATE_WINDOW_SECONDS
    hits = _hits[ip]
    while hits and now - hits[0] > window:
        hits.popleft()
    limit = int(os.environ.get("VOLLEYOS_RATE_LIMIT", str(RATE_LIMIT)))
    if len(hits) >= limit:
        retry = max(1, int(window - (now - hits[0])))
        return True, retry
    hits.append(now)
    return False, 0


class SecurityShieldMiddleware:
    """ASGI shield: 256 KiB body cap, per-IP mutation window and OWASP headers."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        path = str(scope.get("path", ""))
        method = str(scope.get("method", "GET"))
        if path.startswith("/api/") and method in MUTATING_METHODS and not rate_limit_disabled():
            limited, retry = _rate_limited(_client_ip(scope), time.monotonic_ns() // 1_000_000_000)
            if limited:
                response = JSONResponse(
                    {"detail": "Too Many Requests"},
                    status_code=429,
                    headers={"Retry-After": str(retry)},
                )
                await response(scope, receive, send)
                return
        headers = dict(scope.get("headers", []))
        raw_length = headers.get(b"content-length")
        if raw_length is not None and method in MUTATING_METHODS:
            try:
                length = int(raw_length)
            except ValueError:
                length = 0
            if length > MAX_BODY_BYTES:
                response = JSONResponse(
                    {"detail": "Content Too Large: maximum 262144 bytes"},
                    status_code=413,
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)

    @staticmethod
    def security_headers(response: Any) -> None:
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; img-src 'self' data: blob:; "
            "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; "
            "frame-ancestors 'self'"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=()"
