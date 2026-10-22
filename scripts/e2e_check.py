"""End-to-end smoke test for VolleyOS API + web.

Usage:
    python scripts/e2e_check.py
Env:
    API_BASE=http://127.0.0.1:8000
    WEB_BASE=http://127.0.0.1:3000
    PAYMENT_WEBHOOK_SECRET=volleyos-dev-secret
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import sys
import urllib.error
import urllib.request

API = os.environ.get("API_BASE", "http://127.0.0.1:8000").rstrip("/")
WEB = os.environ.get("WEB_BASE", "http://127.0.0.1:3000").rstrip("/")
SECRET = os.environ.get("PAYMENT_WEBHOOK_SECRET", "volleyos-dev-secret")

PASSED: list[str] = []
FAILED: list[str] = []


def check(name: str, condition: bool, detail: str = "") -> None:
    if condition:
        PASSED.append(name)
        print(f"PASS  {name}")
    else:
        FAILED.append(name)
        print(f"FAIL  {name} {detail}".rstrip())


def call(
    method: str,
    url: str,
    payload: dict[str, object] | None = None,
    headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, str], bytes]:
    body = json.dumps(payload).encode() if payload is not None else None
    request = urllib.request.Request(url, data=body, method=method, headers=headers or {})
    if body is not None:
        request.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return response.status, {key.lower(): value for key, value in response.headers.items()}, response.read()
    except urllib.error.HTTPError as error:
        return error.code, {key.lower(): value for key, value in error.headers.items()}, error.read()


def api_checks() -> None:
    status, headers, body = call("GET", f"{API}/")
    check("api.root", status == 200 and b"VolleyOS" in body)
    check(
        "api.privacy_headers",
        headers.get("cache-control") == "no-store"
        and headers.get("x-content-type-options") == "nosniff"
        and headers.get("x-frame-options") == "SAMEORIGIN" and "content-security-policy" in headers and "permissions-policy" in headers
        and headers.get("referrer-policy") == "no-referrer",
        str({key: headers.get(key) for key in ("cache-control", "x-content-type-options")}),
    )

    status, _, body = call("GET", f"{API}/api/v1/health/deep")
    health = json.loads(body) if status == 200 else {}
    check("api.health_deep", status == 200 and health.get("status") == "ok" and health.get("count") == 36)

    status, _, body = call("GET", f"{API}/api/v1/catalog/modules")
    catalog = json.loads(body) if status == 200 else {}
    check("api.catalog", status == 200 and catalog.get("count") == 36 and len(catalog.get("pricing", [])) == 3)

    status, _, body = call("POST", f"{API}/api/v1/modules/biomechanics/demo", {})
    demo = json.loads(body) if status == 200 else {}
    check(
        "api.demo_biomechanics",
        status == 200 and len(demo.get("result", {}).get("frames", [])) == 5,
    )

    slugs = [
        "biomechanics", "rotation", "scouting", "scoreboard", "tournament", "pickup",
        "overlay", "var", "beach", "volleycard", "tempo", "acwr",
        "block-shadow", "seam-radar", "setter-iq", "lineup-slip", "integrity-seal", "capsule-io",
        "referee-console", "substitution-tracker", "court-split", "fan-companion",
        "setter-signals", "mvp-awards", "timeout-chalkboard", "momentum-coach",
        "captain-draft", "roster-pass", "equipment-inspector", "match-poster",
        "serve-radar", "matchup-matrix", "blockout-lab", "practice-planner", "play-by-play", "player-career",
    ]
    demos = {slug: call("POST", f"{API}/api/v1/modules/{slug}/demo", {})[0] for slug in slugs}
    check("api.demo_all_36", all(code == 200 for code in demos.values()), str(demos))

    status, _, body = call(
        "POST",
        f"{API}/api/v1/live",
        {"module": "scoreboard", "title": "E2E Live", "state": {"score_a": 20, "score_b": 18}},
    )
    live = json.loads(body) if status == 200 else {}
    room_id = str(live.get("room_id", ""))
    token = str(live.get("admin_token", ""))
    check("api.live_create", status == 200 and bool(room_id) and bool(token))

    status, _, body = call("GET", f"{API}/api/v1/live/{room_id}")
    public = json.loads(body) if status == 200 else {}
    check("api.live_read", status == 200 and public.get("state", {}).get("score_a") == 20 and "admin_token" not in public)

    status, _, _ = call("PATCH", f"{API}/api/v1/live/{room_id}", {"points": {"A": 21, "B": 18}})
    check("api.live_forbidden", status == 403)

    status, _, body = call(
        "PATCH",
        f"{API}/api/v1/live/{room_id}",
        {"points": {"A": 21, "B": 18}, "rotation": 4},
        headers={"X-Admin-Token": token},
    )
    updated = json.loads(body) if status == 200 else {}
    check(
        "api.live_update",
        status == 200
        and updated.get("state", {}).get("points", {}).get("A") == 21
        and updated.get("state", {}).get("rotation") == 4
        and updated.get("seal") != live.get("seal"),
    )

    status, _, body = call("DELETE", f"{API}/api/v1/live/{room_id}", headers={"X-Admin-Token": token})
    receipt = json.loads(body) if status == 200 else {}
    check("api.live_destroy", status == 200 and len(str(receipt.get("receipt_signature", ""))) == 64)

    status, _, body = call("POST", f"{API}/api/v1/modules/integrity-seal/demo", {})
    sealed = json.loads(body).get("result", {}) if status == 200 else {}
    status, _, body = call(
        "POST",
        f"{API}/api/v1/security/verify-seal",
        {"payload": {"match_id": "ARG-BRA-2026-10-22", "set": 3}, "seal": "VOS-SEAL-00000000000000000000000000000000"},
    )
    check("api.seal_verify_rejects", status == 200 and json.loads(body).get("tampered") is True)
    try:
        status, _, _ = call("POST", f"{API}/api/v1/modules/seam-radar/run", {"padding": "x" * 262200})
    except OSError:
        status = 413
    check("api.body_cap_413", status == 413)

    rows = [
        {"jugador": "Valentina", "zona": 4, "punto": 1},
        {"jugador": "Martina", "zona": 2, "punto": 1},
        {"jugador": "Lucía", "zona": 6, "punto": 0},
    ]
    status, _, body = call(
        "POST",
        f"{API}/api/v1/jobs",
        {"module": "scouting", "title": "E2E Scouting", "kind": "report", "summary": {"eventos": 3}, "rows": rows},
    )
    job = json.loads(body).get("job", {}) if status == 200 else {}
    job_id = str(job.get("job_id", ""))
    check("api.job_create", status == 200 and bool(job_id))

    status, _, body = call("GET", f"{API}/api/v1/jobs/{job_id}/preview")
    preview = json.loads(body) if status == 200 else {}
    check("api.preview_locked", status == 200 and preview.get("locked") is True and preview.get("row_count") == 3)

    status, _, _ = call("GET", f"{API}/api/v1/jobs/{job_id}/download")
    check("api.download_402", status == 402)

    raw = json.dumps({"event": "paid", "job_id": job_id}).encode()
    status, _, _ = call(
        "POST",
        f"{API}/api/v1/jobs/webhook/payment",
        headers={"X-VolleyOS-Signature": "deadbeef", "Content-Type": "application/json"},
    )
    check("api.webhook_rejects_bad_signature", status == 401)

    signature = hmac.new(SECRET.encode(), raw, hashlib.sha256).hexdigest()
    request = urllib.request.Request(
        f"{API}/api/v1/jobs/webhook/payment",
        data=raw,
        method="POST",
        headers={"X-VolleyOS-Signature": signature, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        paid = json.loads(response.read())
    check("api.webhook_unlocks", response.status == 200 and paid.get("is_paid") is True)

    status, headers, body = call("GET", f"{API}/api/v1/jobs/{job_id}/download?format=xlsx")
    check(
        "api.download_xlsx",
        status == 200 and body[:2] == b"PK" and "spreadsheetml" in headers.get("content-type", ""),
        headers.get("content-type", ""),
    )

    status, _, body = call("GET", f"{API}/api/v1/jobs/{job_id}/download?format=csv")
    check("api.download_csv", status == 200 and b"jugador" in body.lower())

    status, _, body = call("DELETE", f"{API}/api/v1/jobs/{job_id}")
    receipt = json.loads(body) if status == 200 else {}
    check(
        "api.destroy_receipt",
        status == 200
        and receipt.get("job_id") == job_id
        and len(str(receipt.get("receipt_signature", ""))) == 64,
    )

    status, _, _ = call("GET", f"{API}/api/v1/jobs/{job_id}/preview")
    check("api.job_gone", status == 404)


def web_checks() -> None:
    status, headers, body = call("GET", f"{WEB}/es/")
    check("web.es_home", status == 200 and "Estaciones".encode() in body)
    check(
        "web.security_headers",
        headers.get("x-content-type-options") == "nosniff"
        and headers.get("x-frame-options") == "SAMEORIGIN" and "content-security-policy" in headers and "permissions-policy" in headers
        and headers.get("referrer-policy") == "no-referrer",
    )

    status, _, body = call("GET", f"{WEB}/en/")
    check("web.en_home", status == 200 and b"Stations" in body)

    status, _, body = call("GET", f"{WEB}/es/modules/scouting/")
    check("web.seo_module", status == 200 and "Scouting".encode() in body and b"FAQPage" in body)

    status, _, body = call("GET", f"{WEB}/pt/")
    check("web.pt_home", status == 200 and b"Esta\xc3\xa7\xc3\xb5es" in body)

    status, _, body = call("GET", f"{WEB}/es/")
    check("web.thirty_six_modules", status == 200 and body.count(b'id="station-') >= 36)

    status, _, body = call("GET", f"{WEB}/es/legal/privacy/")
    check("web.legal", status == 200 and b"privacidad" in body.lower())

    status, _, body = call("GET", f"{WEB}/overlay/tv/")
    check("web.overlay_noindex", status == 200 and b"noindex" in body)

    status, _, body = call("GET", f"{WEB}/sitemap.xml")
    check("web.sitemap", status == 200 and body.count(b"<url>") >= 205, f"{body.count(b'<url>')} urls")

    status, _, body = call("GET", f"{WEB}/robots.txt")
    check("web.robots", status == 200 and b"sitemap.xml" in body)


def main() -> int:
    print(f"API {API}\nWEB {WEB}\n")
    try:
        api_checks()
        web_checks()
    except (urllib.error.URLError, ConnectionError, TimeoutError) as error:
        print(f"\nABORT: server not reachable ({error})")
        print("Start the stack with docker compose up --build or run_local.bat")
        return 2

    print(f"\n{len(PASSED)} passed, {len(FAILED)} failed")
    if FAILED:
        print("Failed: " + ", ".join(FAILED))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
