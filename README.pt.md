# VolleyOS Global

[English](README.md) | [Español](README.es.md) | **Português**

O sistema operacional do vôlei: 18 módulos para jogadores, treinadores,
árbitros, organizadores e clubes. FOSS offline-first (pronto para F-Droid) +
Cloud Pro opcional.

- Backend: Python 3.13+ / FastAPI / Pydantic v2 / matemática apenas com Decimal.
- Frontend: Next.js App Router / TypeScript estrito / Tailwind / Zod.
- Segurança: CSP, limite de requisições, teto de 256 KiB, saneamento de XSS e
  injeção de fórmulas, selos de integridade HMAC-SHA256.
- Idiomas: espanhol, inglês e português (UI, SEO e páginas legais).
- Licença: AGPL-3.0-or-later. Sem telemetria. Sem SDK proprietários.

## Início rápido

```bash
# Windows
run_local.bat

# Linux/macOS
./run_local.sh
```

Backend em `http://localhost:8000`, frontend em `http://localhost:3000`.
Documentação da API em `http://localhost:8000/docs`; app em `/pt/`.

```bash
# Docker (API + web)
docker compose up --build
```

## Módulos

| # | Módulo | Slug |
|---|--------|------|
| 1 | Laboratório 5 Fotogramas + salto vertical | `biomechanics` |
| 2 | Quadro 5-1 + sobreposição FIVB | `rotation` |
| 3 | Scout em 3 cliques + mapa de calor | `scouting` |
| 4 | Placar indoor 6x6 | `scoreboard` |
| 5 | Torneios + ranking FIVB | `tournament` |
| 6 | Times equilibrados + Rei da Quadra | `pickup` |
| 7 | Overlay OBS/TV | `overlay` |
| 8 | VAR de bolso | `var` |
| 9 | Beach 2v2 + Newcom | `beach` |
| 10 | VolleyCard + radar hexagonal | `volleycard` |
| 11 | Treino de tempo de ataque | `tempo` |
| 12 | Monitor ACWR de carga de salto | `acwr` |
| 13 | Sombra de bloqueio e cobertura | `block-shadow` |
| 14 | Radar de costuras de recepção | `seam-radar` |
| 15 | Imprevisibilidade do levantador | `setter-iq` |
| 16 | Boleta FIVB I-VI com janela de líbero | `lineup-slip` |
| 17 | Selo de integridade HMAC-SHA256 | `integrity-seal` |
| 18 | Cápsula portátil `.volleyos` | `capsule-io` |

## Superfície da API

- `GET /api/v1/health/deep` - saúde dos 18 motores e versão.
- `GET /api/v1/catalog/modules` - módulos, exemplos e preços.
- `POST /api/v1/modules/{slug}/run` e `/demo` - executar um motor.
- `POST /api/v1/security/verify-seal` - verificar uma súmula assinada.
- `POST /api/v1/jobs` -> `GET /jobs/{id}/preview` -> webhook assinado ->
  `GET /jobs/{id}/download?format=xlsx|csv` (402 até o pagamento).
- `DELETE /api/v1/jobs/{id}` - destrói os dados e devolve um recibo UTC assinado.

Toda resposta inclui `no-store`, `nosniff`, `SAMEORIGIN`, `no-referrer` e uma
Permissions-Policy estrita. Mutações são limitadas a 256 KiB e 120 por minuto
por IP.

## Portões de desenvolvimento

```bash
cd backend && .venv\Scripts\python -m pytest -q
cd backend && .venv\Scripts\python -m ruff check app tests
cd backend && .venv\Scripts\python -m mypy --strict app
cd frontend && npm run typecheck && npm run test && npm run build
```

## Documentação

- `docs/HANDOFF.md` - registro dos sprints e estado atual.
- `docs/QA_REPORT.md` - portões, evidência E2E e limites conhecidos.
- `docs/LAUNCH_PLAYBOOK.md` - deploy, domínio, pagamentos e rollback.
- `docs/FDROID_SUBMISSION_GUIDE.md` - distribuição Android offline.
- `docs/openapi.json` - contrato de API gerado.
- `SECURITY.md` - divulgação de vulnerabilidades e modelo de ameaça.
- `CONTRIBUTING.md` - ambiente local, estilo e portões de pull request.

## Estado

v2.0.0: 18 módulos, 18 testes de motores, UI e documentação trilíngues, E2E ao
vivo para módulos, segurança, paywall e política de cabeçalhos.

A exportação Cloud usa um webhook HMAC; conecte um provedor de checkout antes de
cobrar.
