# Security Policy

VolleyOS is offline-first, but the Cloud API handles tournament data and signed
payment webhooks. We take reports seriously.

## Supported versions

| Version | Supported |
|---------|-----------|
| 2.x | Yes |
| 1.x | No (upgrade to 2.x) |

## Reporting a vulnerability

- Use a private GitHub Security Advisory:
  <https://github.com/v0idbrn/VoleyOS/security/advisories/new>
- Do not open a public issue for an unpatched vulnerability.
- Include the affected endpoint or module, reproduction steps, impact and the
  version/commit you tested.
- We aim to acknowledge within 72 hours and to ship a fix or mitigation within
  30 days for confirmed issues. We will credit reporters unless you ask to stay
  anonymous.

## Threat model

In scope:

- API input validation, body-size limits, rate limiting and sanitisation.
- HMAC verification for payment webhooks, destruction receipts and integrity
  seals.
- Spreadsheet (CSV/XLSX) formula-injection and XSS payloads.
- Security headers on API and web responses.
- Local vault / `.volleyos` capsule tampering.

Out of scope:

- Denial of service requiring volumetric network capacity.
- Vulnerabilities in outbound payment providers or hosting platforms.
- Physical access to an unlocked device that already holds local data.

## Controls in 2.x

- Pydantic models use `extra="forbid"` and whitespace stripping at trust
  boundaries.
- Mutating requests are capped at 256 KiB (413) and 120 per minute per IP (429
  with `Retry-After`).
- Text is stripped of script/HTML tags, control characters and inline event
  handlers before reaching engines.
- CSV/XLSX cells beginning with `= + - @`, tab or carriage return are prefixed
  with a single quote.
- Payment webhooks use HMAC-SHA256 with constant-time comparison.
- Integrity seals use canonical JSON and HMAC-SHA256; the public SHA-256 hash can
  be audited without the secret.
- Responses set CSP, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: no-referrer` and a strict
  Permissions-Policy.
- No analytics, telemetry, advertising or proprietary SDKs.

## Secrets and deployment

Set these environment variables in production; never commit them:

| Variable | Purpose |
|----------|---------|
| `PAYMENT_WEBHOOK_SECRET` | HMAC key for payment callbacks |
| `INTEGRITY_SEAL_SECRET` | HMAC key for match-sheet seals |
| `VOLLEYOS_RATE_LIMIT` | Optional per-IP mutation limit (default 120/min) |
| `VOLLEYOS_DISABLE_RATE_LIMIT` | Test-only escape hatch; never enable publicly |

Rotate a secret immediately if it leaks. Rotating `INTEGRITY_SEAL_SECRET`
invalidates previously issued seals; re-sign archived sheets if needed.

## Data handling

- The free/F-Droid build keeps data in `localStorage` and never calls the API.
- Cloud jobs are in-memory and disappear on restart. `DELETE` returns a signed
  UTC receipt and removes the job.
- Back up only what you need; tournament sheets can contain minors' names.

## Safe harbour

We will not pursue legal action against researchers who act in good faith,
avoid privacy violations and data destruction, and give us reasonable time to
fix the issue before disclosure.
