"""VolleyOS Global API entrypoint (FastAPI, opt-in privacy by default)."""

from __future__ import annotations

from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router

app = FastAPI(
    title="VolleyOS Global API",
    version="1.0.0",
    description=(
        "12 volleyball engines: biomechanics, rotations, scouting, scoreboards, "
        "tournaments, pickup, OBS overlay, pocket VAR, beach, volleycards, tempo "
        "and ACWR. Decimal-only maths, no telemetry."
    ),
    contact={"name": "VolleyOS Global", "url": "https://github.com/v0idbrn/VoleyOS"},
    license_info={"name": "AGPL-3.0-or-later", "url": "https://www.gnu.org/licenses/agpl-3.0.html"},
)

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
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=()"
    return response


app.include_router(router, prefix="/api/v1")


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "VolleyOS Global",
        "version": "1.0.0",
        "license": "AGPL-3.0-or-later",
        "docs": "/docs",
        "openapi": "/openapi.json",
        "modules_endpoint": "/api/v1/catalog/modules",
    }
