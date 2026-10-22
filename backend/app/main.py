"""VolleyOS Global API entrypoint (FastAPI, opt-in privacy by default)."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.security import SecurityShieldMiddleware

app = FastAPI(
    title="VolleyOS Global API",
    version="3.0.0",
    description=(
        "24 volleyball engines: biomechanics, rotations, scouting, scoreboards, "
        "tournaments, pickup, OBS overlay, pocket VAR, beach, volleycards, tempo, "
        "ACWR, block shadow, seams, setter IQ, lineup slips, integrity seals, "
        "offline capsules, referee cards, substitutions, court split, fan signals, "
        "setter playbooks and MVP awards. Decimal-only maths, no telemetry."
    ),
    contact={"name": "VolleyOS Global", "url": "https://github.com/v0idbrn/VoleyOS"},
    license_info={"name": "AGPL-3.0-or-later", "url": "https://www.gnu.org/licenses/agpl-3.0.html"},
)

app.add_middleware(SecurityShieldMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition", "X-VolleyOS-Job"],
)


@app.middleware("http")
async def privacy_headers(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; img-src 'self' data: blob:; "
        "style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; "
        "frame-ancestors 'self'"
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=()"
    return response


app.include_router(router, prefix="/api/v1")


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "VolleyOS Global",
        "version": "3.0.0",
        "license": "AGPL-3.0-or-later",
        "docs": "/docs",
        "openapi": "/openapi.json",
        "modules_endpoint": "/api/v1/catalog/modules",
    }
