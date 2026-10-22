import type { Locale } from "@/lib/local-engines";
import { MODULES } from "@/lib/modules";
import { ALTERNATIVE_ITEMS, TOOL_ITEMS } from "@/lib/seo-market";
import { POSITION_ITEMS, ROTATION_ITEMS } from "@/lib/seo-systems";

export type SeoSection = "modules" | "positions" | "rotations" | "alternatives" | "tools";

export const SEO_SECTIONS: SeoSection[] = ["modules", "positions", "rotations", "alternatives", "tools"];

export const SECTION_LABELS: Record<SeoSection, Record<Locale, string>> = {
  modules: { es: "Módulos", en: "Modules", pt: "Módulos" },
  positions: { es: "Posiciones", en: "Positions", pt: "Posições" },
  rotations: { es: "Sistemas de rotación", en: "Rotation systems", pt: "Sistemas de rotação" },
  alternatives: { es: "Alternativas", en: "Alternatives", pt: "Alternativas" },
  tools: { es: "Herramientas", en: "Tools", pt: "Ferramentas" },
};

export const SECTION_INTROS: Record<SeoSection, Record<Locale, string>> = {
  modules: {
    es: "Treinta y seis estaciones offline que cubren cancha, cuerpo técnico, arbitraje, tribuna y transmisión. Todas funcionan sin internet y sin cuentas.",
    en: "Thirty-six offline stations covering the court, coaching staff, refereeing, fans and streaming. All work without internet or accounts.",
    pt: "Trinta e seis estações offline que cobrem quadra, comissão técnica, arbitragem, torcida e transmissão. Todas funcionam sem internet e sem contas.",
  },
  positions: {
    es: "Roles, zonas y responsabilidades de cada posición del vóley indoor, con métricas que podés medir en VolleyOS.",
    en: "Roles, zones and responsibilities for every indoor volleyball position, with metrics you can measure in VolleyOS.",
    pt: "Papéis, zonas e responsabilidades de cada posição do vôlei indoor, com métricas que você pode medir no VolleyOS.",
  },
  rotations: {
    es: "Compará 5-1, 6-2, 4-2 e híbridos antes de elegir el sistema de tu equipo.",
    en: "Compare 5-1, 6-2, 4-2 and hybrids before choosing your team system.",
    pt: "Compare 5-1, 6-2, 4-2 e híbridos antes de escolher o sistema do seu time.",
  },
  alternatives: {
    es: "Cómo se compara VolleyOS con las herramientas que ya usás, sin marketing vacío.",
    en: "How VolleyOS compares with the tools you already use, without empty marketing.",
    pt: "Como o VolleyOS se compara com as ferramentas que você já usa, sem marketing vazio.",
  },
  tools: {
    es: "Calculadoras y generadores gratuitos, offline y con fórmulas auditables.",
    en: "Free calculators and generators, offline and with auditable formulas.",
    pt: "Calculadoras e geradores gratuitos, offline e com fórmulas auditáveis.",
  },
};

export interface SeoItem {
  slug: string;
  icon: string;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  facts: Record<Locale, string[]>;
  station?: string;
}

type L = Record<Locale, string>;
type LArr = Record<Locale, string[]>;

const l = (es: string, en: string, pt: string): L => ({ es, en, pt });
const la = (es: string[], en: string[], pt: string[]): LArr => ({ es, en, pt });

