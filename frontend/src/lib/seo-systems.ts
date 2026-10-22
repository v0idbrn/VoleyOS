import type { Locale } from "@/lib/local-engines";
import type { SeoItem } from "@/lib/seo";

type L = Record<Locale, string>;
type LArr = Record<Locale, string[]>;

const l = (es: string, en: string, pt: string): L => ({ es, en, pt });
const la = (es: string[], en: string[], pt: string[]): LArr => ({ es, en, pt });

export const POSITION_ITEMS: SeoItem[] = [
  {
    slug: "setter",
    icon: "🎯",
    title: l("Armador", "Setter", "Levantador"),
    description: l(
      "El cerebro del 5-1: decide tempo, pipe y distribución desde la segunda pelota.",
      "The brain of the 5-1: decides tempo, pipe and distribution from the second ball.",
      "O cérebro do 5-1: decide tempo, pipe e distribuição da segunda bola.",
    ),
    facts: la(
      ["Toca la segunda pelota y elige entre quick, shoot y pipe.", "Defiende zona 1 y lidera la comunicación del bloqueo."],
      ["Takes the second ball and chooses between quick, shoot and pipe.", "Defends zone 1 and leads block communication."],
      ["Toca a segunda bola e escolhe entre quick, shoot e pipe.", "Defende a zona 1 e lidera a comunicação do bloqueio."],
    ),
    station: "tempo",
  },
  {
    slug: "outside-hitter",
    icon: "💥",
    title: l("Punta / Receptor", "Outside Hitter", "Ponteiro"),
    description: l(
      "Máximo volumen de ataque por 4 y pipe, además de recepción de saque.",
      "Highest attack volume from 4 and pipe, plus serve reception.",
      "Maior volume de ataque pela 4 e pipe, além da recepção de saque.",
    ),
    facts: la(
      ["Ataca por zona 4 y pipe, y bloquea la banda contraria.", "Su eficiencia depende de la recepción y del timing con el armador."],
      ["Attacks from zone 4 and pipe, and blocks the opposing wing.", "Efficiency depends on reception and timing with the setter."],
      ["Ataca pela zona 4 e pipe, e bloqueia a ponta contrária.", "A eficiência depende da recepção e do tempo com o levantador."],
    ),
    station: "scouting",
  },
  {
    slug: "opposite",
    icon: "🛡️",
    title: l("Opuesto", "Opposite", "Oposto"),
    description: l(
      "Atacante de la banda derecha que cierra el bloqueo y suele no recibir.",
      "Right-wing attacker who closes the block and usually does not pass.",
      "Atacante da ponta direita que fecha o bloqueio e geralmente não passa.",
    ),
    facts: la(
      ["Ataca por zona 2 y 1, y cierra el bloqueo derecho.", "En el 5-1 es el máximo anotador del equipo."],
      ["Attacks from zones 2 and 1, and closes the right-side block.", "In the 5-1 they are the team's top scorer."],
      ["Ataca pelas zonas 2 e 1, e fecha o bloqueio direito.", "No 5-1 é o maior pontuador da equipe."],
    ),
    station: "scoreboard",
  },
  {
    slug: "middle-blocker",
    icon: "🧱",
    title: l("Central", "Middle Blocker", "Central"),
    description: l(
      "Quick, slide y el primer bloqueo del equipo en el centro de la red.",
      "Quick, slide and the team's first block in the middle of the net.",
      "Quick, slide e o primeiro bloqueio da equipe no centro da rede.",
    ),
    facts: la(
      ["Ataca quick por 3 y slide por 3-4.", "Su lectura del ataque rival define el sistema defensivo."],
      ["Attacks quick in 3 and slide in 3-4.", "Their read of the opposing attack defines the defensive system."],
      ["Ataca quick na 3 e slide na 3-4.", "Sua leitura do ataque adversário define o sistema defensivo."],
    ),
    station: "volleycard",
  },
  {
    slug: "libero",
    icon: "🧤",
    title: l("Líbero", "Libero", "Líbero"),
    description: l(
      "Especialista de recepción y defensa con reglas propias de armado.",
      "Reception and defence specialist with specific setting rules.",
      "Especialista de recepção e defesa com regras próprias de levantamento.",
    ),
    facts: la(
      ["No puede atacar ni bloquear.", "El armado de dedos delante de 3 metros está restringido."],
      ["Cannot attack or block.", "Finger setting in front of 3 metres is restricted."],
      ["Não pode atacar nem bloquear.", "O levantamento de dedos à frente de 3 metros é restrito."],
    ),
    station: "var",
  },
  {
    slug: "defensive-specialist",
    icon: "🏃",
    title: l("Especialista defensivo", "Defensive Specialist", "Especialista Defensivo"),
    description: l(
      "Entra por un delantero para mejorar saque o defensa, sin reglas de líbero.",
      "Replaces a front-row player to improve serve or defence, without libero rules.",
      "Entra por um jogador de frente para melhorar saque ou defesa, sem regras de líbero.",
    ),
    facts: la(
      ["Reemplazo táctico de zaguera.", "Puede atacar desde el fondo, a diferencia del líbero."],
      ["Back-row tactical substitution.", "Can attack from the back row, unlike the libero."],
      ["Substituição tática de fundo.", "Pode atacar do fundo, diferente do líbero."],
    ),
    station: "rotation",
  },
];

