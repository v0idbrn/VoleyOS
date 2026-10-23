# VolleyOS Global

[English](README.md) | [Español](README.es.md) | **Português**


## 📱 Baixar APK para Android

[![Download APK](https://img.shields.io/badge/APK-voleyos--universal.apk-FF3B5C?style=for-the-badge&logo=android)](https://github.com/v0idbrn/VoleyOS/releases/latest/download/voleyos-universal.apk)

APK universal assinado pelo GitHub Actions em cada tag `v*`. Android 7.0+ (minSdk 24), trilingue, offline-first, sem contas e sem telemetria.


O sistema operacional do volei: 48 modulos para jogadores, treinadores, arbitros, torcida, organizadores e clubes. FOSS offline-first (pronto para F-Droid) + Cloud Pro opcional, com salas ao vivo persistentes.
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
| 19 | Console de árbitro + cartões FIVB 21 | `referee-console` |
| 20 | Controle de substituições e retornos | `substitution-tracker` |
| 21 | Rateio de quadra ao centavo | `court-split` |
| 22 | Companheiro de torcida + trivia de arbitragem | `fan-companion` |
| 23 | Sinais do levantador com colisões | `setter-signals` |
| 24 | Prêmios MVP, Muro, Cadeado e Sangue Frio | `mvp-awards` |
| 25 | Quadro de tempo técnico + cronômetro FIVB de 30 s | `timeout-chalkboard` |
| 26 | Coach de momentum com janelas de 6 rallies | `momentum-coach` |
| 27 | Draft serpentino de capitães + auditoria | `captain-draft` |
| 28 | Passe de elenco + checagem de líbero e capitão | `roster-pass` |
| 29 | Inspetor de equipamento + tolerâncias de rede e bola | `equipment-inspector` |
| 30 | Pôster SVG 1080x1920 / 1080x1080 | `match-poster` |
| 31 | Serve speed radar + receiver reaction | `serve-radar` |
| 32 | 6x6 matchup matrix + best rotation | `matchup-matrix` |
| 33 | Block-out lab + expected value | `blockout-lab` |
| 34 | Practice planner + timed blocks | `practice-planner` |
| 35 | Play-by-play narrator ES/EN/PT | `play-by-play` |
| 36 | Player career passport + bottleneck | `player-career` |
| 37 | Laboratorio aerodinamico Magnus + crise de arrasto | `ball-aerodynamics` |
| 38 | Cortador de highlights + FFmpeg/EDL | `rally-clipper` |
| 39 | Dossie de recrutamento + selo HMAC | `recruiting-dossier` |
| 40 | Simulador de transicao 4-2 / 6-2 / 5-1 | `system-transition` |
| 41 | Leitor de engano + defensor designado | `deception-reader` |
| 42 | Mini-volei e volei sentado | `inclusive-adaptive` |
| 43 | Ranking ELO FIVB + fator de margem | `elo-ranking` |
| 44 | Tesouraria do time + WhatsApp/Excel | `team-treasury` |
| 45 | Regras da casa, reloginho e golden point | `house-rules` |
| 46 | Arena DJ + cues WebAudio de estadio | `arena-dj` |
| 47 | Girias mundiais AR/ES/MX/BR/US | `court-slang` |
| 48 | Sincronizacao QR air-gapped + HMAC | `qr-sync` |

## Superfície da API

- `GET /api/v1/health/deep` - saúde dos 48 motores e versão.
- `GET /api/v1/catalog/modules` - módulos, exemplos, perfis e preços.
- `POST /api/v1/modules/{slug}/run` e `/demo` - executar um motor.
- `POST /api/v1/security/verify-seal` - verificar uma súmula assinada.
- `POST /api/v1/live` -> `GET /api/v1/live/{room_id}` - criar e ler uma sala
  ao vivo com SQLite; `PATCH` e `DELETE` exigem `X-Admin-Token`.
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

v5.0.0: 48 módulos, 370 testes backend, 62 testes frontend, salas ao vivo
SQLite WAL, seis perfis de papel, desfazer/refazer e atalhos no placar, quadro de
tempo técnico, draft serpentino, inspeção de equipamento, pôsteres SVG, UI e
documentação trilíngues, e E2E ao vivo para módulos, salas, segurança, paywall e
cabeçalhos.

A exportação Cloud usa um webhook HMAC; conecte um provedor de checkout antes de
cobrar.
