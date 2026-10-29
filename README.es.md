# VolleyOS Global

[English](README.md) · **Español** · [Português](README.pt.md)

[![Version](https://img.shields.io/badge/version-v10.2.3-FF3B5C?style=for-the-badge)](https://github.com/v0idbrn/VoleyOS/releases/latest)
[![Módulos](https://img.shields.io/badge/módulos-61-FF3B5C?style=for-the-badge&color=EAB308)](#enciclopedia-de-los-61-módulos)
[![Offline](https://img.shields.io/badge/100%25-offline--primero-FF3B5C?style=for-the-badge&color=EAB308)](#por-qué-existe-volleyos)
[![Android](https://img.shields.io/badge/APK%20Android-voleyos--universal-FF3B5C?style=for-the-badge&color=EAB308)](https://github.com/v0idbrn/VoleyOS/releases/latest/download/voleyos-universal.apk)
[![Licencia](https://img.shields.io/badge/licencia-AGPL--3.0--o--posterior-FF3B5C?style=for-the-badge&color=EAB308)](LICENSE)

## 📱 Descargar APK para Android

[![Download APK](https://img.shields.io/badge/APK-voleyos--universal.apk-FF3B5C?style=for-the-badge&logo=android)](https://github.com/v0idbrn/VoleyOS/releases/latest/download/voleyos-universal.apk)

APK universal firmado, construido por GitHub Actions en cada tag `v*`. Android 7.0+ (minSdk 24), trilingüe, offline primero, sin cuentas y sin telemetría. Listo para F-Droid.

## 🆕 Novedades de v10.2.3 — Escudo y cancha conectada

- **🏆 Escudo completo de VoleyOS**: se acabó el círculo de relleno — rombo obsidiana, medallón carmesí, pelota con costuras, pico V blanco y rojo y la píldora VOLEY/OS en el icono adaptativo, los 10 PNG de densidad y los iconos web.
- **🛡️ Play Protect 100% limpio**: desapareció el permiso CÁMARA y todos los puenteados de permisos del WebView; el escáner QR abre directo con *Subir Foto del QR* y *Pegar Código / ID en 1 Toque*, y el puntaje por botones de volumen usa `onKeyDown`/`onKeyUp` estándar (v10.2.1).
- **📱 Modo Simple de verdad**: en celulares y navegadores arranca con 3 pestañas (Cancha, Picadito & Amigos, Ajustes) y oculta la grilla de 61 módulos, Pizarra, Lab & IA, las banners de perfil y el buscador técnico; *Modo Pro* devuelve la app completa. También arregla el ícono que faltaba en el launcher de Android 8–14 (v10.1.3).
- **🖍️ Marcador de Cancha renovado**: Nuevo Partido y Reiniciar Set a un toque siempre arriba, editor de puntos/sets sincronizado con el contador y el historial de sets, banners de ganador y de set ganado con Revancha / Nuevo Partido / Deshacer, más la insignia SACA, los botones −1 y los chips rápidos (v10.2.0).
- **👥 Co-arbitraje multi-admin**: varios teléfonos anotan el mismo partido a la vez, o abrís la sala a *Todos Anotan* (Mesa Abierta) para que cualquier celular conectado anote, cambie el saque o deshaga — por salas nube o el hotspot `:8765`, con sincronización sin conflictos por número de revisión (v10.2.2).
- **Mantiene todo lo v10.1.2/v10.1.0/v10.0.x**: escáner QR nativo, desbloqueo PRO de pantalla a pantalla, audio unificado de la cancha, tablero Simple/Pro, bóveda Olympus Titan, micro-scout en vivo y overlay de TV.

## 🆕 Novedades de v10.1.2 — Edición lista para la cancha

- **📷 Escáner QR con cámara integrado**: lector nativo (cámara / subir foto / pegar del portapapeles / manual) que lee IDs de dispositivo, códigos de sala, URLs de hotspot y licencias a pantalla completa en el teléfono — sin tiendas ni instalaciones extra.
- **🔑 Desbloqueo PRO de pantalla a pantalla**: mostrá tu licencia o QR del dispositivo y dejá que un amigo la escanee para activar PRO al instante en su teléfono — sin servidor.
- **🔈 Audio unificado de la cancha**: todos los silbatos y cues de arena (monster block, super spike, sirena de ace, suspense del desafío, punto de set) pasan por el motor PCM de alta ganancia + AudioTrack nativo, así los eventos automáticos suenan tan fuerte como la barra manual.
- **📋 Puente nativo de portapapeles y descargas**: cada copia y exportador (.png/.csv/.svg/.vos/.xlsx) llega al portapapeles de Android y a Descargas públicas bajo el origen `file://` del APK, con un aviso veraz — sin fallos silenciosos.
- **💬 Diálogos JS visibles + permisos de cámara**: `alert`/`confirm`/`prompt` se renderizan de forma nativa y el WebView concede la cámara/micrófono que necesita el escáner.
- **Mantiene todo lo v10.1.0/v10.0.x**: tablero Simple/Pro, bóveda Olympus Titan, micro-scout en vivo, overlay de TV y el icono adaptativo obsidiana/carmesí.

## 🆕 Novedades de v10.0.0 — Edición Olympus Titan

- **🛡️ Bóveda a prueba de fallos y manipulación**: motor IndexedDB de 500 MB que supera el techo de 5 MB del WebView, partidos de Mi Temporada encadenados con Merkle, exportaciones `.vos` con AES-256-GCM y un reloj monotónico que rechaza el viaje en el tiempo de las licencias.
- **🥊 Micro-scout en vivo**: etiquetá cada punto en un toque (ataque/bloqueo/ace/toque/error rival) desde ⏱️ Cancha y obtené un box score R1–R6 estilo DataVolley — K1 de side-out, K2 de break-point, eficiencia de ataque, aces/bloqueos — más una 🧠 alerta de rotación sangrando con la zona a cubrir o el tiempo muerto a pedir.
- **🗺️ Cero doble carga**: las coordenadas de tus remates etiquetados alimentan el Mapa de Calor de Remates solas, para un reporte completo al cierre del partido.
- **📺 Overlay de TV estilo VNL/ESPN** en `/tv`: chips set por set, marcador en vivo de sala/malla y parámetros para OBS Browser Source `?chroma=1` (verde EBU `#00B140`) y `?clean=1` (sin controles).
- **🔑 Malla de banca con PIN**: el hotspot de cancha sin datos bloquea `/state` tras un PIN de 4 dígitos; los celulares del banco escanean un QR al marcador gigante bloqueado en `http://<ip>:8765/?pin=NNNN` — 0 MB de internet.
- **🔫 Radar de pelota en vivo**: armá al lanzar, pará en la puerta y leé km/h con mejor/promedio y niveles PRO/ÉLITE/CLUB/BASE sobre puertas de 3 m, 9 m y 18 m.
- **⚡ Test de tiempo de reacción**: pad de estímulo a prueba de salidas anticipadas (demora 0,8–2,2 s, ventana 80–1200 ms) con promedio/mejor/nota en el Entrenador de Reflejos.
- **⫲ Telestrator dividido 2.0**: cargá los videos A y B lado a lado con trazos independientes y sincronización en un toque.
- **Mantiene todo lo de v9.4/v9.5**: el escudo anti-hack, la ergonomía de cancha, el kit del borde del atleta, ⭐ Mis Fijas y la bóveda `.vos` firmada.

## ❤️ Apoyá VolleyOS

Gratis, 100% offline, sin cuentas, sin telemetría y sin anuncios — bancado por la comunidad.

- ☕ Ko-fi: https://ko-fi.com/unfrgvnn
- 💵 Alias Mercado Pago: `unfrgvnn.dead`
- 👑 Canjeá un código `VOS-CHIP` desde la Consola Keygen del Creador para la insignia dorada; los patrocinadores aparecen en estos README con cada release.

## Por qué existe VolleyOS

El voleibol se anota, se entrena y se organiza en las **peores superficies para la tecnología**: gimnasios callados, sol de playa, mesas de torneo con teléfonos muriéndose. Las herramientas que adoptó el deporte son planillas de papel, apps de nube que mueren en el minuto cero o suscripciones detrás de una cuenta que nadie del gimnasio tiene. VolleyOS ataca de frente esos dolores:

- **Anotadores** no pueden escribir con guantes en un gimnasio ruidoso: VolleyOS anota con los **botones de volumen físicos**, muestra una **pantalla gigante legible a 30 metros** y nunca pide internet.
- **DTs** no tienen tiempo para cuatro toques por dato: scouting, tempi, validación de rotación y monitoreo de carga corren en un toque, con resultados legibles en mitad del set.
- **Árbitros** deben conservar la planilla oficial offline: VolleyOS produce un acta A4 FIVB imprimible con sets, cambios, sanciones y sello SHA-256, más un clon QR de la pizarra viva para la mesa, sin conexión.
- **Organizadores** arman llaves en servilletas: VolleyOS siembra llaves eliminatorias, equilibra picaditos, rajea costos de cancha a centavo exacto y valora decks de sponsors.
- **Hinchas** quieren contexto sin cuentas: trivia de tribuna, jerga mundial de cancha y pósters corren localmente.

Todo corre dentro del navegador o WebView con **cero pedidos de red**, trilingüe (**ES / EN / PT**) con vocabulario de cancha auténtico — *armador, recupero K1, costura, pipe, enroque* — nunca traducciones literales robotizadas.

## Cómo se usa VolleyOS: la pestaña nativa de 5 secciones

La app es un cascarón fijo `100dvh` con tacto Android. Al primer arranque, un **onboarding de 3 toques** (idioma → rol → cuatro favoritas) abre la pestaña que vas a usar más y fija los cuatro módulos que importan en tu rol.

### 🏠 Inicio

- Filtrá los 61 módulos por tu rol (6 perfiles, 10 u 11 módulos cada uno) o buscá por nombre.
- Marcala con estrella para fijarla arriba: tu estación diaria queda a un toque.
- Cada tarjeta trae número, ícono y tagline para que encuentres "la de rotación" sin saber slugs.
- Abrí la suite 🍻 Picadito & Amigos desde la barra superior: las 8 herramientas casuales para el picadito de todos los días, también resaltada dentro del modo 🌱 Novato.

### ⏱️ Cancha

1. **Creá tus equipos una sola vez:** nombre, código de 3 letras y color de camiseta quedan en `localStorage`. Dentro de cada equipo gestionás hasta **20 jugadores** — 6 titulares (zonas I–VI), suplentes de banco, hasta 2 líberos — con número, nombre, posición (`S / OH / MB / OPP / L`) y distintivo de capitán. Pegá toda la planilla de un golpe: `10 Juan S, 7 Pedro OH, 12 Lucas MB`.
2. **Elegí el formato:** **Al mejor de 3** (sets 1–2 a 25, definitorio a 15) o **Al mejor de 5** (sets 1–4 a 25, definitorio a 15), con **deuce oficial ventaja de 2** o **punto de oro**.
3. **Anotá sin mirar el teléfono:** `Vol+` suma al local, `Vol-` a la visita, el toque largo deshace el último punto — no desbloqueás nada en medio del rally.
4. **El motor cierra el set por vos:** a 24-24 el objetivo se extiende (26-24, 27-25…), los banners **SET POINT** / **PARTIDO** aparecen solos, el set se archiva a 25-x / 26-24, y un set definitorio activa el tie-break a 15 con el aviso de **cambio de lado al punto 8**.
5. **Deshacer entre sets:** ¿apretaste `+1` a 24-20 por error? `⏪ Deshacer` reabre el set en 24-20 con el contador de sets intacto.
6. Abrí la **Pantalla Gigante de Gimnasio** (botón `TV`): un tablero a pantalla completa que el público lee desde la tribuna.

### 📋 Pizarra

- Validá formaciones **5-1 / 6-2 / 4-2** y faltas de solapamiento FIVB contra la rotación que estás corriendo.
- Animá una secuencia saque→transición→ataque en **3 fases** sobre la cancha SVG con tu alineación activa.
- Tocá el origen del ataque, tocá el destino, marcá el resultado (`#` mate, `!` en juego, `=` bloqueada) y armá el **mapa de calor** de las 9 zonas.
- Usá la calculadora de sombra de bloqueo para cubrir con doble bloqueo y el lab de block-out para decidir manos abajo o cepillar el bloqueo.

### ⚡ Lab & IA

- Cargá un video de la galería en el **telestrador cuadro por cuadro** (`-1` / `+1` a 30/60/120 fps, cámara lenta 0.1x–1x).
- Marcá **despegue** y **aterrizaje** y leé la altura del salto vertical al instante por tiempo de vuelo (`h = ⅛ · g · t²`), exacta al centímetro a 60 fps.
- Dibujá vectores de ataque y ángulos articulares sobre el video y exportá la captura anotada con sello `VOS-SEAL`.
- Corré el lab de biomecánica de 5 fotogramas, el entrenador de tempi y el radar de habilidades de 6 ejes.

### ⚙️ Ajustes, bóveda y sincro QR

- Exportá libros **OpenXML `.xlsx`** reales y planillas A4 imprimibles en Modo Avión — sin app de planillas, sin servidor, sin cuenta.
- Cloná una pizarra viva a otro teléfono vía **QR multiframe** (tokens firmados HMAC) con ambos aparatos offline.
- Guardá reportes en la **bóveda efímera** y destruílos con un toque (delete real, sin papelera).
- El copiar/pegar nativo funciona en toda entrada de texto — pegá una planilla o una llave sin pelear.

### 🍻 Picadito & Amigos

Ocho herramientas para el jugador de todos los días, a un toque desde la barra de Inicio y resaltadas dentro del modo 🌱 Novato; el tablero también trae el rotador con banco y el límite de saques.

| Herramienta | Qué hace |
| --- | --- |
| 📋 Armador de Lista de WhatsApp | Pegá la lista del grupo, poné el cupo, promové la lista de espera cuando alguien se baja y copiá la lista actualizada o el cartel "nos falta 1". |
| 🪇 Rotador con Banco (7-10) | Rota las 6 zonas en cada recuperación y mete al próximo del banco en la posición I o VI, con tabla de rotaciones justa. |
| 🎯 Límite de Saques Recreativo | Off / 3 / 5 saques seguidos en el picadito, con cartel amistoso cuando un sacador se lleva el partido. |
| ⚖️ El Juez del Picadito | Resuelve las 5 clásicas (roqueta, mano dura, dedo, doble toque y red) con lo que los capitanes acuerdan y la regla en 3 idiomas. |
| 📣 Traductor de Señas y Gritos | Buscador de gritos de cancha ES/EN/PT sin importar acentos, con el contexto de uso. |
| 🔥 Entrada en Calor Express (4 min) | Cronómetro de 4 fases: movilidad, activación, rebote y golpes, listo en cuatro minutos. |
| 💰 La Vaquita 2.0 Compensada | Cierra cuotas contra créditos por equipo en centavos enteros y avisa si falta plata en la caja. |
| 🏆 Premios del Picadito | Cartel SVG para compartir en un toque: campeón, premio, subcampeón y MVP. |

## Enciclopedia de los 61 módulos

Seis perfiles de rol, diez u once módulos cada uno. Cada entrada: para **qué** sirve y **cómo** se usa.

### Jugador

| # | Módulo | Para qué sirve | Cómo se usa |
|---|--------|----------------|-------------|
| 1 | Laboratorio 5 Fotogramas (`biomechanics`) | Convierte un mal remate en diagnóstico mecánico, no en vista del DT. | Entrá los 5 checkpoints (rodilla, armado, impacto, ventana, simetría); salís con puntaje y corrección prioritaria. |
| 2 | Picaditos Parejos (`pickup`) | Nadie arma equipos alineando amigos a la suerte. | Pegá nombres con calificación; salen dos equipos parejos y la sentencia del Rey de Cancha. |
| 3 | VolleyCard y Radar (`volleycard`) | Le muestra al jugador como lo lee un scout. | Calificá salto / ataque / saque / recepción / defensa / lectura 1–99; exportá la tarjeta. |
| 4 | Tiempos de Ataque (`tempo`) | Enseña tempo 1/2 y el hueco del pipe en milisegundos reales. | Registrá cada salto del armador; el sistema marca temprano/perfecto/tardío con su tolerancia. |
| 5 | Señas del Armador (`setter-signals`) | Reemplaza el código de dedos por llamadas auditables sin colisiones. | Elegí tu sistema; la hoja demuestra que ninguna seña choca con otra. |
| 6 | Radar de Velocidad de Saque (`serve-radar`) | Convierte km/h crudos en plan de aces. | Entrá velocidad y zona receptora; salís con plan de saque y lectura de reacción. |
| 7 | Lab de Aerodinámica Magnus (`ball-aerodynamics`) | Explica con números un flotado que muere en pleno vuelo. | Entrá velocidad, rotación y ángulo de lanzamiento; revisá predicción de caída y crisis de flotado. |
| 8 | Recortador de Highlights (`rally-clipper`) | Arma un reel sin editor de video. | Logueá inicio/fin en segundos y habilidad por rally; salís con plan ffmpeg y EDL. |
| 9 | Telestrador de Video (`video-telestrator`) | Convierte video de galería en datos de biomecánica. | Cargá el video, caminá cuadros, marcá despegue y aterrizaje; exportá la telestración sellada. |
| 10 | Animador de Jugadas (`playbook-animator`) | Reemplaza las tizas con una jugada animada en 3 fases. | Elegí fases (saque, transición, ataque), jugadores y zona objetivo; reproducí y exportá el SVG. |

### DT & Táctica

| # | Módulo | Para qué sirve | Cómo se usa |
|---|--------|----------------|-------------|
| 2 | Pizarra 5-1 y Solapamiento (`rotation`) | Mata las derrotas por rotación antes del silbato. | Armá las formaciones R1–R6; el validador marca solapamientos y corrige la pizarra. |
| 3 | Scouting en 3 Toques (`scouting`) | Produce un mapa real del rival en mitad de partido. | Tocá ubicación, zona y resultado por pelota; el reporte rankea amenazas y zonas. |
| 12 | Monitor ACWR (`acwr`) | Detecta el pico de carga antes de que paguen las rodillas. | Registrá saltos diarios; leé la razón agudo/crónico y los límites semanales seguros. |
| 13 | Sombra de Bloqueo y Cobertura (`block-shadow`) | Cuantifica quién queda destapado con tu doble bloqueo. | Elegí bloqueadores y esquema; leés el % de cancha cubierta y las costuras libres. |
| 15 | Auditor de Imprevisibilidad del Armador (`setter-iq`) | Encuentra qué sets ganan y cuáles se regalan. | Entrá cada distribución; leé imprevisibilidad y eficiencia por set. |
| 32 | Matriz 6x6 de Cruces (`matchup-matrix`) | Poné tus mejores bloqueadores sobre la cañona rival. | Calificá la matriz 6x6 atacante/bloqueador; salís con mejor rotación y orden de saque. |
| 40 | Simulador 4-2 / 6-2 / 5-1 (`system-transition`) | Confirma qué sistema hace pie con tu plantel. | Calificá armadores, consistencia de recepción y penetración; leés la recomendación. |
| 41 | Lector de Engaños (`deception-reader`) | Mide qué tan legibles son tus atacantes. | Entrá velocidad de carrera, altura de codo y línea de pelota; leés el compromiso probable de la defensa. |
| 54 | Nutrición de Torneo (`tournament-nutrition`) | Mantiene vivo un doblete hasta el quinto set. | Entrá peso, partidos, minutos, temperatura y tasa de sudor; leés carbohidratos, líquido y sodio. |
| 55 | Prehab de Lesiones (`injury-prehab`) | Marca el riesgo de rodilla y hombro antes de que el volumen los lesione. | Entrá volumen de saltos, remates, sueño y dolor; salís con puntaje de riesgo, tope de saltos y ejercicios. |

### Cancha

| # | Módulo | Para qué sirve | Cómo se usa |
|---|--------|----------------|-------------|
| 4 | Tablero Indoor 6v6 (`scoreboard`) | Reemplaza el marcador de cartón y la planilla de papel. | Anotá con los botones de volumen; deuce, cierre de set e historial automáticos. |
| 8 | VAR de Bolsillo (`var`) | Resuelve disputas de toque a nivel canchita. | Registrá la jugada; salís con la llamado, la moneda y el contador de retos. |
| 9 | Beach 2v2 (`beach`) | Anota reglas de arena, cambios y formato Newcom. | Elegí 2x2; los cambios y objetivos de set quedan resueltos. |
| 14 | Radar de Costuras de Recepción (`seam-radar`) | Ve la costura del pasador antes que el saque. | Elegí tipo de saque y posiciones receptoras; leés el hueco en cm y a quién le toca cubrir. |
| 20 | Control de Cambios y Reingresos (`substitution-tracker`) | Mantiene a la mesa honesta con el límite de 12 cambios. | Logueá cambios y reingresos; chequeá el conteo vivo y el límite. |
| 33 | Lab de Block-Out (`blockout-lab`) | Pone precio esperado a manos abajo vs cepillar el bloqueo. | Elegí el esquema de bloqueo; salís con la decisión y la explicación. |
| 42 | Mini y Vóley Sentado (`inclusive-adaptive`) | Adapta cualquier partido a sentado, mini o mixto. | Elegí modo, categoría y cantidad de jugadores; leés el reglamento adaptado. |
| 45 | House Rules y Relojito (`house-rules`) | Corre un partido nocturno con reglas de calle sin caos. | Elegí formato, orden de banco y puntaje; salís con la lista blanca para arrancar, o la falta. |
| 49 | Pantalla Gigante de Gimnasio (`gym-screen`) | Transmite el marcador mismo hacia la tribuna. | Tocá `TV` o llamá al bridge; un tablero a pantalla completa a 30 metros toma la pantalla. |
| 60 | Reflejo Periférico (`peripheral-reflex`) | Entrena la vista que gana picados durondos en sets cerrados. | Registrá tiempos de reacción en ms; leés promedio, dispersión, consistencia y rating. |

### Torneo & Picadito

| # | Módulo | Para qué sirve | Cómo se usa |
|---|--------|----------------|-------------|
| 5 | Torneos Relámpago (`tournament`) | arma un cuadro y publica posiciones sin Excel. | Elegí equipos y formato; salís con calendario, posiciones y movimientos de ranking. |
| 21 | La Vaquita de la Cancha (`court-split`) | Termina la pelea de "quién pone qué" en tres segundos. | Entrá horas de cancha y tarifas locales por hora; salís con el raleo por jugador al centavo. |
| 25 | Pizarra de Tiempo Muerto (`timeout-chalkboard`) | Convierte los 30 segundos de huddle en táctica escrita. | Elegí el bloque táctico con el timer FIVB corriendo; exportá la pizarra. |
| 26 | Coach de Momentum (`momentum-coach`) | Lee el momento y te indica apretá el saque o pedí tiempo. | Logueá los últimos rallys de la ventana de 6; salís con la llamada y los motivos. |
| 27 | Draft Serpiente (`captain-draft`) | Corre un picking en snake que rinde dos equipos justos. | Pegá la lista de jugadores; salís con el orden serpiente y la auditoría listos. |
| 34 | Planificador de Práctica (`practice-planner`) | Arma una práctica de 60/90/120 minutos en bloques. | Elegí enfoque y duración; leés bloques con objetivos, ejercicios y metas de puntos. |
| 39 | Dossier de Reclutamiento (`recruiting-dossier`) | Postula a un recluta universitario sin escáner. | Entrá objetivos, año de egreso y medibles; salís con un dossier sellado listo para mandar. |
| 44 | Tesorería del Equipo (`team-treasury`) | Termina el quién-pagó-la-camiseta. | Entrá cuotas, fondo de pelotas y pagos; leés balances por jugador y exportaciones. |
| 53 | Mapa de Calor de Remates (`shot-heatmap`) | Lee tendencias de ataque del rival por zona. | Tocá origen y destino; leés zonas calientes, eficiencia y reparto por zona. |
| 57 | Arquitecto de Llaves (`bracket-architect`) | Siembra llaves sin cruces repetidos antes de la final. | Pegá la lista de equipos; salís con la ronda sembrada, los libres y todas las rondas. |

| 61 | Estudio Marca Blanca de Club (`club-white-label`) | Tu club deja de verse genérico dentro de la app. | Cargá nombre y tres colores; revisás el contraste legible y copiás las variables CSS. |

### Árbitro & Mesa

| # | Módulo | Para qué sirve | Cómo se usa |
|---|--------|----------------|-------------|
| 16 | Boleta FIVB I-VI (`lineup-slip`) | Previene errores de boleta y ventanas de líbero torcidas. | Entrá los 6 titulares I–VI; la boleta valida e imprime con la ventana del líbero. |
| 17 | Sello Criptográfico Anti-Trampa (`integrity-seal`) | Prueba que una planilla no se tocó tras firmarse. | Firmá JSON canónico con HMAC-SHA256; verificá después en una llamada. |
| 19 | Consola de Árbitro y Silbato (`referee-console`) | Habla las 21 tarjetas FIVB desde el bolsillo. | Elegí el evento; leés tarjeta, gesto y redacción formal. |
| 28 | Pase de Plantel (`roster-pass`) | Audita un plantel contra las reglas de 12 jugadores. | Pegá el plantel; salís con chequeos de capitán/líbero y el pase. |
| 29 | Inspector de Red y Balón (`equipment-inspector`) | Certifica altura de red y presiones de pelota dentro de tolerancia. | Entrá los valores medidos; salís con pasa/falla contra las tolerancias oficiales. |
| 36 | Pasaporte de Carrera (`player-career`) | Entrega un dossier de progresión listo para el club. | Calificá los 5 ejes contra referencias; salís con índice 0-100 y la próxima mejora. |
| 43 | Ranking ELO / FIVB (`elo-ranking`) | Rankea equipos ponderando margen, no solo victoria. | Entrá ratings y resultado; leés los ratings nuevos paso a paso. |
| 48 | Sincro QR sin Conexión (`qr-sync`) | Clona estado entre teléfonos sin red alguna. | Elegí payload y tamaño de matriz; escaneá la matriz SVG firmada con ambos aparatos offline. |
| 50 | Planilla FIVB (`fivb-escoresheet`) | Produce el acta A4 oficial con sanciones incluidas. | Entrá sets (Bo3/Bo5), cambios, sanciones y firmas; imprimí el acta. |
| 56 | Comandante de Tie-Break (`tiebreak-commander`) | Arbitra el set definitorio con calma a 14-14. | Entrá marcador y sacador; leés fase, aviso de cambio de lado y la recomendación. |

### Tribuna & Redes

| # | Módulo | Para qué sirve | Cómo se usa |
|---|--------|----------------|-------------|
| 7 | Overlay TV para OBS (`overlay`) | Alimenta el overlay del stream sin websockets. | Elegí tema y equipos; pegá el SVG 1920x1080 en OBS. |
| 18 | Cápsula Universal .volleyos (`capsule-io`) | Mueve una partida completa entre aparatos. | Exportá estado → cápsula → importá en el otro aparato; JSON sellado. |
| 22 | Compañero de Tribuna (`fan-companion`) | Trivia y práctica de gestos de árbitro desde la tribuna. | Logueá jugadas; leés la línea de trivia y el gesto que falta aprender. |
| 24 | Premios MVP de Cancha (`mvp-awards`) | Entrega premios post-partido a prueba de trampa. | Calificá el partido; salís con máximo goleador, mejor bloqueador y mejor defensor con token sellado. |
| 30 | Póster SVG del Partido (`match-poster`) | Publica el cruce de la semana en un toque. | Elegí tema, tamaño y texto; exportá un póster SVG 1080x1920 o 1080x1080. |
| 35 | Narrador Play-by-Play (`play-by-play`) | Narra el partido en ES/EN/PT. | Logueá eventos; leés la crónica corrida. |
| 46 | Arena DJ de Estadio (`arena-dj`) | Dispara cues de bloqueo / remate / ace sin internet. | Elegí el evento; el cue WebAudio y el banner saltan al instante. |
| 47 | Jerga Mundial de Cancha (`court-slang`) | Explica términos AR/ES/MX/BR/US para el visitante. | Entrá el término y origen; leés significado, uso real y una frase local. |
| 58 | Deck de Sponsors (`sponsor-deck`) | Valora banners y posteos en moneda local. | Entrá impresiones, alcance, CPM y engagement; leés tier, CPM efectivo y el valor. |
| 59 | Cara a Cara (`head-to-head`) | Suma el historial de dos equipos antes del cruce. | Entrá marcadores; leés victorias, sets, dominante y la racha vigente. |

## Arquitectura y escudo de seguridad

- **Backend:** Python 3.13+ / FastAPI / Pydantic v2, física y dinero **solo en `Decimal`** (cero floats binarios), SQLite (WAL) para salas y jobs.
- **Frontend:** Next.js App Router + TypeScript estricto (cero `: any`), Tailwind, Zod, Vitest; 61 espejos TS de los 61 motores Python.
- **Android:** Gradle, AGP 8.5.2, JDK 17; WebView endurecida; puente JS para anotar con volumen, navegación atrás y pantalla de gimnasio; `screenOrientation="user"` en todas lados, respetando siempre el bloqueo de rotación del teléfono.
- **Seguridad:** CSP y cabeceras estrictas de privacidad (`no-store`, `nosniff`, `no-referrer`, anti-framing DENY), tope de cuerpo 256 KiB, 120 req/min/IP, saneo XSS e inyección de fórmulas, sellos de integridad HMAC-SHA256.
- **Build dual:** `NEXT_PUBLIC_BUILD_TARGET=cloud|fdroid` compila el mismo código para el Cloud Pro comercial y la versión libre F-Droid.
- **Llave Creator:** solo el digest SHA-256 viaja en la build pública; la llave maestra cruda nunca sale de GitHub Secrets ni de tu máquina.

### Builds duales de APK

| Build | Banderas | Desbloquea | Distribución |
|-------|----------|------------|--------------|
| `voleyos-universal.apk` | target cloud, dev unlock off | Catálogo estándar + paywall Cloud Pro | GitHub Release pública |
| `voleyos-creator-unlocked.apk` | target cloud, dev unlock on | 100% de módulos + White-Label, cero paywalls | Solo del dueño (artefacto, se borra tras descargar) |

## Guía de auto-alojamiento

```bash
# Windows
run_local.bat

# Linux / macOS
./run_local.sh
```

Backend en `http://localhost:8000` (docs de la API en `/docs`), app en `http://localhost:3000`. Con Docker:

```bash
docker compose up --build
```

Para servir la app sin backend alguno:

```bash
cd frontend && VOLEYOS_STATIC_EXPORT=true npm run build
# serví ./out con cualquier servidor de archivos; todo funciona offline.
```

APK Android local:

```bash
build_apk.sh        # o build_apk.bat en Windows
```

## Superficie de la API

- `GET /api/v1/health/deep` - salud y versión de los 61 motores.
- `GET /api/v1/catalog/modules` - módulos, muestras, perfiles y precios.
- `POST /api/v1/modules/{slug}/run` y `/demo` - correr un motor.
- `POST /api/v1/security/verify-seal` - verificar una planilla firmada.
- `POST /api/v1/live` -> `GET /api/v1/live/{room_id}` - crear y leer una sala viva respaldada en SQLite; PATCH y DELETE piden X-Admin-Token.
- `POST /api/v1/jobs` -> `GET /jobs/{id}/preview` -> webhook de pago firmado -> `GET /jobs/{id}/download?format=xlsx|csv` (402 hasta pagar).
- `DELETE /api/v1/jobs/{id}` - destruir datos y devolver un recibo UTC firmado.

Toda respuesta de la API lleva `no-store`, `nosniff`, `SAMEORIGIN`, `no-referrer` y un Permissions-Policy estricto. Los pedidos mutantes se topa en 256 KiB y 120 por minuto por IP.

## Compuertas de desarrollo

```bash
cd backend && .venv/Scripts/python -m pytest -q       # Windows
cd backend && .venv/bin/python -m pytest -q            # Linux/macOS
cd backend && .venv/Scripts/python -m ruff check app tests
cd backend && .venv/Scripts/python -m mypy --strict app
cd frontend && npm run typecheck && npm run test && npm run build
```

## Documentación

- `docs/HANDOFF.md` - bitácora de sprints y estado.
- `docs/QA_REPORT.md` - compuertas, evidencia E2E y límites conocidos.
- `docs/LAUNCH_PLAYBOOK.md` - deploy, dominio, pagos, rollback.
- `docs/FDROID_SUBMISSION_GUIDE.md` - distribución Android offline.
- `docs/openapi.json` - contrato de API generado.
- `SECURITY.md` - divulgación de vulnerabilidades y modelo de amenaza.
- `CONTRIBUTING.md` - instalación local, estilo y compuertas de PR.

## Licencia

AGPL-3.0-or-later (ver `LICENSE`). Amable con F-Droid: sin rastreo, sin SDKs propietarios, sin telemetría. El White-Label comercial corre bajo acuerdo aparte — el core abierto queda abierto.