export const ROTATION_ITEMS: SeoItem[] = [
  {
    slug: "5-1",
    icon: "5️⃣",
    title: l("Sistema 5-1", "5-1 System", "Sistema 5-1"),
    description: l(
      "Un armador en las seis rotaciones y siempre tres atacantes disponibles.",
      "One setter across all six rotations and always three attackers available.",
      "Um levantador nas seis rotações e sempre três atacantes disponíveis.",
    ),
    facts: la(
      ["Estándar del alto rendimiento.", "Exige un armador completo y un opuesto confiable."],
      ["High-performance standard.", "Demands a complete setter and a reliable opposite."],
      ["Padrão de alto rendimento.", "Exige um levantador completo e um oposto confiável."],
    ),
    station: "rotation",
  },
  {
    slug: "6-2",
    icon: "6️⃣",
    title: l("Sistema 6-2", "6-2 System", "Sistema 6-2"),
    description: l(
      "Dos armadores opuestos que entran desde la zaga y mantienen tres atacantes.",
      "Two opposite setters entering from the back row while keeping three attackers.",
      "Dois levantadores opostos que entram do fundo e mantêm três atacantes.",
    ),
    facts: la(
      ["Ideal para categorías formativas.", "Simplifica el recambio y la distribución del ataque."],
      ["Ideal for youth categories.", "Simplifies substitutions and attack distribution."],
      ["Ideal para categorias de formação.", "Simplifica substituições e distribuição do ataque."],
    ),
    station: "rotation",
  },
  {
    slug: "4-2",
    icon: "4️⃣",
    title: l("Sistema 4-2", "4-2 System", "Sistema 4-2"),
    description: l(
      "Dos armadores delanteros y solo dos atacantes disponibles por jugada.",
      "Two front-row setters and only two attackers available per play.",
      "Dois levantadores na frente e apenas dois atacantes disponíveis por jogada.",
    ),
    facts: la(
      ["Fácil de enseñar en iniciación.", "Limita el ataque y la creatividad del armador."],
      ["Easy to teach beginners.", "Limits attack options and setter creativity."],
      ["Fácil de ensinar na iniciação.", "Limita o ataque e a criatividade do levantador."],
    ),
    station: "rotation",
  },
  {
    slug: "hybrid-6-2",
    icon: "🔀",
    title: l("6-2 híbrido", "Hybrid 6-2", "6-2 Híbrido"),
    description: l(
      "Dos armadores con roles asimétricos como puente hacia un 5-1.",
      "Two setters with asymmetric roles as a bridge towards a 5-1.",
      "Dois levantadores com papéis assimétricos como ponte para um 5-1.",
    ),
    facts: la(
      ["Uno de los armadores juega la mayoría de las rotaciones.", "Permite transicionar sin perder profundidad de plantel."],
      ["One setter plays most rotations.", "Allows a transition without losing squad depth."],
      ["Um dos levantadores joga a maioria das rotações.", "Permite transicionar sem perder profundidade de elenco."],
    ),
    station: "rotation",
  },
];
