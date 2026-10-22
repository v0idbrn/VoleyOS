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
    JOBS,
    Job,
    create_job,
    delete_job,
    get_job,
    mark_paid,
    utc_now,
    verify_signature,
)
from app.security import sanitize_value
from app.services.excel_exporter import export_csv, export_xlsx
from app.services.integrity_seal import VerifySealRequest, verify_seal

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
        "profiles": ["players", "coaches", "court", "tournaments"],
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


@router.get("/jobs/{job_id}/preview")
def preview(job_id: str) -> dict[str, Any]:
    job = _job_or_404(job_id)
    columns = list(job.rows[0].keys()) if job.rows else []
    payload: dict[str, Any] = {
        "job_id": job.job_id,
        "module": job.module,
        "title": job.title,
        "kind": job.kind,
        "is_paid": job.is_paid,
        "locked": not job.is_paid,
        "row_count": len(job.rows),
        "columns": columns,
        "summary": job.summary,
        "preview_rows": job.rows[:3],
        "created_at": job.created_at,
    }
    if job.is_paid:
        payload["rows"] = job.rows
    else:
        payload["paywall"] = {
            "price_usd": "7",
            "message": "Pase Express desbloquea el .xlsx/.csv completo.",
            "webhook": "/api/v1/jobs/webhook/payment",
        }
    return payload


@router.get("/jobs/{job_id}/download")
def download(job_id: str, format: str = "xlsx") -> Response:
    job = _job_or_404(job_id)
    if not job.is_paid:
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
def list_jobs() -> dict[str, Any]:
    return {
        "count": len(JOBS),
        "jobs": [
            {
                "job_id": job.job_id,
                "module": job.module,
                "title": job.title,
                "is_paid": job.is_paid,
            }
            for job in JOBS.values()
        ],
    }
