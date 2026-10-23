"""VolleyOS v1 API routes."""

from __future__ import annotations

import json
import re
import time
from typing import Any

from fastapi import APIRouter, Header, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.api.demo_data import DEMOS, MODULE_SLUGS
from app.api.dispatch import MODULES, run_module
from app.api.store import (
    Job,
    create_job,
    delete_job,
    get_job,
    list_jobs,
    mark_paid,
    utc_now,
    verify_signature,
)
from app.security import (
    issue_license_token,
    sanitize_value,
    verify_creator_key,
    verify_license_token,
)
from app.services.excel_exporter import export_csv, export_xlsx
from app.services.integrity_seal import VerifySealRequest, verify_seal
from app.services.persistent_store import (
    create_live_room,
    delete_live_room,
    get_live_room,
    room_payload,
    update_live_room,
    verify_admin_token,
)

router = APIRouter()

PRICING = (
    {
        "id": "express",
        "name": "Pase Express",
        "price_usd": "7",
        "features": ["1 reporte exportable", "Scouting o acta de partido", "Sin suscripción"],
    },
    {
        "id": "coach",
        "name": "DT & Club Pro",
        "price_usd": "19",
        "features": ["Reportes ilimitados", "Los 5 Fotogramas completos", "Excel multi-pestaña"],
        "highlight": True,
    },
    {
        "id": "tournament",
        "name": "Torneo Cloud",
        "price_usd": "29",
        "features": [
            "Resultados en vivo",
            "Overlay TV remoto para OBS",
            "Exportación multi-equipo",
        ],
    },
)


class JobCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    module: str
    title: str = Field(min_length=1, max_length=80)
    kind: str = "report"
    summary: dict[str, Any] = Field(default_factory=dict)
    rows: list[dict[str, Any]] = Field(default_factory=list)


