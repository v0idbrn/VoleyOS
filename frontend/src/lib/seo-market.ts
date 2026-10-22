import type { Locale } from "@/lib/local-engines";
import type { SeoItem } from "@/lib/seo";

type L = Record<Locale, string>;
type LArr = Record<Locale, string[]>;

const l = (es: string, en: string, pt: string): L => ({ es, en, pt });
const la = (es: string[], en: string[], pt: string[]): LArr => ({ es, en, pt });

export const ALTERNATIVE_ITEMS: SeoItem[] = [
  {
    slug: "datavolley",
    icon: "🎞️",
    title: l("DataVolley", "DataVolley", "DataVolley"),
    description: l(
      "El estándar profesional de scouting con video codificado, licencia y hardware dedicado.",
      "The pro scouting standard with coded video, a licence and dedicated hardware.",
      "O padrão profissional de scout com vídeo codificado, licença e hardware dedicado.",
    ),
    facts: la(
      ["Profundidad de video imposible de igualar en una PWA.", "Curva de aprendizaje alta y costo de licencia."],
      ["Video depth a PWA cannot match.", "Steep learning curve and licence cost."],
      ["Profundidade de vídeo que um PWA não iguala.", "Curva de aprendizado alta e custo de licença."],
    ),
  },
  {
    slug: "clickandscout",
    icon: "📱",
    title: l("Click&Scout", "Click&Scout", "Click&Scout"),
    description: l(
      "Scouting táctil en tablet enfocado en estadísticas de equipo y suscripción.",
      "Tablet scouting focused on team statistics and a subscription.",
      "Scout em tablet focado em estatísticas de equipe e assinatura.",
    ),
    facts: la(
      ["Interfaz táctil rápida para planilleros.", "No incluye biomecánica ni validación FIVB."],
      ["Fast touch UI for statisticians.", "No biomechanics or FIVB validation."],
      ["Interface touch rápida para mesários.", "Não inclui biomecânica nem validação FIVB."],
    ),
  },
  {
    slug: "volleystation",
    icon: "🏆",
    title: l("VolleyStation", "VolleyStation", "VolleyStation"),
    description: l(
      "Plataforma de gestión de torneos y clubes, fuerte en fixtures y resultados.",
      "Tournament and club management platform, strong on fixtures and results.",
      "Plataforma de gestão de torneios e clubes, forte em tabelas e resultados.",
    ),
    facts: la(
      ["Cubre ligas completas y operación de sedes.", "No entrena tempo, salto ni carga de saltos."],
      ["Covers full leagues and venue operations.", "No tempo, jump or jump-load training."],
      ["Cobre ligas completas e operação de sedes.", "Não treina tempo, salto nem carga de saltos."],
    ),
  },
  {
    slug: "excel-sheets",
    icon: "📗",
    title: l("Planillas Excel", "Excel Sheets", "Planilhas Excel"),
    description: l(
      "Flexibles y gratuitas, pero sin validación de reglas ni auditoría de fórmulas.",
      "Flexible and free, but with no rule validation or formula audit.",
      "Flexíveis e gratuitas, mas sem validação de regras nem auditoria de fórmulas.",
    ),
    facts: la(
      ["Cero costo y control total de columnas.", "Las fórmulas se rompen en silencio y no validan FIVB."],
      ["Zero cost and full control of columns.", "Formulas break silently and do not validate FIVB."],
      ["Custo zero e controle total das colunas.", "Fórmulas quebram em silêncio e não validam FIVB."],
    ),
  },
  {
    slug: "paper-scoresheet",
    icon: "📝",
    title: l("Planilla de papel", "Paper Scoresheet", "Súmula de Papel"),
    description: l(
      "Nunca se queda sin batería, pero no genera mapas de calor ni K1.",
      "Never runs out of battery, but produces no heatmaps or K1.",
      "Nunca fica sem bateria, mas não gera mapas de calor nem K1.",
    ),
    facts: la(
      ["Funciona en cualquier cancha sin energía.", "Errores de transcripción y cero analítica automática."],
      ["Works on any court without power.", "Transcription errors and zero automatic analytics."],
      ["Funciona em qualquer quadra sem energia.", "Erros de transcrição e zero análise automática."],
    ),
  },
  {
    slug: "video-analysis",
    icon: "🎥",
    title: l("Análisis de video", "Video Analysis", "Análise de Vídeo"),
    description: l(
      "Revisión cuadro a cuadro para corregir técnica, sin cálculo de carga.",
      "Frame-by-frame review to fix technique, without load calculation.",
      "Revisão quadro a quadro para corrigir técnica, sem cálculo de carga.",
    ),
    facts: la(
      ["Insuperable para corregir mecánica de remate.", "Requiere cámara, tiempo de edición y no calcula ACWR."],
      ["Unbeatable for fixing attack mechanics.", "Requires a camera, editing time and no ACWR."],
      ["Imbatível para corrigir mecânica de ataque.", "Exige câmera, tempo de edição e não calcula ACWR."],
    ),
  },
];