const MODULE_FACTS: Record<string, LArr> = {
  biomechanics: la(
    ["Rodilla óptima 110°-130° y ventana de mano 15°-35°.", "Salto calculado con h = 1/8 · g · t².", "Penaliza asimetrías de aterrizaje mayores a 10°."],
    ["Knee sweet spot 110°-130° and hand window 15°-35°.", "Jump height from h = 1/8 · g · t².", "Penalises landing asymmetry above 10°."],
    ["Joelho ideal 110°-130° e janela de mão 15°-35°.", "Salto calculado com h = 1/8 · g · t².", "Penaliza assimetrias de aterrissagem acima de 10°."],
  ),
  rotation: la(
    ["Valida R1-R6 al golpe de saque, no durante el rally.", "Detecta solapamientos delantero/zaguero y orden izquierda-derecha.", "Muestra el delta exacto en centímetros para corregir."],
    ["Validates R1-R6 at serve contact, not during the rally.", "Detects front/back and left-to-right overlaps.", "Shows the exact centimetre delta to fix."],
    ["Valida R1-R6 no contato do saque, não durante o rally.", "Detecta sobreposições frente/fundo e ordem esquerda-direita.", "Mostra o delta exato em centímetros para corrigir."],
  ),
  scouting: la(
    ["Convierte 'ataque del 7 por 4 diagonal punto' en un evento codificado.", "Calcula eficiencia, kills y K1 por rotación.", "Genera un mapa de calor 3x3 de nueve zonas."],
    ["Turns 'attack by 7 from 4 diagonal kill' into a coded event.", "Computes efficiency, kills and K1 by rotation.", "Builds a 3x3 heatmap across nine zones."],
    ["Converte 'ataque do 7 pela 4 diagonal ponto' em um evento codificado.", "Calcula eficiência, kills e K1 por rotação.", "Gera um mapa de calor 3x3 de nove zonas."],
  ),
  scoreboard: la(
    ["Sets a 25 con ventaja de dos y decisivo a 15.", "Rotación automática solo en side-out.", "Cambio de lado en el set decisivo al punto 8."],
    ["Sets to 25 with a two-point lead and a 15-point decider.", "Automatic rotation only on side-out.", "Side switch at point 8 in the decider."],
    ["Sets até 25 com vantagem de dois e decisivo até 15.", "Rotação automática apenas no side-out.", "Troca de lado no ponto 8 do set decisivo."],
  ),
  tournament: la(
    ["Puntos 3-0/3-1 = 3, 3-2 = 2, 2-3 = 1.", "Desempate por coeficiente de sets y luego de tantos.", "Tabla exportable a Excel con nota de auditoría."],
    ["Points 3-0/3-1 = 3, 3-2 = 2, 2-3 = 1.", "Ties broken by set ratio, then point ratio.", "Excel-ready table with an audit note."],
    ["Pontos 3-0/3-1 = 3, 3-2 = 2, 2-3 = 1.", "Desempate por coeficiente de sets e depois de pontos.", "Tabela exportável para Excel com nota de auditoria."],
  ),
  pickup: la(
    ["Asigna un armador por equipo antes de repartir niveles.", "Minimiza el delta de promedio entre equipos.", "Sostiene una cola de rey de la cancha."],
    ["Assigns one setter per team before splitting levels.", "Minimises the average-level gap between teams.", "Maintains a king-of-the-court queue."],
    ["Atribui um levantador por equipe antes de dividir níveis.", "Minimiza a diferença de média entre equipes.", "Mantém uma fila de rei da quadra."],
  ),
  overlay: la(
    ["Fuente de navegador transparente para OBS y Streamlabs.", "Banners de SET POINT y MATCH POINT automáticos.", "Muestra saque, racha, sets y sponsor."],
    ["Transparent browser source for OBS and Streamlabs.", "Automatic SET POINT and MATCH POINT banners.", "Shows server, streak, sets and sponsor."],
    ["Fonte de navegador transparente para OBS e Streamlabs.", "Banners automáticos de SET POINT e MATCH POINT.", "Mostra saque, sequência, sets e patrocinador."],
  ),
  var: la(
    ["Cubre líbero, red, invasión, bloqueo, pantalla y rotación.", "Cita la regla FIVB aplicable en cada escenario.", "Sorteo inicial con crypto.getRandomValues."],
    ["Covers libero, net, invasion, block, screen and rotation.", "Cites the applicable FIVB rule for every scenario.", "Coin toss using crypto.getRandomValues."],
    ["Cobre líbero, rede, invasão, bloqueio, tela e rotação.", "Cita a regra FIVB aplicável em cada cenário.", "Sorteio inicial com crypto.getRandomValues."],
  ),
  beach: la(
    ["21 puntos en sets regulares y 15 en el decisivo.", "Cambio de lado cada 7 puntos, o cada 5 en el decisivo.", "Registra qué jugador saca en cada equipo."],
    ["21 points in regular sets and 15 in the decider.", "Side switch every 7 points, or every 5 in the decider.", "Tracks which player serves for each team."],
    ["21 pontos em sets regulares e 15 no decisivo.", "Troca de lado a cada 7 pontos, ou 5 no decisivo.", "Registra qual jogador saca em cada equipe."],
  ),
  volleycard: la(
    ["Radar hexagonal de ataque, recepción, saque, bloqueo, defensa y armado.", "Calcula alcance de remate y de bloqueo en centímetros.", "Rareza ROOKIE a LEGEND según alcance real."],
    ["Hexagonal radar for attack, reception, serve, block, defence and setting.", "Computes spike and block reach in centimetres.", "ROOKIE to LEGEND rarity from real reach."],
    ["Radar hexagonal de ataque, recepção, saque, bloqueio, defesa e levantamento.", "Calcula alcance de ataque e bloqueio em centímetros.", "Raridade ROOKIE a LEGEND pelo alcance real."],
  ),
  tempo: la(
    ["1° tiempo: -180 ms; 2°: 0 ms; pipe: 0 ms; 3°: +350 ms.", "Tolerancias de 30 a 60 ms según el tempo.", "Clasifica cada salto como perfecto, temprano o tarde."],
    ["1st tempo: -180 ms; 2nd: 0 ms; pipe: 0 ms; 3rd: +350 ms.", "Tolerances from 30 to 60 ms per tempo.", "Classifies each jump as perfect, early or late."],
    ["1º tempo: -180 ms; 2º: 0 ms; pipe: 0 ms; 3º: +350 ms.", "Tolerâncias de 30 a 60 ms por tempo.", "Classifica cada salto como perfeito, cedo ou tarde."],
  ),
  acwr: la(
    ["Carga aguda de 7 días contra crónica de 28.", "Zona óptima 0.8-1.3 y alerta sobre 1.5.", "Recomienda descarga ante fatiga acumulada."],
    ["7-day acute load against 28-day chronic load.", "Optimal zone 0.8-1.3 and alert above 1.5.", "Recommends deloading under accumulated fatigue."],
    ["Carga aguda de 7 dias contra crônica de 28.", "Zona ideal 0.8-1.3 e alerta acima de 1.5.", "Recomenda descarga sob fadiga acumulada."],
  ),
  "block-shadow": la(
    ["Cono de sombra con área y cobertura calculadas en Decimal.", "Cada defensor se expulsa del cono o se marca fuera.", "La cobertura usa los 81 m² del campo propio."],
    ["Shadow cone with area and coverage computed in Decimal.", "Every defender is ejected from the cone or flagged outside.", "Coverage uses the 81 m² own court."],
    ["Cone de sombra com área e cobertura calculadas em Decimal.", "Cada defensor é expulso do cone ou marcado fora.", "A cobertura usa os 81 m² da quadra própria."],
  ),
  "seam-radar": la(
    ["Detecta la costura entre los dos receptores más cercanos.", "Asigna dueño por ángulo de perfil y salida del atacante.", "Prioridad CRITICAL cuando la costura supera 260 cm."],
    ["Finds the seam between the two closest receivers.", "Assigns an owner by profile angle and attacker release.", "CRITICAL priority when the seam exceeds 260 cm."],
    ["Detecta a costura entre os dois receptores mais próximos.", "Atribui dono por ângulo de perfil e saída do atacante.", "Prioridade CRITICAL quando a costura passa de 260 cm."],
  ),
  "setter-iq": la(
    ["HHI y dispersión normalizada de 0 a 100.", "Sesgo crítico cuando más del 65% de pases '+' van a una salida.", "Matriz R1-R6 de destinos y recomendaciones."],
    ["HHI and normalised spread from 0 to 100.", "Critical bias when over 65% of '+' passes go to one target.", "R1-R6 target matrix with recommendations."],
    ["HHI e dispersão normalizada de 0 a 100.", "Viés crítico quando mais de 65% dos passes '+' vão a uma saída.", "Matriz R1-R6 de destinos e recomendações."],
  ),
  "lineup-slip": la(
    ["Boleta I-VI con pares separados exactamente tres posiciones.", "Ventana de líbero por rotación y zona trasera.", "Rechaza camisetas duplicadas, incluido el líbero."],
    ["I-VI slip with pairs exactly three positions apart.", "Libero window per rotation and back-row zone.", "Rejects duplicate shirts, including the libero."],
    ["Boleta I-VI com pares exatamente três posições separados.", "Janela de líbero por rotação e zona de fundo.", "Rejeita camisas duplicadas, incluindo o líbero."],
  ),
  "integrity-seal": la(
    ["HMAC-SHA256 sobre JSON canónico con claves ordenadas.", "Hash público SHA-256 para auditar sin revelar el secreto.", "Verificación en tiempo constante y campos alterados."],
    ["HMAC-SHA256 over canonical JSON with sorted keys.", "Public SHA-256 hash to audit without exposing the secret.", "Constant-time verification and changed-field detection."],
    ["HMAC-SHA256 sobre JSON canônico com chaves ordenadas.", "Hash público SHA-256 para auditar sem revelar o segredo.", "Verificação em tempo constante e campos alterados."],
  ),
  "capsule-io": la(
    ["Archivo .volleyos con formato y versión explícitos.", "Checksum SHA-256 del contenido exportado.", "La importación rechaza cualquier alteración del archivo."],
    [".volleyos file with explicit format and version.", "SHA-256 checksum of the exported content.", "Import rejects any modified file."],
    [".volleyos com formato e versão explícitos.", "Checksum SHA-256 do conteúdo exportado.", "A importação rejeita qualquer alteração do arquivo."],
  ),
  "referee-console": la(
    ["Tarjetas FIVB 21.1-21.6 con texto reglamentario.", "Amarilla repetida escala a roja y punto rival.", "Temporizador de saque de 8 s y tiempo de 30 s."],
    ["FIVB 21.1-21.6 cards with the official text.", "A repeated yellow escalates to red and a rival point.", "8 s serve timer and 30 s timeout."],
    ["Cartões FIVB 21.1-21.6 com texto oficial.", "Amarelo repetido escala para vermelho e ponto rival.", "Cronômetro de saque de 8 s e tempo de 30 s."],
  ),
  "substitution-tracker": la(
    ["Seis cambios por set y pares atados por posición.", "El titular puede reingresar una vez por el mismo par.", "La lesión excepcional no consume el cupo."],
    ["Six substitutions per set and position-bound pairs.", "A starter may re-enter once for the same pair.", "Exceptional injury does not consume the limit."],
    ["Seis substituições por set e pares presos à posição.", "O titular pode retornar uma vez pelo mesmo par.", "Lesão excepcional não consome o limite."],
  ),
  "court-split": la(
    ["Reparte cancha, luz y tercer tiempo al centavo exacto.", "Señas, descuentos y devoluciones quedan conciliadas.", "Genera un texto de WhatsApp listo para cobrar."],
    ["Splits court, lights and third half to the exact cent.", "Deposits, discounts and refunds are reconciled.", "Generates a ready-to-send WhatsApp text."],
    ["Divide quadra, luz e terceiro tempo ao centavo exato.", "Sinais, descontos e devoluções ficam conciliados.", "Gera um texto de WhatsApp pronto para cobrar."],
  ),
  "fan-companion": la(
    ["Ocho gestos arbitrales explicados en ES, EN y PT.", "Cinco preguntas de trivia con explicación y regla.", "Rangos desde novato hasta oráculo de tribuna."],
    ["Eight referee gestures explained in ES, EN and PT.", "Five trivia questions with explanation and rule.", "Ranks from novice to tribune oracle."],
    ["Oito gestos de arbitragem em ES, EN e PT.", "Cinco perguntas de trivia com explicação e regra.", "Ranks de novato a oráculo da torcida."],
  ),
  "setter-signals": la(
    ["Siete gestos y seis jugadas posibles por equipo.", "Detecta colisiones de gesto y jugadas duplicadas.", "Exporta una hoja de señas lista para entrenar."],
    ["Seven gestures and six possible plays per team.", "Detects gesture collisions and duplicate plays.", "Exports a training-ready signal sheet."],
    ["Sete gestos e seis jogadas possíveis por equipe.", "Detecta colisões de gesto e jogadas duplicadas.", "Exporta uma folha de sinais pronta para treinar."],
  ),
  "mvp-awards": la(
    ["Seis premios: MVP, Muro, Candado, Francotirador, Albañil y Sangre Fría.", "El líbero recibe peso extra en defensa y pases.", "Tarjeta compartible sellada con HMAC-SHA256."],
    ["Six awards: MVP, Wall, Lock, Sniper, Builder and Ice.", "The libero gets extra weight in defence and passes.", "Share card sealed with HMAC-SHA256."],
    ["Seis prêmios: MVP, Muro, Cadeado, Franco-Atirador, Pedreiro e Sangue Frio.", "O líbero recebe peso extra em defesa e passes.", "Cartão compartilhável selado com HMAC-SHA256."],
  ),
  "timeout-chalkboard": la(
    ["Reloj FIVB de 30 segundos con dos consignas priorizadas.", "Valida cada trazo dentro de la cancha de 9 x 18 m.", "Genera flechas y longitudes listas para la pizarra."],
    ["30-second FIVB clock with two prioritised cues.", "Validates every stroke inside the 9 x 18 m court.", "Produces arrows and lengths ready for the board."],
    ["Relógio FIVB de 30 segundos com duas orientações prioritárias.", "Valida cada traço dentro da quadra de 9 x 18 m.", "Gera setas e comprimentos prontos para a lousa."],
  ),
  "momentum-coach": la(
    ["Índice de momentum calculado sobre las últimas seis pelotas.", "Cuenta break points y la racha actual del rival.", "Recomienda tiempo muerto a los 3 y urgencia a los 5."],
    ["Momentum index computed over the last six rallies.", "Counts break points and the opponent's current run.", "Calls timeout at 3 and urgent action at 5."],
    ["Índice de momentum calculado nas últimas seis bolas.", "Conta break points e a sequência atual do rival.", "Recomenda tempo aos 3 e urgência aos 5."],
  ),
  "captain-draft": la(
    ["Orden serpiente A-B-B-A para equilibrar los turnos.", "Audita recepción, armado y ataque por equipo.", "Acepta de dos a cuatro capitanes y deja banco visible."],
    ["Snake order A-B-B-A to balance the turns.", "Audits reception, setting and attack per team.", "Accepts two to four captains and shows the bench."],
    ["Ordem serpente A-B-B-A para equilibrar os turnos.", "Audita recepção, levantamento e ataque por equipe.", "Aceita de dois a quatro capitães e mostra o banco."],
  ),
  "roster-pass": la(
    ["Hasta 14 jugadores con dorsales únicos del 1 al 99.", "Máximo dos liberos y capitán distinto del libero.", "Emite un pase VOS-ROSTER verificable en mesa."],
    ["Up to 14 players with unique shirts from 1 to 99.", "At most two liberos and a captain who is not the libero.", "Issues a VOS-ROSTER pass verifiable at the table."],
    ["Até 14 jogadores com números únicos de 1 a 99.", "No máximo dois líberos e capitão diferente do líbero.", "Emite um passe VOS-ROSTER verificável na mesa."],
  ),
  "equipment-inspector": la(
    ["Alturas oficiales: 2,43 m masculino y 2,24 m femenino.", "Tolera 2 cm entre cada extremo y el centro de la red.", "Convierte presión de 0,300-0,325 kgf/cm2 a PSI y kPa."],
    ["Official heights: 2.43 m men and 2.24 m women.", "Tolerates 2 cm between each end and the net centre.", "Converts 0.300-0.325 kgf/cm2 pressure to PSI and kPa."],
    ["Alturas oficiais: 2,43 m masculino e 2,24 m feminino.", "Tolera 2 cm entre cada extremo e o centro da rede.", "Converte pressão de 0,300-0,325 kgf/cm2 em PSI e kPa."],
  ),
  "match-poster": la(
    ["Story 1080 x 1920 y feed cuadrado 1080 x 1080.", "Escapa nombres y escapa el SVG contra inyección.", "Incluye sello HMAC, MVP, sets y matriz de sala."],
    ["1080 x 1920 story and 1080 x 1080 square feed.", "Escapes names and the SVG against injection.", "Includes HMAC seal, MVP, sets and room matrix."],
    ["Story 1080 x 1920 e feed quadrado 1080 x 1080.", "Escapa nomes e o SVG contra injeção.", "Inclui selo HMAC, MVP, sets e matriz de sala."],
  ),
  "serve-radar": la(
    ["Velocidad inicial con factor aerodinamico 1.18 y 3.6 km/h por m/s.", "Clasifica en flotado, hibrido, jump serve y bomba mundial.", "Margen de reaccion = vuelo menos 250 ms humanos."],
    ["Initial speed with a 1.18 aero factor and 3.6 km/h per m/s.", "Classifies float, hybrid, jump serve and world-class bomb.", "Reaction margin = flight time minus 250 ms."],
    ["Velocidade inicial com fator aerodinamico 1.18 e 3.6 km/h por m/s.", "Classifica em flutuante, hibrido, jump serve e bomba mundial.", "Margem de reacao = voo menos 250 ms."],
  ),
  "matchup-matrix": la(
    ["Matriz 6x6 de diferencial entre bloqueo propio y ataque rival.", "Elige la mejor y la peor rotacion de inicio.", "Identifica al atacante rival mas fuerte y quien lo neutraliza."],
    ["6x6 differential matrix between own block and rival attack.", "Picks the best and worst starting rotation.", "Finds the strongest rival attacker and the best counter."],
    ["Matriz 6x6 de diferencial entre bloqueio proprio e ataque rival.", "Escolhe a melhor e a pior rotacao inicial.", "Identifica o atacante rival mais forte e quem o neutraliza."],
  ),
  "blockout-lab": la(
    ["Cuatro decisiones: mano afuera, costura, reciclaje y roll shot.", "Valor esperado con probabilidad acotada entre 5% y 95%.", "Angulo de muneca ajustado por zona, distancia y cierre."],
    ["Four decisions: hand wipe, seam, recycle and roll shot.", "Expected value with probability clamped between 5% and 95%.", "Wrist angle adjusted by zone, distance and block closure."],
    ["Quatro decisoes: mao fora, costura, reciclagem e roll shot.", "Valor esperado com probabilidade entre 5% e 95%.", "Angulo de punho ajustado por zona, distancia e fechamento."],
  ),
  "practice-planner": la(
    ["Divide 4 a 24 jugadores en grupos de seis o menos.", "Plantillas de 60, 90 y 120 minutos con cierre incluido.", "Cada bloque trae objetivo, ejercicio y meta de puntuacion."],
    ["Splits 4 to 24 players into groups of six or fewer.", "60, 90 and 120 minute templates with a closing block.", "Every block has an objective, drill and scoring target."],
    ["Divide 4 a 24 jogadores em grupos de seis ou menos.", "Modelos de 60, 90 e 120 minutos com fechamento.", "Cada bloco traz objetivo, exercicio e meta de pontuacao."],
  ),
  "play-by-play": la(
    ["Feed con puntos, tiempos, cambios, tarjetas y cierres de set.", "Marca puntos clutch cuando ambos equipos pasan de 20.", "Resumen automatico en ES, EN y PT con viradas."],
    ["Feed with points, timeouts, subs, cards and set ends.", "Flags clutch points when both teams pass 20.", "Automatic ES, EN and PT recap with lead changes."],
    ["Feed com pontos, tempos, substituicoes, cartoes e fim de set.", "Marca pontos clutch quando ambos passam de 20.", "Resumo automatico em ES, EN e PT com viradas."],
  ),
  "player-career": la(
    ["Deltas de salto, alcance, saque, ataque y recepcion.", "Indice 0-100 con 70% absoluto y 30% progreso.", "Detecta el cuello de botella y la brecha a la proxima categoria."],
    ["Deltas for jump, reach, serve, attack and reception.", "0-100 index with 70% absolute and 30% progress.", "Finds the bottleneck and the gap to the next category."],
    ["Deltas de salto, alcance, saque, ataque e recepcao.", "Indice 0-100 com 70% absoluto e 30% progresso.", "Detecta o gargalo e a distancia para a proxima categoria."],
  ),
};

