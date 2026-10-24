import type { Locale } from "@/lib/local-engines";

export interface ModuleGuide {
  why: string;
  steps: [string, string, string];
  glossary: Array<[string, string]>;
}

const g = (why: string, s1: string, s2: string, s3: string, glossary: Array<[string, string]>): ModuleGuide => ({
  why,
  steps: [s1, s2, s3],
  glossary,
});

/** Trilingual how-to guide for every one of the 60 modules. */
export const MODULE_GUIDES: Record<string, Record<Locale, ModuleGuide>> = {
  biomechanics: {
    es: g("Convierte un mal remate en un diagnóstico mecánico.", "Cargá el ejemplo o ingresá los 5 ángulos.", "Mirá la nota 0-100 y el frame fallado.", "Seguí la corrección prioritaria del drill.", [["Remate", "Ataque al piso rival"], ["Draw", "Brazo armado tras la cabeza"]]),
    en: g("Turns a bad spike into a mechanical diagnosis.", "Load the example or enter the 5 angles.", "Read the 0-100 score and the failed frame.", "Follow the priority drill fix.", [["Spike", "Attack hit into the rival court"], ["Draw", "Arm cocked behind the head"]]),
    pt: g("Converte um ataque ruim em diagnóstico mecânico.", "Carregue o exemplo ou insira os 5 ângulos.", "Leia a nota 0-100 e o quadro falho.", "Siga a correção prioritária do drill.", [["Ataque", "Golpe para o campo rival"], ["Draw", "Braço carregado atrás da cabeça"]]),
  },
  rotation: {
    es: g("Mata las derrotas por rotación antes del silbato.", "Elegí 5-1, 6-2 o 4-2 con tu alineación.", "El validador marca solapamientos (regla 7.4).", "Corregí hasta ver ROTACIÓN VÁLIDA.", [["Solapamiento", "Posición inválida al saque"], ["R1-R6", "Zonas de servicio a ataque"]]),
    en: g("Kills rotation-fault losses before the whistle.", "Pick 5-1, 6-2 or 4-2 with your lineup.", "The validator flags overlap faults (rule 7.4).", "Fix until you read VALID ROTATION.", [["Overlap", "Illegal position at serve"], ["R1-R6", "Serve-to-attack zones"]]),
    pt: g("Mata derrotas por rodízio antes do apito.", "Escolha 5-1, 6-2 ou 4-2 com seu time.", "O validador marca rodízio indevido (regra 7.4).", "Corrija até ver RODÍZIO VÁLIDO.", [["Rodízio", "Ordem obrigatória na quadra"], ["R1-R6", "Zonas de saque a ataque"]]),
  },
  scouting: {
    es: g("Produce un mapa real del rival en mitad de partido.", "Registrá ubicación, zona y resultado por pelota.", "Leé amenazas y zonas calientes del ranking.", "Exportá el reporte para el próximo set.", [["Heatmap", "Mapa de calor de ataques"], ["Efficiency", "Kills menos errores sobre intentos"]]),
    en: g("Produces a real opponent heatmap mid-match.", "Log location, zone and outcome per ball.", "Read the ranked threats and hot zones.", "Export the report for the next set.", [["Heatmap", "Attack distribution map"], ["Efficiency", "Kills minus errors over attempts"]]),
    pt: g("Produz um mapa real do rival no meio do jogo.", "Registre posição, zona e resultado por bola.", "Leia ameaças e zonas quentes ranqueadas.", "Exporte o relatório para o próximo set.", [["Mapa de calor", "Distribuição de ataques"], ["Eficiência", "Acertos menos erros por tentativas"]]),
  },
  scoreboard: {
    es: g("Reemplaza el marcador de cartón y la planilla de papel.", "Creá los dos equipos y elegí el formato.", "Anotá con botones o volumen; el motor cierra el set.", "Deshacé con ⏪ si te pasaste de punto.", [["Deuce", "24-24: gana por 2"], ["Set point", "Punto para llevarse el set"]]),
    en: g("Replaces the flip board and the paper sheet.", "Create both teams and pick the format.", "Score with buttons or volume keys; the engine closes sets.", "Undo with ⏪ if you overscored.", [["Deuce", "24-24: win by 2"], ["Set point", "Point that wins the set"]]),
    pt: g("Substitui o fliper de papelão e a súmula.", "Crie os dois times e escolha o formato.", "Anote por botões ou volume; o motor fecha o set.", "Desfaça com ⏪ se errou o ponto.", [["Duplo", "24-24: vence por 2"], ["Set point", "Ponto que decide o set"]]),
  },
  tournament: {
    es: g("Arma la copa y publica posiciones sin Excel.", "Cargá equipos y formato (todos contra todos o llaves).", "Generá el calendario automático.", "Leé tabla, movimientos y ranking.", [["Tabla", "Clasificación acumulada"], ["Fixture", "Calendario de partidos"]]),
    en: g("Schedules a cup and publishes standings without Excel.", "Add teams and a format (round-robin or bracket).", "Generate the automatic calendar.", "Read the table, moves and ranking.", [["Standings", "Accumulated classification"], ["Fixture", "Match calendar"]]),
    pt: g("Arma a copa e publica a tabela sem Excel.", "Adicione times e formato (todos contra todos ou chaves).", "Gere o calendário automático.", "Leia classificação, movimentos e ranking.", [["Tabela", "Classificação acumulada"], ["Fixture", "Calendário de jogos"]]),
  },
  pickup: {
    es: g("Nadie arma equipos alineando amigos a la suerte.", "Pegá la lista de nombres con su nivel.", "Repartí en dos equipos parejos automáticamente.", "Ganá para quedarte en cancha.", [["Nivel", "Calificación 1-9 de habilidad"], ["KOTC", "Rey de la Cancha"]]),
    en: g("Nobody picks teams from a line of friends anymore.", "Paste the player list with their levels.", "Split into two balanced teams automatically.", "Win to stay on court.", [["Level", "1-9 skill rating"], ["KOTC", "King of the Court"]]),
    pt: g("Ninguém arma times alinhando amigos na sorte.", "Cole a lista de jogadores com o nível.", "Divida em dois times equilibrados.", "Vença para ficar na quadra.", [["Nível", "Calificação 1-9 de habilidade"], ["KOTC", "Rei da Quadra"]]),
  },
  overlay: {
    es: g("Alimenta el overlay del stream sin websockets.", "Elegí tema y equipos.", "Copiá el SVG 1920x1080.", "Pegalo como fuente de navegador en OBS.", [["OBS", "Software de transmisión"], ["SVG", "Gráfico vectorial escalable"]]),
    en: g("Feeds the stream overlay without websockets.", "Pick the theme and teams.", "Copy the 1920x1080 SVG.", "Paste it as a browser source in OBS.", [["OBS", "Broadcasting software"], ["SVG", "Scalable vector graphic"]]),
    pt: g("Alimenta o overlay do stream sem websockets.", "Escolha tema e times.", "Copie o SVG 1920x1080.", "Cole como fonte de navegador no OBS.", [["OBS", "Software de transmissão"], ["SVG", "Gráfico vetorial escalável"]]),
  },
  var: {
    es: g("Resuelve disputas de toque a nivel canchita.", "Registrá la jugada con sus keywords.", "Leé veredicto, cita reglamentaria y moneda.", "Cerrá el desafío con el conteo.", [["Cita", "Regla FIVB aplicable"], ["Desafío", "Revisión de un punto"]]),
    en: g("Resolves touch disputes at street level.", "Log the play with its keywords.", "Read the verdict, rule citation and coin toss.", "Close the challenge with the count.", [["Citation", "Applicable FIVB rule"], ["Challenge", "Point review"]]),
    pt: g("Resolve disputas de toque na quadra de rua.", "Registre a jogada com palavras-chave.", "Leia decisão, citação regulamentar e moeda.", "Feche o desafio com a contagem.", [["Citação", "Regra FIVB aplicável"], ["Desafio", "Revisão de um ponto"]]),
  },
  beach: {
    es: g("Anota reglas de arena, cambios y formato Newcom.", "Elegí 2x2 y el objetivo del set.", "Anotá puntos con cambio de lado automático.", "Cerrá el set con ventaja de 2 o punto de oro.", [["Newcom", "Formato de 2 sets a 15 con tiebreak"], ["Cambio", "Rotación de lado cada 7 puntos"]]),
    en: g("Scores sand rules, switch calls and the Newcom format.", "Pick 2x2 and the set target.", "Score with automatic side switches.", "Close the set win-by-2 or golden point.", [["Newcom", "Two 15-point sets + tiebreak"], ["Switch", "Side change every 7 points"]]),
    pt: g("Anota regras de areia, trocas e formato Newcom.", "Escolha 2x2 e o alvo do set.", "Anote com trocas de lado automáticas.", "Feche o set por 2 de vantagem ou ponto de ouro.", [["Newcom", "Dois sets a 15 + tiebreak"], ["Troca", "Muda de lado a cada 7 pontos"]]),
  },
  volleycard: {
    es: g("Le muestra al jugador como lo lee un scout.", "Calificá los 6 ejes de 1 a 99.", "Mirá el radar hexagonal y el overall.", "Exportá la tarjeta para redes o captas.", [["Radar", "Gráfico hexagonal de atributos"], ["OVR", "Calificación global del jugador"]]),
    en: g("Shows a player the way a scout reads them.", "Grade the 6 axes from 1 to 99.", "Read the hexagon radar and overall rating.", "Export the card for socials or scouts.", [["Radar", "Hexagon chart of attributes"], ["OVR", "Overall player rating"]]),
    pt: g("Mostra ao jogador como um scout o lê.", "Note os 6 eixos de 1 a 99.", "Leia o radar hexagonal e o geral.", "Exporte o card para redes ou olheiros.", [["Radar", "Gráfico hexagonal de atributos"], ["OVR", "Nota global do jogador"]]),
  },
  tempo: {
    es: g("Enseña tempo 1/2 y el hueco del pipe en milisegundos.", "Registrá cada salto del armador.", "Compará contra la ventana perfecta.", "Corregí con el próximo lanzamiento.", [["Tempo 1", "Bola rápida al ala"], ["Pipe", "Ataque por el centro desde atrás"]]),
    en: g("Teaches first/second tempo and the pipe window in ms.", "Log each setter jump.", "Compare against the perfect window.", "Fix it on the next set.", [["Tempo 1", "Fast set to the outside"], ["Pipe", "Back-row attack through the middle"]]),
    pt: g("Ensina tempo 1/2 e a janela do pipe em ms.", "Registre cada salto do levantador.", "Compare com a janela perfeita.", "Corrija na próxima bola.", [["Tempo 1", "Bola rápida para a ponta"], ["Pipe", "Ataque de fundo pelo meio"]]),
  },
  acwr: {
    es: g("Detecta el pico de carga antes de que paguen las rodillas.", "Registrá los saltos de cada día.", "Leé la razón agudo/crónico.", "Respetá el rango seguro semanal.", [["ACWR", "Ratio carga aguda/crónica"], ["Carga", "Saltos totales de la semana"]]),
    en: g("Flags a load spike before knees pay for it.", "Log the daily jump counts.", "Read the acute/chronic ratio.", "Stay inside the safe weekly band.", [["ACWR", "Acute-to-chronic ratio"], ["Load", "Total jumps per week"]]),
    pt: g("Detecta o pico de carga antes de os joelhos pagarem.", "Registre os saltos diários.", "Leia a razão aguda/crônica.", "Fique na faixa semanal segura.", [["ACWR", "Razão aguda/crônica"], ["Carga", "Saltos totais da semana"]]),
  },
  "block-shadow": {
    es: g("Cuantifica quién queda destapado con tu doble bloqueo.", "Elegí bloqueadores y esquema.", "Leé el % de cancha cubierta.", "Mové cobertura a las costuras libres.", [["Sombra", "Área cubierta por el bloqueo"], ["Costura", "Hueco entre bloqueadores"]]),
    en: g("Quantifies who your double block leaves uncovered.", "Pick the blockers and scheme.", "Read the % of court covered.", "Shift cover to the open seams.", [["Shadow", "Area covered by the block"], ["Seam", "Gap between blockers"]]),
    pt: g("Quantifica quem fica destapado com o duplo bloqueio.", "Escolha bloqueadores e esquema.", "Leia o % da quadra coberta.", "Mova a cobertura para as costuras.", [["Sombra", "Área coberta pelo bloqueio"], ["Costura", "Falha entre bloqueadores"]]),
  },
  "seam-radar": {
    es: g("Ve la costura del pasador antes que el saque.", "Elegí el tipo de saque.", "Ubicá a los tres receptores.", "Leé el hueco en cm y quién cubre.", [["Costura", "Hueco entre receptores"], ["K1", "Primer contacto de recepción"]]),
    en: g("Sees the reception seam before the serve does.", "Pick the serve type.", "Place the three receivers.", "Read the gap in cm and who covers it.", [["Seam", "Gap between receivers"], ["K1", "First reception contact"]]),
    pt: g("Vê a costura da recepção antes do saque.", "Escolha o tipo de saque.", "Posicione os três receptores.", "Leia a fresta em cm e quem cobre.", [["Costura", "Falha entre receptores"], ["K1", "Primeiro contato de recepção"]]),
  },
  "setter-iq": {
    es: g("Encuentra qué sets ganan y cuáles se regalan.", "Cargá cada distribución del armador.", "Leé imprevisibilidad y eficiencia por tipo.", "Balanceá hacia los sets que rinden.", [["Distribución", "Reparto de bolas del armador"], ["Imprevisibilidad", "Entropía de sus opciones"]]),
    en: g("Finds which sets are winning and which are wasted.", "Enter each setter distribution.", "Read unpredictability and per-type efficiency.", "Shift toward the sets that pay off.", [["Distribution", "Setter's ball split"], ["Unpredictability", "Entropy of their options"]]),
    pt: g("Encontra quais bolas ganam e quais se entregam.", "Insira cada distribuição do levantador.", "Leia imprevisibilidade e eficiência por tipo.", "Balanceie para as bolas que rendem.", [["Distribuição", "Divisão de bolas do levantador"], ["Imprevisibilidade", "Entropia das opções"]]),
  },
  "lineup-slip": {
    es: g("Previene errores de boleta y ventanas de líbero rotas.", "Ingresá los 6 titulares I-VI.", "El validador detecta errores de posición.", "Imprimí la boleta con ventana de líbero.", [["Boleta", "Planilla oficial de alineación"], ["Líbero", "Defensa especial sin rotar"]]),
    en: g("Prevents lineup-sheet errors and broken libero windows.", "Enter the 6 starters I-VI.", "The validator detects position errors.", "Print the slip with the libero window.", [["Slip", "Official lineup sheet"], ["Libero", "Non-rotating defensive player"]]),
    pt: g("Previne erros de boleta e janelas de líbero tortas.", "Insira os 6 titulares I-VI.", "O validador detecta erros de posição.", "Imprima a boleta com janela do líbero.", [["Boleta", "Súmula oficial de escalação"], ["Líbero", "Defesa sem rodízio"]]),
  },
  "integrity-seal": {
    es: g("Prueba que una planilla no se tocó tras firmarse.", "Armá el JSON canónico del partido.", "Firmalo con HMAC-SHA256.", "Verificá el sello con un click.", [["HMAC", "Firma con clave compartida"], ["Sello", "Hash que prueba integridad"]]),
    en: g("Proves a sheet was not modified after signing.", "Build the canonical match JSON.", "Sign it with HMAC-SHA256.", "Verify the seal in one click.", [["HMAC", "Keyed signature hash"], ["Seal", "Hash proving integrity"]]),
    pt: g("Prova que uma súmula não foi tocada após assinar.", "Monte o JSON canônico do jogo.", "Assine com HMAC-SHA256.", "Verifique o selo em um clique.", [["HMAC", "Assinatura com chave"], ["Selo", "Hash que prova integridade"]]),
  },
  "capsule-io": {
    es: g("Mueve una partida completa entre aparatos.", "Exportá el estado a .volleyos.", "Pasalo por archivo o QR.", "Importalo en el otro teléfono.", [["Cápsula", "Archivo .volleyos de partida"], ["Estado", "Marcador y ajustes guardados"]]),
    en: g("Moves a whole match save between devices.", "Export state to a .volleyos file.", "Transfer it by file or QR.", "Import it on the other phone.", [["Capsule", ".volleyos match file"], ["State", "Saved scoreboard and settings"]]),
    pt: g("Move uma partida inteira entre aparelhos.", "Exporte o estado para .volleyos.", "Passe por arquivo ou QR.", "Importe no outro celular.", [["Cápsula", "Arquivo .volleyos do jogo"], ["Estado", "Placar e ajustes salvos"]]),
  },
  "referee-console": {
    es: g("Habla las 21 tarjetas FIVB desde el bolsillo.", "Elegí el evento del partido.", "Leé carta, gesto y redacción formal.", "Usá el reloj de 8s/30s del acto.", [["Carta", "Amonestación oficial"], ["Gesto", "Seña reglamentaria"]]),
    en: g("Speaks the 21 FIVB cards from your pocket.", "Pick the match event.", "Read the card, gesture and formal wording.", "Use the 8s/30s clock of the act.", [["Card", "Official booking"], ["Gesture", "Regulation signal"]]),
    pt: g("Fala os 21 cartões FIVB do bolso.", "Escolha o evento do jogo.", "Leia cartão, gesto e redação formal.", "Use o relógio de 8s/30s do ato.", [["Cartão", "Advertência oficial"], ["Gesto", "Sinal regulamentar"]]),
  },
  "substitution-tracker": {
    es: g("Mantiene a la mesa honesta con el límite de 12 cambios.", "Registrá cada cambio y reingreso.", "Mirá el conteo vivo por set.", "El sistema avisa el límite.", [["Cambio", "Reemplazo de jugador"], ["Reingreso", "Vuelta del titular reemplazado"]]),
    en: g("Keeps the table honest on the 12-substitution limit.", "Log each sub and re-entry.", "Watch the live per-set count.", "The system warns at the limit.", [["Sub", "Player replacement"], ["Re-entry", "Starter returning after being subbed"]]),
    pt: g("Mantém a mesa honesta com o limite de 12 trocas.", "Registre cada troca e retorno.", "Veja a contagem viva por set.", "O sistema avisa no limite.", [["Troca", "Substituição de jogador"], ["Retorno", "Titular que voltou após ser substituído"]]),
  },
  "court-split": {
    es: g("Termina la pelea de quién pone qué en tres segundos.", "Ingresá horas de cancha y tarifas.", "Agregá quién pagó qué.", "Leé el raleo exacto por jugador.", [["Raleo", "Reparto justo de la cuenta"], ["Tarifa", "Precio por hora de cancha"]]),
    en: g("Ends the who-pays-what fight in three seconds.", "Enter court hours and rates.", "Add who paid what.", "Read the exact split per player.", [["Split", "Fair share of the bill"], ["Rate", "Price per court hour"]]),
    pt: g("Termina a briga de quem põe o quê em três segundos.", "Insira horas de quadra e tarifas.", "Adicione quem pagou o quê.", "Leia a racha exata por jogador.", [["Racha", "Parte justa da conta"], ["Tarifa", "Preço por hora de quadra"]]),
  },
  "fan-companion": {
    es: g("Trivia y práctica de gestos de árbitro desde la tribuna.", "Leé la trivia del partido.", "Adiviná el gesto del árbitro.", "Sumá puntos con los aciertos.", [["Trivia", "Dato curioso del partido"], ["Gesto", "Seña que hace el árbitro"]]),
    en: g("Trivia and referee-gesture practice from the stands.", "Read the match trivia.", "Guess the referee's gesture.", "Score points on correct answers.", [["Trivia", "Match fact quiz"], ["Gesture", "Referee's hand signal"]]),
    pt: g("Trivia e prática de gestos de árbitro na arquibancada.", "Leia a trivia do jogo.", "Adivinhe o gesto do árbitro.", "Some pontos nos acertos.", [["Trivia", "Quiz de dados do jogo"], ["Gesto", "Sinal de mão do árbitro"]]),
  },
  "setter-signals": {
    es: g("Reemplaza el código de dedos por llamadas auditables.", "Elegí tu sistema de juego.", "Revisá la hoja de señas.", "Verificá que ninguna señal choque.", [["Seña", "Gesto codificado del armador"], ["Colisión", "Dos jugadas con la misma seña"]]),
    en: g("Replaces the hand code with auditable, collision-proof calls.", "Pick your system of play.", "Review the signal sheet.", "Verify no two signs collide.", [["Signal", "Coded setter gesture"], ["Collision", "Two plays sharing one signal"]]),
    pt: g("Troca o código de dedos por chamadas auditáveis.", "Escolha seu sistema de jogo.", "Revise a folha de sinais.", "Verifique se nenhum sinal colide.", [["Sinal", "Gesto codificado do levantador"], ["Colisão", "Duas jogadas com o mesmo sinal"]]),
  },
  "mvp-awards": {
    es: g("Entrega premios post-partido a prueba de trampa.", "Calificá a los jugadores del partido.", "Leé MVP, Muralla y Candado.", "Compartí la tarjeta sellada.", [["MVP", "Jugador más valioso"], ["Sello", "Token firmado del premio"]]),
    en: g("Delivers tamper-proof post-match awards.", "Grade the players of the match.", "Read MVP, Wall and Lock.", "Share the sealed card.", [["MVP", "Most valuable player"], ["Seal", "Signed award token"]]),
    pt: g("Entrega prêmios pós-jogo à prova de trapaça.", "Note os jogadores da partida.", "Leia MVP, Muralha e Fechadura.", "Compartilhe o card selado.", [["MVP", "Jogador mais valioso"], ["Selo", "Token assinado do prêmio"]]),
  },
  "timeout-chalkboard": {
    es: g("Convierte los 30 segundos de huddle en táctica escrita.", "Elegí el bloque táctico.", "Corré con el reloj FIVB de 30s.", "Exportá la pizarra al equipo.", [["Huddle", "Reunión rápida del equipo"], ["Bloque", "Jugada prediseñada"]]),
    en: g("Turns the 30-second huddle into a written tactic.", "Pick the tactic block.", "Run it with the 30s FIVB clock.", "Export the board to the team.", [["Huddle", "Quick team meeting"], ["Block", "Pre-drawn play"]]),
    pt: g("Converte os 30 segundos de reunião em tática escrita.", "Escolha o bloco tático.", "Rode com o relógio FIVB de 30s.", "Exporte a lousa para o time.", [["Reunião", "Encontro rápido do time"], ["Bloco", "Jogada pré-desenhada"]]),
  },
  "momentum-coach": {
    es: g("Lee el momento y te indica apretar o pedir tiempo.", "Registrá los últimos resultados de rally.", "Mirá la ventana de 6 puntos.", "Seguí la recomendación con motivo.", [["Momentum", "Impulso del partido"], ["Ventana", "Últimos 6 rallys"]]),
    en: g("Reads momentum and tells you to push or call time.", "Log recent rally outcomes.", "Watch the 6-point window.", "Follow the reasoned call.", [["Momentum", "Match flow"], ["Window", "Last 6 rallies"]]),
    pt: g("Lê o momento e indica apertar ou pedir tempo.", "Registre os últimos resultados.", "Veja a janela de 6 pontos.", "Siga a recomendação com motivo.", [["Momentum", "Fluxo do jogo"], ["Janela", "Últimos 6 ralis"]]),
  },
  "captain-draft": {
    es: g("Arma dos equipos parejos con draft en serpiente.", "Pegá la lista de jugadores.", "Elegí capitanes y cantidad.", "Seguí el orden serpiente A-B-B-A.", [["Serpiente", "Orden alterno de selección"], ["Capitán", "Jugador que elige primero"]]),
    en: g("Builds two fair teams with a snake draft.", "Paste the player list.", "Pick captains and count.", "Follow the A-B-B-A snake order.", [["Snake", "Alternating pick order"], ["Captain", "Player who picks first"]]),
    pt: g("Monta dois times justos com draft em serpiente.", "Cole a lista de jogadores.", "Escolha capitães e quantidade.", "Siga a ordem serpente A-B-B-A.", [["Serpiente", "Ordem alternada de escolha"], ["Capitão", "Jogador que escolhe primeiro"]]),
  },
  "roster-pass": {
    es: g("Audita un plantel contra las reglas de 12 jugadores.", "Pegá el plantel del partido.", "El sistema chequea capitán y líberos.", "Aprobá para la mesa oficial.", [["Plantel", "Lista de jugadores del partido"], ["Pase", "Audiencia aprobada"]]),
    en: g("Audits a match roster against the 12-player rules.", "Paste the match roster.", "The system checks captain and liberos.", "Approve it for the table.", [["Roster", "Match player list"], ["Pass", "Cleared to play"]]),
    pt: g("Audita um elenco contra as regras de 12 jogadores.", "Cole o elenco do jogo.", "O sistema checa capitão e líberos.", "Aprove para a mesa oficial.", [["Elenco", "Lista de jogadores do jogo"], ["Passe", "Liberado para jogar"]]),
  },
  "equipment-inspector": {
    es: g("Certifica altura de red y presiones dentro de tolerancia.", "Ingresá las medidas reales.", "Compará contra las tolerancias FIVB.", "Leé pasa o falla con el detalle.", [["Red", "Altura oficial por género"], ["Tolerancia", "Margen permitido de medida"]]),
    en: g("Certifies net height and ball pressure within tolerance.", "Enter the measured values.", "Compare against FIVB tolerances.", "Read pass or fail with detail.", [["Net", "Official height by gender"], ["Tolerance", "Allowed measurement margin"]]),
    pt: g("Certifica altura de rede e pressão dentro de tolerância.", "Insira as medidas reais.", "Compare com as tolerâncias FIVB.", "Leia passa ou falha com detalhe.", [["Rede", "Altura oficial por gênero"], ["Tolerância", "Margem permitida da medida"]]),
  },
  "match-poster": {
    es: g("Publica el cruce de la semana en un toque.", "Elegí tema y equipos.", "Ajustá fecha y sede.", "Exportá el SVG 1080x1920.", [["SVG", "Gráfico vectorial para redes"], ["Fixture", "Cruz programado"]]),
    en: g("Promotes next week's fixture in one tap.", "Pick the theme and teams.", "Set date and venue.", "Export the 1080x1920 SVG.", [["SVG", "Vector graphic for socials"], ["Fixture", "Scheduled matchup"]]),
    pt: g("Publica o jogo da semana em um toque.", "Escolha tema e times.", "Defina data e local.", "Exporte o SVG 1080x1920.", [["SVG", "Gráfico vetorial para redes"], ["Fixture", "Jogo agendado"]]),
  },
  "serve-radar": {
    es: g("Convierte km/h crudos en un plan de aces.", "Ingresá velocidad y zona receptora.", "Leé el plan de saque sugerido.", "Checkeá la reacción del receptor.", [["Ace", "Saque imparable"], ["Reacción", "Tiempo del receptor en ms"]]),
    en: g("Turns raw km/h into an acing plan.", "Enter speed and receiver zone.", "Read the suggested serve plan.", "Check the receiver's reaction.", [["Ace", "Unreturnable serve"], ["Reaction", "Receiver time in ms"]]),
    pt: g("Converte km/h crus em plano de aces.", "Insira velocidade e zona de recepção.", "Leia o plano de saque sugerido.", "Confira a reação do receptor.", [["Ace", "Saque imparável"], ["Reação", "Tempo do receptor em ms"]]),
  },
  "matchup-matrix": {
    es: g("Pone tus mejores bloqueadores sobre la cañona rival.", "Calificá la matriz 6x6.", "Leé la rotación óptima.", "Ordená el saque en consecuencia.", [["Matriz", "Cruce atacante vs bloqueador"], ["Rotación", "Orden defensivo óptimo"]]),
    en: g("Puts your best blockers on the rival gun.", "Grade the 6x6 matrix.", "Read the optimal rotation.", "Order the serve accordingly.", [["Matrix", "Hitter vs blocker cross"], ["Rotation", "Optimal defensive order"]]),
    pt: g("Ponha seus melhores bloqueadores na canhoneira rival.", "Note a matriz 6x6.", "Leia o rodízio ótimo.", "Ordene o saque em consequência.", [["Matriz", "Cruzamento atacante vs bloqueador"], ["Rodízio", "Ordem defensiva ótima"]]),
  },
  "blockout-lab": {
    es: g("Pone precio esperado a manos abajo vs cepillar.", "Elegí el esquema de bloqueo.", "Compará el valor esperado de cada opción.", "Seguí la decisión del lab.", [["Block-out", "Golpe fuera del bloqueo"], ["Valor esperado", "Probabilidad × resultado"]]),
    en: g("Prices hands-out vs tool-the-block with expected value.", "Pick the block scheme.", "Compare expected value per option.", "Follow the lab's decision.", [["Block-out", "Wiping the block for a point"], ["Expected value", "Probability × outcome"]]),
    pt: g("Põe preço em mão abaixo vs cepillar o bloqueio.", "Escolha o esquema de bloqueio.", "Compare o valor esperado de cada opção.", "Siga a decisão do lab.", [["Block-out", "Golpe para fora do bloqueio"], ["Valor esperado", "Probabilidade × resultado"]]),
  },
  "practice-planner": {
    es: g("Arma un entrenamiento de 60/90/120 minutos en bloques.", "Elegí enfoque y duración.", "Leé bloques con objetivos y ejercicios.", "Cerrá con las metas de puntos.", [["Bloque", "Tramo temático del entrenamiento"], ["Meta", "Objetivo medible del ejercicio"]]),
    en: g("Builds a 60/90/120-minute practice in blocks.", "Pick focus and duration.", "Read blocks with drills and objectives.", "Close with scoring targets.", [["Block", "Thematic practice segment"], ["Target", "Measurable drill goal"]]),
    pt: g("Monta um treino de 60/90/120 minutos em blocos.", "Escolha foco e duração.", "Leia blocos com exercícios e objetivos.", "Feche com metas de pontos.", [["Bloco", "Trecho temático do treino"], ["Meta", "Objetivo mensurável do drill"]]),
  },
  "play-by-play": {
    es: g("Narra el partido en ES/EN/PT corriendo.", "Registrá los eventos del partido.", "Leé la crónica generada.", "Compartí el resumen del set.", [["Crónica", "Relato línea a línea"], ["Evento", "Punto, block o timeout"]]),
    en: g("Narrates the match live in ES/EN/PT.", "Log the match events.", "Read the generated chronicle.", "Share the set summary.", [["Chronicle", "Line-by-line account"], ["Event", "Point, block or timeout"]]),
    pt: g("Narra o jogo ao vivo em ES/EN/PT.", "Registre os eventos do jogo.", "Leia a crônica gerada.", "Compartilhe o resumo do set.", [["Crônica", "Relato linha a linha"], ["Evento", "Ponto, bloqueio ou tempo"]]),
  },
  "player-career": {
    es: g("Entrega un dossier de progresión listo para el club.", "Calificá los 5 ejes vs referencias.", "Leé el índice 0-100.", "Seguí el cuello de botella sugerido.", [["Índice", "Nota global de carrera"], ["Cuello de botella", "Eje más atrasado"]]),
    en: g("Hands a club-ready progress dossier.", "Grade the 5 axes vs benchmarks.", "Read the 0-100 index.", "Follow the suggested bottleneck fix.", [["Index", "Career overall score"], ["Bottleneck", "Weakest axis to fix"]]),
    pt: g("Entrega um dossiê de progressão pronto para o clube.", "Note os 5 eixos vs referências.", "Leia o índice 0-100.", "Siga a correção do gargalo.", [["Índice", "Nota global de carreira"], ["Gargalo", "Eixo mais atrasado"]]),
  },
  "ball-aerodynamics": {
    es: g("Explica con números un flotado que muere en pleno vuelo.", "Ingresá velocidad, giro y ángulo.", "Mirá la predicción de caída.", "Detectá la crisis de flotado.", [["Flotado", "Saque sin rotación"], ["Drag", "Resistencia del aire"]]),
    en: g("Explains a float serve dying mid-flight with numbers.", "Enter speed, spin and angle.", "Read the landing prediction.", "Spot the drag crisis.", [["Float", "Serve with no spin"], ["Drag", "Air resistance"]]),
    pt: g("Explica com números um flotado que morre no voo.", "Insira velocidade, rotação e ângulo.", "Leia a previsão de queda.", "Detecte a crise de flutuação.", [["Flotado", "Saque sem rotação"], ["Drag", "Resistência do ar"]]),
  },
  "rally-clipper": {
    es: g("Arma un reel sin editor de video.", "Registrá inicio/fin y habilidad por rally.", "Dejá que elija los mejores.", "Copiá el plan ffmpeg y EDL.", [["EDL", "Lista de ediciones de corte"], ["Reel", "Compilación de mejores jugadas"]]),
    en: g("Builds a highlight reel without a video editor.", "Log start/end and skill per rally.", "Let it pick the best ones.", "Copy the ffmpeg plan and EDL.", [["EDL", "Edit decision list"], ["Reel", "Best-plays compilation"]]),
    pt: g("Monta um reel sem editor de vídeo.", "Registre início/fim e habilidade por rali.", "Deixe ele escolher os melhores.", "Copie o plano ffmpeg e EDL.", [["EDL", "Lista de decisões de corte"], ["Reel", "Compilação de melhores jogadas"]]),
  },
  "recruiting-dossier": {
    es: g("Postula a un recluta universitario sin escáner.", "Ingresá objetivos y año de egreso.", "Completá medidas y métricas.", "Exportá el dossier sellado.", [["Dossier", "Ficha formal del atleta"], ["Sello", "Firma HMAC del documento"]]),
    en: g("Pitches a college recruit without a scanner.", "Enter goals and graduation year.", "Fill in measurables and metrics.", "Export the sealed dossier.", [["Dossier", "Formal athlete profile"], ["Seal", "HMAC signature of the file"]]),
    pt: g("Candidata um recruta universitário sem scanner.", "Insira objetivos e ano de formatura.", "Preencha medidas e métricas.", "Exporte o dossiê selado.", [["Dossiê", "Ficha formal do atleta"], ["Selo", "Assinatura HMAC do arquivo"]]),
  },
  "system-transition": {
    es: g("Confirma qué sistema hace pie con tu plantel.", "Calificá armadores, recepción y penetración.", "Leé la recomendación 4-2 / 6-2 / 5-1.", "Simulá el cambio de sistema.", [["5-1", "Un armador rotando seis zonas"], ["6-2", "Dos armadores sin rotar"]]),
    en: g("Confirms which system fits your personnel.", "Grade setters, reception and penetration.", "Read the 4-2 / 6-2 / 5-1 advice.", "Simulate the system change.", [["5-1", "One setter rotating six zones"], ["6-2", "Two setters, no rotation"]]),
    pt: g("Confirma qual sistema funciona com seu elenco.", "Note levantadores, recepção e penetração.", "Leia o conselho 4-2 / 6-2 / 5-1.", "Simule a troca de sistema.", [["5-1", "Um levantador rotacionando"], ["6-2", "Dois levantadores sem rotação"]]),
  },
  "deception-reader": {
    es: g("Mide qué tan legibles son tus atacantes.", "Ingresá carrera, codo y línea de pelota.", "Leé el compromiso probable de la defensa.", "Trabajá los indicadores de engaño.", [["Engaño", "Falsa lectura del defensor"], ["Compromiso", "Defensor adelantado antes del tiempo"]]),
    en: g("Measures how readable your attackers are.", "Enter approach, elbow and ball line.", "Read the defender's likely commit.", "Work the deception indicators.", [["Deceit", "Fake read by the defender"], ["Commit", "Defender frozen early"]]),
    pt: g("Mede quão legíveis são seus atacantes.", "Insira corrida, cotovelo e linha de bola.", "Leia o compromisso provável da defesa.", "Trabalhe os indicadores de engano.", [["Engano", "Leitura falsa do defensor"], ["Compromisso", "Defensor travado cedo"]]),
  },
  "inclusive-adaptive": {
    es: g("Adapta cualquier partido a sentado, mini o mixto.", "Elegí modo y categoría.", "Definí cantidad de jugadores.", "Leé el reglamento adaptado.", [["Sentado", "Vóley en silla de ruedas"], ["Mini", "Formato reducido infantil"]]),
    en: g("Adapts any match to sitting, mini or mixed play.", "Pick mode and category.", "Set the player count.", "Read the adapted rulebook.", [["Sitting", "Wheelchair volleyball"], ["Mini", "Reduced youth format"]]),
    pt: g("Adapta qualquer jogo para sentado, mini ou misto.", "Escolha modo e categoria.", "Defina o número de jogadores.", "Leia o regulamento adaptado.", [["Sentado", "Vôlei em cadeira de rodas"], ["Mini", "Formato reducido infantil"]]),
  },
  "elo-ranking": {
    es: g("Rankea equipos ponderando margen, no solo victoria.", "Ingresá ratings previos.", "Cargá el resultado y el margen.", "Leé los ratings paso a paso.", [["Rating", "Puntos Elo del equipo"], ["Margen", "Diferencia de sets ganados"]]),
    en: g("Ranks teams weighting margin, not just wins.", "Enter the prior ratings.", "Load the result and margin.", "Read the ratings step by step.", [["Rating", "Team Elo points"], ["Margin", "Set-difference of the win"]]),
    pt: g("Ranqueia times ponderando margem, não só vitória.", "Insira os ratings anteriores.", "Carregue o resultado e a margem.", "Leia os ratings passo a passo.", [["Rating", "Pontos Elo do time"], ["Margem", "Diferença de sets vencidos"]]),
  },
  "team-treasury": {
    es: g("Termina el quién-pagó-la-camiseta.", "Cargá cuotas y fondo de pelotas.", "Registrá quién pagó qué.", "Leé balances por jugador y exportá.", [["Balance", "Estado de cuenta por jugador"], ["Fondo", "Aporte común del equipo"]]),
    en: g("Ends the who-paid-the-jersey confusion.", "Load fees and the ball fund.", "Log who paid what.", "Read per-player balances and export.", [["Balance", "Per-player statement"], ["Fund", "Shared team contribution"]]),
    pt: g("Termina o quem-pagou-a-camisa.", "Carregue mensalidades e bolo de bolas.", "Registre quem pagou o quê.", "Leia saldos por jogador e exporte.", [["Saldo", "Extrato por jogador"], ["Fundo", "Contribuição comum do time"]]),
  },
  "house-rules": {
    es: g("Corre un partido nocturno con reglas de calle sin caos.", "Elegí formato y orden de banco.", "Definí deuce o punto de oro.", "Leé la lista blanca para arrancar.", [["Relojito", "Variante callejera a muerte"], ["Punto de oro", "Punto final decisivo"]]),
    en: g("Runs a night match by street rules without chaos.", "Pick format and bench order.", "Define deuce or golden point.", "Read the whitelist to start.", [["Relojito", "Street sudden-death variant"], ["Golden point", "Deciding final point"]]),
    pt: g("Roda um jogo noturno com regras de rua sem caos.", "Escolha formato e ordem de banco.", "Defina duplo ou ponto de ouro.", "Leia a lista branca para começar.", [["Relojito", "Variante de rua a morte súbita"], ["Ponto de ouro", "Ponto final decisivo"]]),
  },
  "arena-dj": {
    es: g("Dispara cues de bloqueo, remate y ace sin internet.", "Elegí el evento del partido.", "Escuchá el cue WebAudio al instante.", "Mirá el banner del estadio.", [["Cue", "Sonido disparado por evento"], ["Banner", "Texto del estadio en pantalla"]]),
    en: g("Fires block, spike and ace cues with no internet.", "Pick the match event.", "Hear the WebAudio cue instantly.", "See the stadium banner.", [["Cue", "Sound fired by event"], ["Banner", "Stadium text on screen"]]),
    pt: g("Dispara cues de bloqueio, ataque e ace sem internet.", "Escolha o evento do jogo.", "Ouça o cue WebAudio na hora.", "Veja o banner do estádio.", [["Cue", "Som disparado por evento"], ["Banner", "Texto do estádio na tela"]]),
  },
  "court-slang": {
    es: g("Explica gírias de cancha AR/ES/MX/BR/US al visitante.", "Ingresá el término y su origen.", "Leé significado y uso real.", "Copiá la frase local como nativo.", [["Gíria", "Expresión propia del país"], ["Origen", "Región del término"]]),
    en: g("Explains AR/ES/MX/BR/US court slang to visitors.", "Enter the term and its origin.", "Read meaning and real usage.", "Copy the local phrase like a native.", [["Slang", "Country-specific expression"], ["Origin", "Region of the term"]]),
    pt: g("Explica gírias de quadra AR/ES/MX/BR/US ao visitante.", "Insira o termo e sua origem.", "Leia significado e uso real.", "Copie a frase local como nativo.", [["Gíria", "Expressão própria do país"], ["Origem", "Região do termo"]]),
  },
  "qr-sync": {
    es: g("Clona estado entre teléfonos sin red alguna.", "Elegí payload y tamaño de matriz.", "Escaneá el SVG firmado con el otro aparato.", "Verificá HMAC antes de importar.", [["Payload", "Datos dentro del QR"], ["HMAC", "Firma anti-manipulación"]]),
    en: g("Clones state between phones with no network.", "Pick payload and matrix size.", "Scan the signed SVG on the other device.", "Verify HMAC before importing.", [["Payload", "Data inside the QR"], ["HMAC", "Tamper-proof signature"]]),
    pt: g("Clona estado entre celulares sem rede.", "Escolha payload e tamanho da matriz.", "Escaneie o SVG assinado no outro aparelho.", "Verifique o HMAC antes de importar.", [["Payload", "Dados dentro do QR"], ["HMAC", "Assinatura anti-manipulação"]]),
  },
  "gym-screen": {
    es: g("Transmite el marcador mismo hacia la tribuna a 30 metros.", "Tocá TV desde el marcador.", "Ajustá equipo, marcador y timer.", "Dejá la pantalla gigante en la cancha.", [["Pantalla gigante", "Vista fullscreen para tribuna"], ["Timer", "Reloj del partido"]]),
    en: g("Broadcasts the scoreboard itself to the stands at 30 metres.", "Tap TV from the scoreboard.", "Adjust teams, score and timer.", "Leave the giant screen on court.", [["Giant screen", "Fullscreen stand-facing view"], ["Timer", "Match clock"]]),
    pt: g("Transmite o placar para a arquibancada a 30 metros.", "Toque TV no placar.", "Ajuste times, marcador e timer.", "Deixe a tela gigante na quadra.", [["Tela gigante", "Vista fullscreen para a arquibancada"], ["Timer", "Relógio do jogo"]]),
  },
  "fivb-escoresheet": {
    es: g("Produce la súmula A4 oficial con sanciones incluidas.", "Cargá sets, cambios y sanciones.", "Firmá con sello HMAC.", "Imprimí el acta A4.", [["Acta", "Documento oficial del partido"], ["Sanción", "Tarjeta registrada"]]),
    en: g("Produces the official A4 scoresheet with sanctions.", "Load sets, subs and sanctions.", "Sign with the HMAC seal.", "Print the A4 act.", [["Act", "Official match document"], ["Sanction", "Recorded card"]]),
    pt: g("Produz a súmula A4 oficial com punições.", "Carregue sets, trocas e punições.", "Assine com o selo HMAC.", "Imprima o ato A4.", [["Ato", "Documento oficial do jogo"], ["Punição", "Cartão registrado"]]),
  },
  "video-telestrator": {
    es: g("Convierte video de galería en datos de biomecánica.", "Cargá el video y elegí el fps.", "Marcá despegue y aterrizaje.", "Dibujá vectores y exportá sellado.", [["Despegue", "Último contacto con el piso"], ["Vector", "Línea de dirección dibujada"]]),
    en: g("Converts gallery video into biomechanics data.", "Load the video and pick fps.", "Mark take-off and landing.", "Draw vectors and export sealed.", [["Take-off", "Last ground contact"], ["Vector", "Drawn direction line"]]),
    pt: g("Converte vídeo da galeria em dados de biomecânica.", "Carregue o vídeo e escolha o fps.", "Marque decolagem e aterrissagem.", "Desenhe vetores e exporte selado.", [["Decolagem", "Último contato com o chão"], ["Vetor", "Linha de direção desenhada"]]),
  },
  "playbook-animator": {
    es: g("Reemplaza las tizas con una jugada animada en 3 fases.", "Elegí saque, transición y ataque.", "Ubicá jugadores y zona objetivo.", "Reproducí y exportá el SVG.", [["Fase", "Tramo de la jugada"], ["Zona", "Destino del ataque"]]),
    en: g("Replaces chalk arrows with an animated 3-phase play.", "Pick serve, transition and attack.", "Place players and target zone.", "Play and export the SVG.", [["Phase", "Segment of the play"], ["Zone", "Attack target area"]]),
    pt: g("Troca as giz por uma jogada animada em 3 fases.", "Escolha saque, transição e ataque.", "Posicione jogadores e zona alvo.", "Reproduza e exporte o SVG.", [["Fase", "Trecho da jogada"], ["Zona", "Área alvo do ataque"]]),
  },
  "shot-heatmap": {
    es: g("Lee tendencias de ataque del rival por zona.", "Tocá origen y después destino.", "Marcá el resultado del remate.", "Leé zona caliente y eficiencia.", [["Zona caliente", "Sector más atacado"], ["Eficiencia", "Kills sobre remates"]]),
    en: g("Reads opponent attack tendencies by zone.", "Tap origin then destination.", "Mark the shot outcome.", "Read hot zone and efficiency.", [["Hot zone", "Most-attacked sector"], ["Efficiency", "Kills over attempts"]]),
    pt: g("Lê tendências de ataque do rival por zona.", "Toque origem e depois destino.", "Marque o resultado do ataque.", "Leia zona quente e eficiência.", [["Zona quente", "Setor mais atacado"], ["Eficiência", "Acertos sobre tentativas"]]),
  },
  "tournament-nutrition": {
    es: g("Mantiene un doblete vivo hasta el quinto set.", "Ingresá peso, partidos y clima.", "Definí tasa de sudor.", "Leé carbohidratos, líquido y sodio.", [["Carbohidratos", "Combustible del partido"], ["Sodio", "Electrolito perdido en sudor"]]),
    en: g("Keeps a double-header alive into set 5.", "Enter weight, matches and weather.", "Set the sweat rate.", "Read carbs, fluid and sodium.", [["Carbs", "Match fuel"], ["Sodium", "Electrolyte lost in sweat"]]),
    pt: g("Mantém uma sequência de dois jogos viva até o quinto set.", "Insira peso, jogos e clima.", "Defina a taxa de suor.", "Leia carboidratos, líquido e sódio.", [["Carboidratos", "Combustível do jogo"], ["Sódio", "Eletrólito perdido no suor"]]),
  },
  "injury-prehab": {
    es: g("Marca el riesgo de rodilla y hombro antes del volumen.", "Ingresá saltos, remates, sueño y dolor.", "Leé el puntaje de riesgo.", "Seguí el tope de saltos y drills.", [["Prehab", "Ejercicios preventivos"], ["Rodilla de saltador", "Dolor por sobrecarga de saltos"]]),
    en: g("Flags knee and shoulder risk before volume does.", "Enter jumps, spikes, sleep and pain.", "Read the risk score.", "Follow the jump cap and drills.", [["Prehab", "Prevention exercises"], ["Jumper's knee", "Overload pain from jumping"]]),
    pt: g("Marca risco de joelho e ombro antes do volume.", "Insira saltos, ataques, sono e dor.", "Leia a nota de risco.", "Siga o teto de saltos e drills.", [["Prehab", "Exercícios preventivos"], ["Joelho do saltador", "Dor por sobrecarga"]]),
  },
  "tiebreak-commander": {
    es: g("Arbitra el set definitorio con calma a 14-14.", "Ingresá marcador y quién saca.", "Leé la fase y el aviso de cambio.", "Seguí la recomendación táctica.", [["Tiebreak", "Set decisivo a 15"], ["Cambio", "Rotación de lado al punto 8"]]),
    en: g("Referees the deciding set calmly at 14-14.", "Enter score and server.", "Read the phase and switch alert.", "Follow the tactical call.", [["Tiebreak", "Deciding set to 15"], ["Switch", "Side change at point 8"]]),
    pt: g("Arbitra o set decisivo com calma em 14-14.", "Insira placar e sacador.", "Leia a fase e o aviso de troca.", "Siga a recomendação tática.", [["Tiebreak", "Set decisivo a 15"], ["Troca", "Muda de lado no ponto 8"]]),
  },
  "bracket-architect": {
    es: g("Siembra llaves sin cruces repetidos antes de la final.", "Pegá la lista de equipos.", "Elegí siembras por ranking.", "Leé rondas y libres.", [["Siembra", "Orden de favoritos"], ["Bye", "Pase directo a la siguiente ronda"]]),
    en: g("Seeds brackets without repeat pairings before the final.", "Paste the team list.", "Seed by ranking.", "Read rounds and byes.", [["Seed", "Favorite ordering"], ["Bye", "Direct ticket to the next round"]]),
    pt: g("Semeia chaves sem cruzamentos repetidos antes da final.", "Cole a lista de times.", "Semeie por ranking.", "Leia rodadas e byes.", [["Semente", "Ordenação de favoritos"], ["Bye", "Passagem direta à próxima rodada"]]),
  },
  "sponsor-deck": {
    es: g("Valora banners y posteos en moneda local.", "Ingresá impresiones y alcance.", "Definí CPM y engagement.", "Leé tier, CPM efectivo y valor.", [["CPM", "Precio por mil impresiones"], ["Alcance", "Personas únicas vistas"]]),
    en: g("Values banners and posts in local currency.", "Enter impressions and reach.", "Set CPM and engagement.", "Read tier, effective CPM and value.", [["CPM", "Cost per thousand impressions"], ["Reach", "Unique people seen"]]),
    pt: g("Valora banners e posts em moeda local.", "Insira impressões e alcance.", "Defina CPM e engajamento.", "Leia tier, CPM efetivo e valor.", [["CPM", "Custo por mil impressões"], ["Alcance", "Pessoas únicas vistas"]]),
  },
  "head-to-head": {
    es: g("Suma el historial de dos equipos antes del cruce.", "Ingresá los marcadores previos.", "Leé victorias, sets y dominante.", "Mirá la racha vigente.", [["Racha", "Resultados consecutivos"], ["Dominio", "Sets ganados vs perdidos"]]),
    en: g("Sums two teams' record before the fixture.", "Enter the past scores.", "Read wins, sets and leader.", "Check the current streak.", [["Streak", "Consecutive results"], ["Dominance", "Sets won vs lost"]]),
    pt: g("Soma o histórico de dois times antes do jogo.", "Insira os placares anteriores.", "Leia vitórias, sets e dominante.", "Veja a sequência atual.", [["Sequência", "Resultados consecutivos"], ["Domínio", "Sets ganhos vs perdidos"]]),
  },
  "peripheral-reflex": {
    es: g("Entrena la vista que gana picadas durondos.", "Cerrá el ojo y tocá el objetivo al verlo.", "Registrá los tiempos en ms.", "Leé promedio, dispersión y nota.", [["Reflejo", "Tiempo de reacción visual"], ["Periférico", "Visión de los bordes"]]),
    en: g("Trains the eyes that win hard digs.", "Cover one eye and tap the target when seen.", "Log the times in ms.", "Read mean, spread and rating.", [["Reflex", "Visual reaction time"], ["Peripheral", "Edge-of-vision sight"]]),
    pt: g("Treina o olho que ganha defesas duras.", "Feche um olho e toque o alvo ao ver.", "Registre os tempos em ms.", "Leia média, dispersão e nota.", [["Reflexo", "Tempo de reação visual"], ["Periférico", "Visão das bordas"]]),
  },
};

const FALLBACK = (locale: Locale): ModuleGuide =>
  locale === "es"
    ? g("Módulo local VolleyOS: funciona 100% sin internet.", "Abrí el módulo con el ejemplo cargado.", "Ajustá los datos a tu partido.", "Guardá el reporte en tu bóveda.", [["Ejemplo", "Datos precargados"], ["Bóveda", "Guardado temporal local"]])
    : locale === "en"
      ? g("VolleyOS local module: works 100% offline.", "Open the module with the example loaded.", "Adjust the data to your match.", "Save the report to your vault.", [["Example", "Preloaded data"], ["Vault", "Local temporary save"]])
      : g("Módulo local VolleyOS: funciona 100% sem internet.", "Abra o módulo com o exemplo carregado.", "Ajuste os dados ao seu jogo.", "Salve o relatório no seu cofre.", [["Exemplo", "Dados pré-carregados"], ["Cofre", "Salvamento local temporário"]]);

export function getModuleGuide(slug: string, locale: Locale): ModuleGuide {
  return MODULE_GUIDES[slug]?.[locale] ?? FALLBACK(locale);
}