export const TOOL_ITEMS: SeoItem[] = [
  {
    slug: "jump-calculator",
    icon: "📐",
    title: l("Calculadora de salto vertical", "Vertical Jump Calculator", "Calculadora de Salto Vertical"),
    description: l(
      "Convertí tiempo de vuelo en centímetros y alcance de remate con física real.",
      "Convert flight time into centimetres and spike reach with real physics.",
      "Converta tempo de voo em centímetros e alcance de ataque com física real.",
    ),
    facts: la(
      ["Fórmula h = 1/8 · g · t² con g = 9.81 m/s².", "Precisión de centímetros con video de 60 fps."],
      ["Formula h = 1/8 · g · t² with g = 9.81 m/s².", "Centimetre precision with 60 fps video."],
      ["Fórmula h = 1/8 · g · t² com g = 9.81 m/s².", "Precisão de centímetros com vídeo de 60 fps."],
    ),
    station: "biomechanics",
  },
  {
    slug: "rotation-validator",
    icon: "🧭",
    title: l("Validador de rotaciones", "Rotation Validator", "Validador de Rotações"),
    description: l(
      "Comprobá solapamientos FIVB en R1-R6 al golpe de saque.",
      "Check FIVB overlaps across R1-R6 at serve contact.",
      "Verifique sobreposições FIVB em R1-R6 no contato do saque.",
    ),
    facts: la(
      ["Valida delanteros contra zagueros y orden izquierda-derecha.", "Muestra el delta exacto en centímetros."],
      ["Validates front against back row and left-to-right order.", "Shows the exact delta in centimetres."],
      ["Valida frente contra fundo e ordem esquerda-direita.", "Mostra o delta exato em centímetros."],
    ),
    station: "rotation",
  },
  {
    slug: "acwr-calculator",
    icon: "📈",
    title: l("Calculadora ACWR", "ACWR Calculator", "Calculadora ACWR"),
    description: l(
      "Ratio agudo:crónico de saltos en 28 días con zonas de riesgo.",
      "Acute:chronic jump ratio over 28 days with risk zones.",
      "Razão aguda:crônica de saltos em 28 dias com zonas de risco.",
    ),
    facts: la(
      ["Ventana aguda de 7 días y crónica de 28.", "Zona óptima 0.8-1.3; alerta sobre 1.5."],
      ["7-day acute and 28-day chronic windows.", "Optimal zone 0.8-1.3; alert above 1.5."],
      ["Janela aguda de 7 dias e crônica de 28.", "Zona ideal 0.8-1.3; alerta acima de 1.5."],
    ),
    station: "acwr",
  },
  {
    slug: "scouting-sheet",
    icon: "📊",
    title: l("Planilla de scouting", "Scouting Sheet", "Planilha de Scout"),
    description: l(
      "De una frase a un evento codificado, K1 por rotación y heatmap 3x3.",
      "From one sentence to a coded event, K1 by rotation and a 3x3 heatmap.",
      "De uma frase a um evento codificado, K1 por rotação e heatmap 3x3.",
    ),
    facts: la(
      ["Acepta texto o dictado en español e inglés.", "Calcula eficiencia con kills, errores y bloqueos."],
      ["Accepts text or dictation in Spanish and English.", "Computes efficiency from kills, errors and blocks."],
      ["Aceita texto ou ditado em espanhol e inglês.", "Calcula eficiência com kills, erros e bloqueios."],
    ),
    station: "scouting",
  },
  {
    slug: "obs-overlay",
    icon: "📺",
    title: l("Overlay OBS", "OBS Overlay", "Overlay OBS"),
    description: l(
      "Marcador transparente con set point, match point y sponsor para streaming.",
      "Transparent scoreboard with set point, match point and sponsor for streaming.",
      "Placar transparente com set point, match point e patrocinador para streaming.",
    ),
    facts: la(
      ["Se agrega como Browser Source en OBS.", "No requiere backend ni cuenta."],
      ["Adds as a Browser Source in OBS.", "No backend or account required."],
      ["Adiciona como Browser Source no OBS.", "Não exige backend nem conta."],
    ),
    station: "overlay",
  },
  {
    slug: "beach-scoreboard",
    icon: "🏖️",
    title: l("Marcador de playa", "Beach Scoreboard", "Placar de Praia"),
    description: l(
      "21/15, cambios de lado y control de saque para vóley de playa.",
      "21/15, side switches and server tracking for beach volleyball.",
      "21/15, trocas de lado e controle de saque para vôlei de praia.",
    ),
    facts: la(
      ["Cambio de lado cada 7 puntos, o 5 en el decisivo.", "Registra el saque de cada jugador."],
      ["Side switch every 7 points, or 5 in the decider.", "Tracks each player's serve."],
      ["Troca de lado a cada 7 pontos, ou 5 no decisivo.", "Registra o saque de cada jogador."],
    ),
    station: "beach",
  },
];