class CreatorUnlockRequest(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    creator_key: str = Field(min_length=1, max_length=256)
    job_id: str | None = Field(default=None, max_length=64)


class LiveRoomCreate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    module: str
    title: str = Field(min_length=1, max_length=80)
    state: dict[str, Any] = Field(default_factory=dict)


class LiveRoomUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    state: dict[str, Any] | None = None
    points: dict[str, Any] | None = None
    rotation: int | None = Field(default=None, ge=1, le=6)
    cards: list[dict[str, Any]] | None = None
    results: dict[str, Any] | None = None


def _job_or_404(job_id: str) -> Job:
    job = get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found or already destroyed")
    return job


def _safe_filename(title: str, suffix: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9_-]+", "-", title.strip()).strip("-").lower() or "volleyos"
    return f"volleyos-{slug}.{suffix}"


@router.get("/catalog/modules")
def catalog_modules() -> dict[str, Any]:
    return {
        "count": len(MODULES),
        "modules": [module.model_dump(mode="json") for module in MODULES],
        "profiles": ["players", "coaches", "court", "referees", "tournaments", "fans"],
        "pricing": list(PRICING),
        "build_targets": ["cloud", "fdroid"],
    }


@router.post("/modules/{module_slug}/run")
def run(module_slug: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    if module_slug not in MODULE_SLUGS:
        raise HTTPException(status_code=404, detail=f"unknown module: {module_slug}")
    try:
        result = run_module(module_slug, payload or {})
    except (ValueError, ValidationError, KeyError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {"module": module_slug, "result": result}


@router.post("/modules/{module_slug}/demo")
def demo(module_slug: str) -> dict[str, Any]:
    factory = DEMOS.get(module_slug)
    if factory is None:
        raise HTTPException(status_code=404, detail=f"unknown module: {module_slug}")
    payload = factory()
    try:
        result = run_module(module_slug, payload or {})
    except (ValueError, ValidationError, KeyError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {
        "module": module_slug,
        "generated_at": utc_now(),
        "input": payload,
        "result": result,
    }


@router.get("/health/deep")
def health_deep() -> dict[str, Any]:
    engines: list[dict[str, Any]] = []
    healthy = True
    for slug in MODULE_SLUGS:
        started = time.perf_counter_ns()
        status = "ok"
        detail = ""
        try:
            run_module(slug, DEMOS[slug]())
        except Exception as error:  # noqa: BLE001 - health probe must report, not crash
            status = "error"
            detail = str(error)
            healthy = False
        elapsed_ms = (time.perf_counter_ns() - started) / 1_000_000
        engines.append(
            {
                "module": slug,
                "status": status,
                "ms": round(elapsed_ms, 2),
                "detail": detail,
            }
        )
    return {
        "status": "ok" if healthy else "degraded",
        "engines": engines,
        "count": len(engines),
        "checked_at": utc_now(),
    }


@router.post("/jobs")
def create(job: JobCreate) -> dict[str, Any]:
    if job.module not in MODULE_SLUGS:
        raise HTTPException(status_code=422, detail=f"unknown module: {job.module}")
    summary = sanitize_value(job.summary)
    rows = sanitize_value(job.rows)
    try:
        record = create_job(job.module, str(sanitize_value(job.title)), summary, rows, job.kind)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    return {"job": record.model_dump(mode="json")}


@router.post("/security/verify-seal")
def security_verify_seal(request: VerifySealRequest) -> dict[str, Any]:
    report = verify_seal(request.payload, request.seal, request.original)
    return report.model_dump(mode="json")


@router.post("/security/creator-unlock")
def creator_unlock(request: CreatorUnlockRequest) -> dict[str, Any]:
    if not verify_creator_key(request.creator_key):
        raise HTTPException(status_code=403, detail="invalid creator key")
    if request.job_id is not None:
        job = mark_paid(request.job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="job not found")
    return {
        "unlocked": True,
        "license_token": issue_license_token("creator"),
        "tier": "creator_pro",
    }


@router.post("/live")
def create_live(request: LiveRoomCreate) -> dict[str, Any]:
    try:
        room, token = create_live_room(
            request.module,
            str(sanitize_value(request.title)),
            sanitize_value(request.state),
        )
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    payload = room_payload(room)
    payload["admin_token"] = token
    payload["admin_header"] = "X-Admin-Token"
    return payload


@router.get("/live/{room_id}")
def read_live(room_id: str) -> dict[str, Any]:
    room = get_live_room(room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="live room not found")
    return room_payload(room)


@router.patch("/live/{room_id}")
def update_live(
    room_id: str,
    request: LiveRoomUpdate,
    x_admin_token: str | None = Header(default=None),
) -> dict[str, Any]:
    room = get_live_room(room_id)
    if room is None:
        raise HTTPException(status_code=404, detail="live room not found")
    if not verify_admin_token(room_id, x_admin_token or ""):
        raise HTTPException(status_code=403, detail="invalid admin token")
    state = dict(request.state) if request.state is not None else dict(room.state)
    if request.points is not None:
        state["points"] = request.points
    if request.rotation is not None:
        state["rotation"] = request.rotation
    if request.cards is not None:
        state["cards"] = request.cards
    if request.results is not None:
        state["results"] = request.results
    updated = update_live_room(room_id, sanitize_value(state))
    if updated is None:
        raise HTTPException(status_code=404, detail="live room not found")
    return room_payload(updated)


@router.delete("/live/{room_id}")
def destroy_live(
    room_id: str,
    x_admin_token: str | None = Header(default=None),
) -> dict[str, str]:
    if get_live_room(room_id) is None:
        raise HTTPException(status_code=404, detail="live room not found")
    if not verify_admin_token(room_id, x_admin_token or ""):
        raise HTTPException(status_code=403, detail="invalid admin token")
    receipt = delete_live_room(room_id)
    if receipt is None:
        raise HTTPException(status_code=404, detail="live room not found")
    return receipt


def _licensed_request(
    license_token: str | None, creator_key: str | None
) -> bool:
    return verify_license_token(license_token or "") or verify_creator_key(
        creator_key or ""
    )


@router.get("/jobs/{job_id}/preview")
def preview(
    job_id: str,
    x_volleyos_license: str | None = Header(default=None, alias="X-VoleyOS-License"),
    x_creator_key: str | None = Header(default=None, alias="X-Creator-Key"),
) -> dict[str, Any]:
    job = _job_or_404(job_id)
    authorized = job.is_paid or _licensed_request(x_volleyos_license, x_creator_key)
    columns = list(job.rows[0].keys()) if job.rows else []
    summary = job.summary
    if not authorized:
        summary = {
            key: value
            for key, value in job.summary.items()
            if "audit" not in key.lower()
        }
    payload: dict[str, Any] = {
        "job_id": job.job_id,
        "module": job.module,
        "title": job.title,
        "kind": job.kind,
        "is_paid": job.is_paid,
        "locked": not authorized,
        "row_count": len(job.rows),
        "columns": columns,
        "summary": summary,
        "preview_rows": job.rows[:3],
        "created_at": job.created_at,
    }
    if authorized:
        payload["rows"] = job.rows
    else:
        payload["server_pro_audit_locked"] = True
        payload["paywall"] = {
            "price_usd": "7",
            "message": "Pase Express desbloquea el .xlsx/.csv completo.",
            "webhook": "/api/v1/jobs/webhook/payment",
        }
    return payload


@router.get("/jobs/{job_id}/download")
def download(
    job_id: str,
    format: str = "xlsx",
    x_volleyos_license: str | None = Header(default=None, alias="X-VoleyOS-License"),
    x_creator_key: str | None = Header(default=None, alias="X-Creator-Key"),
) -> Response:
    job = _job_or_404(job_id)
    if not job.is_paid and not _licensed_request(x_volleyos_license, x_creator_key):
        raise HTTPException(
            status_code=402,
            detail="Payment Required: desbloquea el reporte con el webhook HMAC.",
        )
    if format not in ("xlsx", "csv"):
        raise HTTPException(status_code=422, detail="format must be xlsx or csv")
    if format == "csv":
        data = export_csv(job.rows)
        media = "text/csv; charset=utf-8"
    else:
        data = export_xlsx(
            kind=job.kind,
            title=job.title,
            summary=job.summary,
            rows=job.rows,
        )
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    return Response(
        content=data,
        media_type=media,
        headers={
            "Content-Disposition": f'attachment; filename="{_safe_filename(job.title, format)}"',
            "X-VolleyOS-Job": job.job_id,
        },
    )


@router.post("/jobs/webhook/payment")
async def payment_webhook(
    request: Request,
    x_volleyos_signature: str | None = Header(default=None),
    x_signature: str | None = Header(default=None),
) -> dict[str, Any]:
    raw = await request.body()
    signature = x_volleyos_signature or x_signature
    if not signature:
        raise HTTPException(status_code=401, detail="missing HMAC signature")
    if not verify_signature(raw, signature):
        raise HTTPException(status_code=401, detail="invalid HMAC signature")
    try:
        body = json.loads(raw)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=400, detail="invalid JSON body") from error
    event = str(body.get("event", ""))
    if event not in {"paid", "payment.succeeded", "payment_completed"}:
        raise HTTPException(status_code=400, detail="unsupported payment event")
    job_id = str(body.get("job_id", ""))
    job = mark_paid(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return {
        "ok": True,
        "job_id": job.job_id,
        "is_paid": job.is_paid,
        "paid_at": job.paid_at,
        "message": "Pago verificado por HMAC-SHA256. Reporte desbloqueado.",
    }


@router.delete("/jobs/{job_id}")
def destroy(job_id: str) -> dict[str, str]:
    receipt = delete_job(job_id)
    if receipt is None:
        raise HTTPException(status_code=404, detail="job not found or already destroyed")
    return receipt


@router.get("/jobs")
def jobs_index() -> dict[str, Any]:
    jobs = list_jobs()
    return {
        "count": len(jobs),
        "jobs": [
            {
                "job_id": job.job_id,
                "module": job.module,
                "title": job.title,
                "is_paid": job.is_paid,
            }
            for job in jobs
        ],
    }
