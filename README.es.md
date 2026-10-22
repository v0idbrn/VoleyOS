# VolleyOS Global

[English](README.md) | **Español** | [Português](README.pt.md)

El sistema operativo del vóley: 18 módulos para jugadores, entrenadores,
árbitros, organizadores y clubes. FOSS offline-first (listo para F-Droid) +
Cloud Pro opcional.

- Backend: Python 3.13+ / FastAPI / Pydantic v2 / matemática solo con Decimal.
- Frontend: Next.js App Router / TypeScript estricto / Tailwind / Zod.
- Seguridad: CSP, límite de peticiones, tope de 256 KiB, saneamiento XSS e
  inyección de fórmulas, sellos de integridad HMAC-SHA256.
- Idiomas: español, inglés y portugués (UI, SEO y páginas legales).
- Licencia: AGPL-3.0-or-later. Sin telemetría. Sin SDK propietarios.

## Inicio rápido

```bash
# Windows
run_local.bat

# Linux/macOS
./run_local.sh
```

Backend en `http://localhost:8000`, frontend en `http://localhost:3000`.
Documentación de API en `http://localhost:8000/docs`; app en `/es/`.

```bash
# Docker (API + web)
docker compose up --build
```

## Módulos

| # | Módulo | Slug |
|---|--------|------|
| 1 | Laboratorio 5 Fotogramas + salto vertical | `biomechanics` |
| 2 | Pizarra 5-1 + solapamiento FIVB | `rotation` |
| 3 | Scouting en 3 clics + mapa de calor | `scouting` |
| 4 | Contador indoor 6v6 | `scoreboard` |
| 5 | Torneos + ranking FIVB | `tournament` |
| 6 | Picaditos parejos + Rey de la Cancha | `pickup` |
| 7 | Overlay OBS/TV | `overlay` |
| 8 | VAR de bolsillo | `var` |
| 9 | Beach 2v2 + Newcom | `beach` |
| 10 | VolleyCard + radar hexagonal | `volleycard` |
| 11 | Entrenador de tempo de ataque | `tempo` |
| 12 | Monitor ACWR de carga de salto | `acwr` |
| 13 | Sombra de bloqueo y cobertura | `block-shadow` |
| 14 | Radar de costuras de recepción | `seam-radar` |
| 15 | Imprevisibilidad del armador | `setter-iq` |
| 16 | Boleta FIVB I-VI con ventana de líbero | `lineup-slip` |
| 17 | Sello de integridad HMAC-SHA256 | `integrity-seal` |
| 18 | Cápsula portátil `.volleyos` | `capsule-io` |

## Superficie de API

- `GET /api/v1/health/deep` - salud de los 18 motores y versión.
- `GET /api/v1/catalog/modules` - módulos, ejemplos y precios.
- `POST /api/v1/modules/{slug}/run` y `/demo` - ejecutar un motor.
- `POST /api/v1/security/verify-seal` - verificar un acta firmada.
- `POST /api/v1/jobs` -> `GET /jobs/{id}/preview` -> webhook firmado ->
  `GET /jobs/{id}/download?format=xlsx|csv` (402 hasta el pago).
- `DELETE /api/v1/jobs/{id}` - destruye los datos y devuelve un recibo UTC firmado.

Toda respuesta incluye `no-store`, `nosniff`, `SAMEORIGIN`, `no-referrer` y una
Permissions-Policy estricta. Las mutaciones se limitan a 256 KiB y 120 por
minuto por IP.

## Puertas de desarrollo

```bash
cd backend && .venv\Scripts\python -m pytest -q
cd backend && .venv\Scripts\python -m ruff check app tests
cd backend && .venv\Scripts\python -m mypy --strict app
cd frontend && npm run typecheck && npm run test && npm run build
```

## Documentación

- `docs/HANDOFF.md` - bitácora de sprints y estado actual.
- `docs/QA_REPORT.md` - puertas, evidencia E2E y límites conocidos.
- `docs/LAUNCH_PLAYBOOK.md` - despliegue, dominio, pagos y rollback.
- `docs/FDROID_SUBMISSION_GUIDE.md` - distribución Android offline.
- `docs/openapi.json` - contrato de API generado.
- `SECURITY.md` - divulgación de vulnerabilidades y modelo de amenaza.
- `CONTRIBUTING.md` - entorno local, estilo y puertas de pull request.

## Estado

v2.0.0: 18 módulos, 18 pruebas de motores, UI y documentación trilingüe, E2E en
vivo para módulos, seguridad, paywall y política de cabeceras.

La exportación Cloud usa un webhook HMAC; conecta un proveedor de checkout antes
de cobrar.
