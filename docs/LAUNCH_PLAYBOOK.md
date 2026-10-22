# Launch Playbook - VolleyOS Global v2.0.0

Everything below assumes the repository root and a clean `main` branch.

## 1. Preflight (must be green)

```powershell
cd backend
.venv\Scripts\python.exe -m ruff check app tests
.venv\Scripts\python.exe -m mypy --strict app
.venv\Scripts\python.exe -m pytest -q

cd ..\frontend
npm run typecheck
npm run test
npm run build

cd ..
python scripts\e2e_check.py   # requires both servers running
```

Expected: 232 backend tests, 35 frontend tests, 158 static routes, 27/27 E2E.
Docker was not built on the dev machine (daemon stopped). Before publishing:

```bash
docker compose build
docker compose up -d
python scripts/e2e_check.py
```

## 2. Deploy the API

Option A - Render blueprint: create a new Blueprint from the repo; `render.yaml`
provisions `volleyos-api` (`pip install .`, uvicorn, health `/api/v1/health/deep`).

Option B - any Docker host:

```bash
docker build -f backend/Dockerfile -t volleyos-api .
docker run -p 8000:8000 -e PAYMENT_WEBHOOK_SECRET=<secret> volleyos-api
```

Set `PAYMENT_WEBHOOK_SECRET` and `INTEGRITY_SEAL_SECRET` to random 32+ byte
values. Never reuse the dev defaults in production. The API enforces a 256 KiB
body cap and 120 mutations/minute/IP; tune `VOLLEYOS_RATE_LIMIT` only with a
reverse proxy that forwards the real client IP. The API is stateless except for the in-memory job store:
restarting it deletes unpaid and paid jobs. Add Redis/SQLite before relying on
long-lived downloads.

## 3. Deploy the web app

Render: `volleyos-web` runs `npm ci && npm run build` then `npm start`.
Required env: `NEXT_PUBLIC_BUILD_TARGET=cloud`, `NEXT_TELEMETRY_DISABLED=1`.
Set `NEXT_PUBLIC_API_BASE` to the API URL when the export UI is wired.

Docker: `docker build -f frontend/Dockerfile -t volleyos-web . && docker run -p 3000:3000 volleyos-web`.

F-Droid build: `NEXT_PUBLIC_BUILD_TARGET=fdroid` hides Cloud Pro and produces the
offline-only bundle. The Android wrapper and store submission are described in
`docs/FDROID_SUBMISSION_GUIDE.md`; no APK is built in this repo yet.

## 4. Domain and HTTPS

1. Point `volleyos.app` (and `www`) at the web host; enable managed TLS.
2. Add the API at `api.volleyos.app` or a `/api` reverse-proxy route.
3. If the domain changes, update `SITE_URL` and canonical URLs in
   `frontend/src/app/layout.tsx`, `sitemap.ts`, `robots.ts`, `lib/seo.ts` and the
   legal copy, then rebuild. All canonical URLs end with `/` because
   `trailingSlash: true`.
4. Submit `https://volleyos.app/sitemap.xml` in Google Search Console and Bing.
5. Verify `robots.txt` disallows `/overlay/` and `/api/`.

## 5. Payments

The API exposes an HMAC webhook, not a checkout provider integration.

1. Create Stripe Payment Links for Pase Express ($7), DT & Club Pro ($19) and
   Torneo Cloud ($29).
2. Replace the `mailto:` targets in `VolleyOSHub` pricing with those links.
3. Create a Stripe webhook for `payment_intent.succeeded` pointing at
   `https://api.volleyos.app/api/v1/jobs/webhook/payment`.
4. Stripe signs with its own scheme; bridge it with a small function that
   verifies Stripe and re-signs the raw JSON with
   `X-VolleyOS-Signature = HMAC-SHA256(raw_body, PAYMENT_WEBHOOK_SECRET)`.
   Payload: `{"event":"paid","job_id":"<job>"}`. Accepted events:
   `paid`, `payment.succeeded`, `payment_completed`.
5. Test the full flow with `scripts/e2e_check.py` or manually: create job ->
   download returns 402 -> signed webhook -> XLSX/CSV download 200 -> DELETE
   returns a signed UTC receipt.
6. Refunds: jobs are ephemeral; deleting the job is the data-erasure path.

## 6. Privacy and legal

- No analytics, telemetry, ads or third-party SDKs are loaded. Keep it that way.
- `/es|en|pt/legal/{terms,privacy,disclaimer,trademarks}` are live; update the
  contact address and jurisdiction before launch.
- API responses must keep `no-store`, `nosniff`, `DENY`, `no-referrer`.
- Add a real support address to the footer and legal pages.

## 7. Launch checklist

- [ ] All preflight gates green, including Docker build.
- [ ] `PAYMENT_WEBHOOK_SECRET` rotated and stored only in the host secret store.
- [ ] Production smoke: `/es/`, `/en/`, `/pt/`, one guide page, one legal page,
      `/overlay/tv/` (noindex), `/sitemap.xml`, `/robots.txt`.
- [ ] Search Console sitemap submitted; no `__next_error__` pages.
- [ ] Stripe test payment unlocks a real download end to end.
- [ ] F-Droid metadata and `.fdroid.yml` reviewed by a maintainer.
- [ ] README, HANDOFF and QA_REPORT reflect the shipped commit.
- [ ] Tag `v1.0.0` and attach release notes.

## 8. Rollback

- Web: redeploy the previous Render deploy or Docker image tag.
- API: redeploy previous image; jobs are in memory and were already lost on
  restart, so no data migration is needed for a rollback.
- Tag the last good commit (`git tag -l`) and redeploy by SHA if needed.
- If a payment secret leaks: rotate `PAYMENT_WEBHOOK_SECRET`, redeploy, and
  invalidate any outstanding unpaid jobs.

## 9. Post-launch watch

- API 5xx rate, job creation volume, 402 -> 200 conversion, download failures.
- Web: Core Web Vitals, 404s in Search Console, install events from the manifest.
- Privacy: confirm no third-party requests appear in the browser network panel.
