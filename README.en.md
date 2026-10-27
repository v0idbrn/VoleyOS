# VolleyOS Global

[English](README.md) · [Español](README.es.md) · [Português](README.pt.md)

[![Version](https://img.shields.io/badge/version-v9.5.0-FF3B5C?style=for-the-badge)](https://github.com/v0idbrn/VoleyOS/releases/latest)
[![Modules](https://img.shields.io/badge/modules-61-FF3B5C?style=for-the-badge&color=EAB308)](#encyclopedia-of-the-61-modules)
[![Offline](https://img.shields.io/badge/100%25-offline--first-FF3B5C?style=for-the-badge&color=EAB308)](#why-volleyos-exists)
[![Android](https://img.shields.io/badge/Android%20APK-voleyos--universal-FF3B5C?style=for-the-badge&color=EAB308)](https://github.com/v0idbrn/VoleyOS/releases/latest/download/voleyos-universal.apk)
[![Licence](https://img.shields.io/badge/licence-AGPL--3.0--or--later-FF3B5C?style=for-the-badge&color=EAB308)](LICENSE)

## 📱 Download Android APK

[![Download APK](https://img.shields.io/badge/APK-voleyos--universal.apk-FF3B5C?style=for-the-badge&logo=android)](https://github.com/v0idbrn/VoleyOS/releases/latest/download/voleyos-universal.apk)

Signed universal APK built by GitHub Actions on every `v*` tag. Android 7.0+ (minSdk 24), trilingual, offline-first, no accounts and no telemetry. F-Droid ready.

## 🆕 What's new in v9.5.0 — The Athlete's Edge

- **👟 Real court textures**: sneaker squeak, Mikasa spike thump and net-cord snap synthesised live in WebAudio and layered onto kills and aces in every match.
- **🎵 Acoustic approach metronome**: 1st/2nd/3rd-tempo step-plant rhythms (0/220/310 · 480 … ms) plus a 🔁 repeat-every-5s loop for hands-free approach practice in the Biomechanics lab.
- **🎧 Blind Court Mode**: leave the phone on the bench and react to randomised voice, whistle and squeak defensive callouts in the Reflex Trainer.
- **🛫 Video flight-time jump lab**: mark takeoff and landing frame-by-frame in the Telestrator for exact h = ⅛gt² height, take-off speed and hang-time rating, saved to your jump profile with a history sparkline.
- **🕚 Hora 11 vs 12 protractor**: a draggable shoulder clock over the video with the 10:30–11:15 power zone and the 12:00–01:00 impingement zone.
- **👤 1st-person rotation guide**: track your role across R1–R6 with Volt Gold highlighting, FIVB neighbour constraint lines and a "where to stand / where to run" action card, K1/K2 aware.
- **⏱️ Isometric tendon timer**: the clinical 5×45s wall-sit / 90s rest patellar protocol with countdown ticks and phase whistles, hands-free in the Jumper's Knee module.
- **⚡ Career VolleyCard**: sync JMP/ATK/DEF/IQ/OVR from your saved jump record, Mi Temporada results and pickup awards, with a level-up arpeggio when OVR rises.
- **Keeps everything from v9.4.0**: the anti-hack shield, court ergonomics, unified player chips, PNG sharing, ⭐ Mis Fijas and the signed `.vos` vault.

## ❤️ Support VolleyOS

Gratis, 100% offline, sin cuentas, sin telemetría y sin anuncios — bancado por la comunidad.

- ☕ Ko-fi: https://ko-fi.com/unfrgvnn
- 💵 Mercado Pago alias: `unfrgvnn.dead`
- 👑 Redeem a `VOS-CHIP` code from the Creator Keygen Console for the golden supporter badge; supporters are credited in these READMEs with every release.

## Why VolleyOS exists

Volleyball is scored, coached and organised on the worst surfaces for technology: gym silence, beach sun, tournament tables with dying phones. The tools the sport adopted are paper sheets, cloud apps that die at minute zero, or subscriptions behind an account nobody at the gym has. The court pains VolleyOS fixes:

- **Scorers** cannot type with gloves in a noisy gym: VolleyOS scores with the physical volume buttons, shows a giant gym screen readable at 30 metres, and never needs internet.
- **Coaches** have no time for four-tap data entry: scouting, tempo, rotation validation and load monitoring run in one tap each, with results readable mid-set.
- **Referees** must keep an official sheet offline: VolleyOS produces a printable A4 FIVB acta with sets, substitutions, sanctions and a SHA-256 seal, plus an air-gapped QR clone of the live scoreboard for the score table.
- **Organisers** draw brackets on napkins: VolleyOS seeds elimination brackets, balances pickup teams, splits court costs to the exact cent and values sponsor decks.
- **Fans** want context without accounts: companion trivia, world court slang and match posters run locally.

Everything runs inside the browser or WebView with zero network requests, trilingual (ES / EN / PT) with authentic court vocabulary — armador, recupero K1, costura, pipe, enroque — never robotic literal translations.

## How VolleyOS is used: the 5-tab native shell

The app is a fixed 100dvh Android-feel shell. On first open, a 3-tap onboarding (language → role → four favourites) opens the tab you will use most and pins the four modules that matter for your role.

### 🏠 Inicio / Home

- Filter the 61 modules by your court role (6 profiles, 10 or 11 modules each) or search by name.
- Star modules to pin them at the top: your daily station is one tap away.
- Every card carries the number, icon and tagline so you can find "the rotation one" without knowing slugs.
- Open the 🍻 Picadito & Amigos suite from the top bar: the eight casual tools for everyday pickup games, also highlighted inside the 🌱 Novice mode.

### ⏱️ Cancha / Court

1. **Create your teams once:** team name, 3-letter code and jersey colour are saved in localStorage. Inside each team, manage up to 20 players — 6 starters (zones I-VI), bench substitutes, up to 2 liberos — with number, name, position (S / OH / MB / OPP / L) and a captain badge. Paste a roster in one shot: `10 Juan S, 7 Pedro OH, 12 Lucas MB`.
2. **Pick the match format:** Best of 3 (sets 1-2 to 25, deciding set to 15) or Best of 5 (sets 1-4 to 25, deciding set to 15), with official win-by-2 deuce or golden point.
3. **Score eyes-free:** Vol+ scores the home team, Vol- the away team, and a long press undoes the last point — you never unlock the phone mid-rally.
4. **The engine closes the set for you:** at 24-24 the target extends (26-24, 27-25...), SET POINT / MATCH POINT banners appear automatically, the set is archived into history at 25-x / 26-24, and a deciding set activates the 15-point tie-break with the point-8 court switch alert.
5. **Undo across sets:** tapped +1 at 24-20 by mistake? Undo reopens the set at 24-20 with the set counter intact.
6. Launch the Gym Giant Screen (TV button) for a full-screen scoreboard the public reads from the stands.

### 📋 Pizarra / Chalkboard

- Validate 5-1 / 6-2 / 4-2 line-ups and FIVB overlap faults against the rotation you are running.
- Animate a serve-transition-attack sequence in 3 phases over the SVG court with your active roster.
- Tap an attack origin, tap the landing spot, mark the outcome (# kill, ! in play, = blocked) and build a shot heatmap of the 9 target zones.
- Use the block-shadow calculator to place double-block coverage and the block-out lab to decide hands-out vs tool-the-block.

### ⚡ Lab & IA

- Load a video from your phone gallery into the frame-by-frame telestrator (step -1 / +1 frames at 30/60/120 fps, 0.1x-1x slow motion).
- Mark take-off and landing and get the vertical jump height instantly from flight time (h = 1/8 * g * t^2), exact to the centimetre at 60 fps.
- Draw attack vectors and joint angles over the video, then export the annotated snapshot with a VOS-SEAL.
- Run the offline 5-frame biomechanics lab, the tempo trainer and the six-axis skill radar.

### ⚙️ Ajustes / Settings, Vault & QR sync

- Export real OpenXML .xlsx workbooks and A4 printable scoresheets in Airplane Mode — no spreadsheet app, no server, no account.
- Clone a live scoreboard to another phone via multi-frame QR (HMAC-signed tokens) with both devices offline.
- Store reports in the ephemeral vault and destroy them with one tap (real delete, no trash can).
- Native copy/paste works in every text input — paste a roster or a licence key comfortably.

### 🍻 Picadito & Amigos / Casual suite

Eight everyday-player tools, one tap from the home top bar and highlighted inside the 🌱 Novice mode; the scoreboard also carries the bench rotator and the recreational serve cap.

| Tool | What it does |
| --- | --- |
| 📋 WhatsApp Roster Builder | Paste the group chat list, cap the court, promote the waitlist when someone drops out, and copy the updated roster or the "we're 1 short" sign. |
| 🪇 Bench Rotator (7-10) | Rotates the six zones on every side-out and swaps the next bench player in at position I or VI, with a fair play-time table so nobody sits out twice. |
| 🎯 Recreational Serve Cap | Off / 3 / 5 consecutive serves on the picadito scoreboard, with a friendly banner when one server runs the game. |
| ⚖️ El Juez del Picadito | Rules the five classic disputes (foot fault, lift, finger set, double contact, net touch) from the agreed observable, with the rule shown in three languages. |
| 📣 Signals & Shouts Translator | Accent-insensitive ES/EN/PT lookup for every court cry plus when to shout it. |
| 🔥 Express Warmup (4 min) | Strict four-phase countdown: mobility, activation, bounce, swings - done in four minutes. |
| 💰 La Vaquita 2.0 | Settles entry fees against gear compensation credits in integer cents and flags any pot shortfall. |
| 🏆 Premios del Picadito | One-tap shareable SVG prize poster: champion, prize, runner-up and MVP. |

## Encyclopedia of the 61 modules

Six role profiles, ten or eleven modules each. Every entry says what the module is for and how you use it.

### Players

| # | Module | Why it is useful | How to use it |
|---|--------|------------------|---------------|
| 1 | 5 Frames Lab (`biomechanics`) | Turns a bad spike into a mechanical diagnosis, not a vibe. | Enter the 5 checkpoints (knee, draw, impact, window, symmetry); get a score and the priority fix. |
| 2 | Pickup Balancer (`pickup`) | Nobody picks teams from a line of friends anymore. | Paste names with skill grades; get two balanced teams and the King of the Court call. |
| 3 | VolleyCard & Radar (`volleycard`) | Shows a player the way scouts read them. | Grade jump / attack / serve / reception / defense / game sense 1-99; export the card. |
| 4 | Attack Tempo (`tempo`) | Teaches first/second tempo and the pipe window in real milliseconds. | Log each setter jump; see early/perfect/late and the tolerance window. |
| 5 | Setter Signal Sheet (`setter-signals`) | Replaces the hand code with auditable, collision-proof calls. | Pick your system; the sheet proves no two signs conflict. |
| 6 | Serve Speed Radar (`serve-radar`) | Turns raw km/h into an acing plan. | Enter speed and receiver zone; get the serving plan and receiver reaction read. |
| 7 | Magnus Aerodynamics Lab (`ball-aerodynamics`) | Explains a float serve dying mid-flight with numbers. | Enter speed, spin and launch angle; check the landing prediction and drag crisis. |
| 8 | Rally Highlight Clipper (`rally-clipper`) | Builds a highlight reel without a video editor. | Log start/end seconds and skill per rally; get the ffmpeg cut plan and EDL. |
| 9 | Video Telestrator (`video-telestrator`) | Converts gallery video into biomechanics data. | Load video, step frames, mark take-off and landing; export the sealed telestration. |
| 10 | Playbook Animator (`playbook-animator`) | Replaces chalk arrows with an animated 3-phase play. | Choose phases (serve, transition, attack), players and target zone; play, then export the SVG. |

### Coaches

| # | Module | Why it is useful | How to use it |
|---|--------|------------------|---------------|
| 2 | 5-1 Board & Overlap (`rotation`) | Kills rotation-fault losses before the whistle does. | Set R1-R6 formations; the validator spots overlaps and corrects the board. |
| 3 | 3-Touch Scouting (`scouting`) | Produces a real opponent heatmap mid-match. | Tap location, zone and outcome per ball; the report ranks threats and zones. |
| 12 | ACWR Monitor (`acwr`) | Flags a load spike before knees pay for it. | Log daily jumps; read the acute/chronic ratio and safe weekly limits. |
| 13 | Block Shadow & Cover (`block-shadow`) | Quantifies who your double block leaves uncovered. | Pick blockers and scheme; read the percent of court covered and the open seams. |
| 15 | Setter IQ Auditor (`setter-iq`) | Finds which sets are winning and which are wasted. | Enter each distribution; read unpredictability and per-set efficiency. |
| 32 | 6x6 Matchup Matrix (`matchup-matrix`) | Puts your best blockers on the rival gun. | Grade the 6x6 hitter/blocker matrix; get the best rotation and serving order. |
| 40 | 4-2 / 6-2 / 5-1 Simulator (`system-transition`) | Confirms which system fits your personnel. | Grade setter count, passer consistency and penetration; read the advice. |
| 41 | Deception Reader (`deception-reader`) | Scores how readable your attackers are. | Enter approach speed, elbow height and ball line; read the defender's likely commit. |
| 54 | Tournament Nutrition (`tournament-nutrition`) | Keeps a back-to-back day alive into set 5. | Enter weight, matches, minutes, temperature and sweat rate; read carbs, fluid and sodium. |
| 55 | Injury Prehab (`injury-prehab`) | Flags jumper's knee and shoulder risk before weekly volume does the damage. | Enter jump volume, spikes, sleep and pain; get a risk score, jump limit and drills. |

### Court

| # | Module | Why it is useful | How to use it |
|---|--------|------------------|---------------|
| 4 | Indoor 6v6 Scoreboard (`scoreboard`) | Replaces the flip board and the paper score sheet. | Score with volume buttons; automatic deuce, set closure and history. |
| 8 | Pocket VAR (`var`) | Resolves touch disputes at street level. | Log the play; get the call, the coin toss and the challenge tracking. |
| 9 | Beach 2v2 (`beach`) | Scores sand rules, switch calls and the Newcom format. | Pick 2x2; switches and set targets are handled for you. |
| 14 | Reception Seam Radar (`seam-radar`) | Sees the reception seam before the serve does. | Enter serve type and receiver positions; read the seam gap in cm and who owns it. |
| 20 | Substitution & Re-entry Tracker (`substitution-tracker`) | Keeps the table honest on the 12-substitution limit. | Log subs and re-entries; check the live count and limit. |
| 33 | Block-Out Lab (`blockout-lab`) | Prices hands-out vs tool-the-block with expected value. | Pick the block scheme; get the decision and the explanation. |
| 42 | Mini & Sitting Volleyball (`inclusive-adaptive`) | Adapts any match to sitting, mini or mixed play. | Choose mode, category and player count; read the adapted rulebook. |
| 45 | House Rules & Relojito (`house-rules`) | Runs a night match by street rules without chaos. | Choose format, bench order and score; get the white list to begin, or the fault. |
| 49 | Gym Giant Screen (`gym-screen`) | Broadcasts the scoreboard itself to the stands. | Tap the TV button or fire the bridge call; a 30-metre fullscreen board takes over. |
| 60 | Peripheral Reflex (`peripheral-reflex`) | Trains the eyes that win hard digs late in sets. | Log reaction times in ms; read mean, spread, consistency and rating. |

### Tournaments

| # | Module | Why it is useful | How to use it |
|---|--------|------------------|---------------|
| 5 | Lightning Tournaments (`tournament`) | Schedules a cup and publishes standings without Excel. | Choose teams and format; get the calendar, standings and ranking moves. |
| 21 | Court Fee Split (`court-split`) | Ends the who-pays-what fight in three seconds. | Enter court hours and local hourly rates; get the split per player to the cent. |
| 25 | Timeout Chalkboard (`timeout-chalkboard`) | Turns the 30-second huddle into a written tactic. | Select the tactic block while the FIVB timer runs; export the board. |
| 26 | Momentum Coach (`momentum-coach`) | Reads momentum and tells you to serve tight or call time. | Log recent rally outcomes across the 6-rally window; get the call with reasons. |
| 27 | Snake Captain Draft (`captain-draft`) | Runs a snake pick that yields two fair teams. | Paste the player list; the snake order and audit come out ready. |
| 34 | Practice Planner (`practice-planner`) | Builds a 60/90/120-minute practice in blocks. | Choose focus and duration; read blocks with objectives, drills and scoring targets. |
| 39 | Recruiting Dossier (`recruiting-dossier`) | Pitches a college recruit without a scanner. | Enter goals, graduation year and measurables; get a sealed dossier ready to send. |
| 44 | Team Treasury (`team-treasury`) | Ends the who-paid-the-jersey confusion. | Enter fees, ball fund and payments; get per-player balances and exports. |
| 53 | Shot Heatmap (`shot-heatmap`) | Reads opponent attack tendencies by zone. | Tap origin then landing; read hot zones, efficiency and share per zone. |
| 57 | Bracket Architect (`bracket-architect`) | Seeds brackets without repeat pairings before the final. | Paste the team list; get the seeded round with byes and the full round list. |

| 61 | Club White-Label Studio (`club-white-label`) | Gives your club its own colours instead of the generic app skin. | Enter the name plus three colours; check readable contrast and copy the CSS variables. |

### Referees

| # | Module | Why it is useful | How to use it |
|---|--------|------------------|---------------|
| 16 | FIVB Lineup Slip I-VI (`lineup-slip`) | Prevents lineup-sheet errors and libero windows gone wrong. | Enter the 6 starters I-VI; the slip validates and prints with the libero window. |
| 17 | Integrity Seal (`integrity-seal`) | Proves a sheet was not modified after signing. | Sign canonical JSON with HMAC-SHA256; verify later in one call. |
| 19 | Referee Whistle Console (`referee-console`) | Speaks the 21 FIVB cards from your pocket. | Pick the event; read the card, the signal and the formal wording. |
| 28 | Roster Pass (`roster-pass`) | Audits a match roster against the 12-player rules. | Paste the roster; get captain/libero checks and the pass. |
| 29 | Net & Ball Inspector (`equipment-inspector`) | Certifies net height and ball pressure tolerances. | Enter measured values; get pass/fail against the official tolerances. |
| 36 | Player Career Passport (`player-career`) | Hands a club-ready progress dossier. | Grade the 5 axes vs benchmarks; get the 0-100 index and the next improvement. |
| 43 | ELO / FIVB Ranking (`elo-ranking`) | Ranks teams with margin weighting, not just win/loss. | Enter ratings and result; read the new ratings step by step. |
| 48 | Air-Gapped QR Sync (`qr-sync`) | Clones state between phones with no network at all. | Choose payload and matrix size; scan the signed SVG matrix with both devices offline. |
| 50 | FIVB Scoresheet (`fivb-escoresheet`) | Produces the official A4 acta including sanctions. | Enter sets (Bo3/Bo5), subs, sanctions and signatures; print the acta. |
| 56 | Tiebreak Commander (`tiebreak-commander`) | Referees the deciding set calmly at 14-14. | Enter score and server; read the phase, switch alert and the recommendation. |

### Fans

| # | Module | Why it is useful | How to use it |
|---|--------|------------------|---------------|
| 7 | OBS TV Overlay (`overlay`) | Feeds the stream overlay without websockets. | Pick theme and teams; paste the 1920x1080 SVG into OBS. |
| 18 | .volleyos Capsule (`capsule-io`) | Moves a whole match save between devices. | Export state to capsule, import on the other device; sealed JSON. |
| 22 | Fan Companion (`fan-companion`) | Trivia and referee-gesture practice for the stands. | Log plays; read the trivia line and the gesture to learn. |
| 24 | Court MVP Awards (`mvp-awards`) | Delivers tamper-proof post-match awards. | Score the match; get best scorer, best blocker and best defender with a sealed token. |
| 30 | SVG Match Poster (`match-poster`) | Promotes next week's fixture in one tap. | Choose theme, size and copy; export a 1080x1920 or 1080x1080 SVG poster. |
| 35 | Play-by-Play Narrator (`play-by-play`) | Narrates the match in ES/EN/PT. | Log events; read the running commentary feed. |
| 46 | Stadium Arena DJ (`arena-dj`) | Fires block / spike / ace cues without internet. | Pick the event; the WebAudio cue and banner fire instantly. |
| 47 | World Court Slang (`court-slang`) | Explains AR/ES/MX/BR/US court terms for visitors. | Enter a term and origin; read meaning, real usage and a local phrase. |
| 58 | Sponsor Deck (`sponsor-deck`) | Values banners and posts in local money. | Enter impressions, reach, CPM and engagement; read tier, effective CPM and the value. |
| 59 | Head to Head (`head-to-head`) | Sums two teams' record before the fixture. | Enter match scores; read wins, sets, leader and the current streak. |

## Architecture & security shield

- **Backend:** Python 3.13+ / FastAPI / Pydantic v2, Decimal-only physics and money (zero binary floats), SQLite (WAL) for live rooms and jobs.
- **Frontend:** Next.js App Router + TypeScript strict (zero any), Tailwind, Zod, Vitest; 61 TS mirrors of the 61 Python engines.
- **Android:** Gradle, AGP 8.5.2, JDK 17; hardened WebView; JS bridge for volume scoring, back navigation and the gym screen; screenOrientation="user" everywhere, so the phone's own rotation lock is always respected.
- **Security:** CSP and strict privacy headers (no-store, nosniff, no-referrer, DENY framing), 256 KiB body cap, 120 req/min/IP, XSS and formula-injection sanitisation, HMAC-SHA256 integrity seals.
- **Dual build:** NEXT_PUBLIC_BUILD_TARGET=cloud|fdroid compiles the same code for the commercial Cloud Pro and the F-Droid free build.
- **Creator key:** only the SHA-256 digest ships in the public build; the raw master key never leaves GitHub Secrets or your machine.

### Dual APK builds

| Build | Flags | Unlocks | Distribution |
|-------|-------|---------|--------------|
| voleyos-universal.apk | cloud target, dev unlock off | Standard catalog + Cloud Pro paywall | Public GitHub Release |
| voleyos-creator-unlocked.apk | cloud target, dev unlock on | 100% of modules + White-Label, zero paywalls | Owner only (artifact, deleted after download) |

## Self-hosting guide

```bash
# Windows
run_local.bat

# Linux / macOS
./run_local.sh
```

Backend at http://localhost:8000 (API docs at /docs), app at http://localhost:3000. With Docker:

```bash
docker compose up --build
```

To serve the app with no backend at all:

```bash
cd frontend && VOLEYOS_STATIC_EXPORT=true npm run build
# host ./out with any static file server; everything works offline.
```

Android APK locally:

```bash
build_apk.sh        # or build_apk.bat on Windows
```

## API surface

- `GET /api/v1/health/deep` - 61-engine health and version.
- `GET /api/v1/catalog/modules` - modules, samples, profiles and pricing.
- `POST /api/v1/modules/{slug}/run` and `/demo` - run an engine.
- `POST /api/v1/security/verify-seal` - verify a signed match sheet.
- `POST /api/v1/live` -> `GET /api/v1/live/{room_id}` - create and read a SQLite-backed live room; PATCH and DELETE require X-Admin-Token.
- `POST /api/v1/jobs` -> `GET /jobs/{id}/preview` -> signed payment webhook -> `GET /jobs/{id}/download?format=xlsx|csv` (402 until paid).
- `DELETE /api/v1/jobs/{id}` - destroy data and return a signed UTC receipt.

Every API response carries no-store, nosniff, SAMEORIGIN, no-referrer and a strict Permissions-Policy. Mutating requests are capped at 256 KiB and 120 per minute per IP.

## Development gates

```bash
cd backend && .venv/Scripts/python -m pytest -q       # Windows
cd backend && .venv/bin/python -m pytest -q            # Linux/macOS
cd backend && .venv/Scripts/python -m ruff check app tests
cd backend && .venv/Scripts/python -m mypy --strict app
cd frontend && npm run typecheck && npm run test && npm run build
```

## Documentation

- `docs/HANDOFF.md` - sprint log and current state.
- `docs/QA_REPORT.md` - gates, E2E evidence and known limits.
- `docs/LAUNCH_PLAYBOOK.md` - deploy, domain, payments, rollback.
- `docs/FDROID_SUBMISSION_GUIDE.md` - offline Android distribution.
- `docs/openapi.json` - generated API contract.
- `SECURITY.md` - vulnerability disclosure and threat model.
- `CONTRIBUTING.md` - local setup, style and pull-request gates.

## License

AGPL-3.0-or-later (see LICENSE). F-Droid friendly: no tracking, no proprietary SDKs, no telemetry. Commercial White-Label runs under a separate agreement - the open core stays open.