export const MODULE_ITEMS: SeoItem[] = MODULES.map((module) => ({
  slug: module.slug,
  icon: module.icon,
  title: module.name,
  description: module.tagline,
  facts: MODULE_FACTS[module.slug] ?? la([], [], []),
  station: module.slug,
}));

export const SHARED_STEPS: Record<Locale, string[]> = {
  es: ["Abrí la estación en el Command Center.", "Cargá el ejemplo realista en un clic.", "Editá jugadores, sets o cargas con tus datos.", "Guardá el reporte en la bóveda o exportalo."],
  en: ["Open the station in the Command Center.", "Load the realistic example in one click.", "Edit players, sets or loads with your data.", "Save the report to the vault or export it."],
  pt: ["Abra a estação no Command Center.", "Carregue o exemplo realista em um clique.", "Edite jogadores, sets ou cargas com seus dados.", "Salve o relatório no cofre ou exporte."],
};

export const SHARED_FAQ: Array<{ question: L; answer: L }> = [
  {
    question: l("¿Funciona sin internet?", "Does it work offline?", "Funciona sem internet?"),
    answer: l(
      "Sí. Las estaciones corren en el navegador y no hacen requests de red. Podés usarlas en un gimnasio sin señal.",
      "Yes. Stations run in the browser and make no network requests. You can use them in a gym with no signal.",
      "Sim. As estações rodam no navegador e não fazem requisições de rede. Você pode usá-las em um ginásio sem sinal.",
    ),
  },
  {
    question: l("¿Se envían mis datos a un servidor?", "Is my data sent to a server?", "Meus dados são enviados a um servidor?"),
    answer: l(
      "No. Los reportes quedan en localStorage y podés destruirlos con un clic. No hay telemetría ni analytics.",
      "No. Reports stay in localStorage and you can destroy them in one click. There is no telemetry or analytics.",
      "Não. Os relatórios ficam no localStorage e você pode destruí-los em um clique. Não há telemetria nem analytics.",
    ),
  },
  {
    question: l("¿Qué licencia tiene VolleyOS?", "What licence does VolleyOS use?", "Qual licença o VolleyOS usa?"),
    answer: l(
      "AGPL-3.0-or-later. Podés usar, estudiar, modificar y redistribuir el código, incluso comercialmente, manteniendo la licencia.",
      "AGPL-3.0-or-later. You may use, study, modify and redistribute the code, even commercially, keeping the licence.",
      "AGPL-3.0-or-later. Você pode usar, estudar, modificar e redistribuir o código, até comercialmente, mantendo a licença.",
    ),
  },
];

export const SEO_ITEMS: Record<SeoSection, SeoItem[]> = {
  modules: MODULE_ITEMS,
  positions: POSITION_ITEMS,
  rotations: ROTATION_ITEMS,
  alternatives: ALTERNATIVE_ITEMS,
  tools: TOOL_ITEMS,
};

export function getSeoItem(section: SeoSection, slug: string): SeoItem | undefined {
  return SEO_ITEMS[section].find((item) => item.slug === slug);
}

export function isSeoSection(value: string): value is SeoSection {
  return (SEO_SECTIONS as string[]).includes(value);
}
