/**
 * Engine output localisation.
 *
 * The 48 engines return diagnostic prose in Spanish (their canonical language).
 * StationShell renders that prose through this translator, so an EN/PT user
 * reads authentic court language instead of Spanish leftovers. Structured
 * codes, numbers and team names pass through untouched.
 */

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

import type { Locale } from "@/lib/local-engines";

interface Translation {
  en: string;
  pt: string;
}

const EXACT: Record<string, Translation> = {
  "Dentro de la ventana.": { en: "Inside the window.", pt: "Dentro da janela." },
  "Mantén la progresión actual.": { en: "Keep the current progression.", pt: "Mantenha a progressão atual." },
  "Reduce 20-30% los saltos y prioriza recuperación.": {
    en: "Cut jumps by 20-30% and prioritise recovery.",
    pt: "Reduza 20-30% dos saltos e priorize a recuperação.",
  },
  "Riesgo de tendinopatía rotuliana y manguito rotador. Descarga ya.": {
    en: "Patellar tendon and rotator cuff risk. Deload now.",
    pt: "Risco de tendinopatia patelar e manguito rotador. Descarga já.",
  },
  "Sube la carga gradualmente para evitar el rebote lesivo.": {
    en: "Raise load gradually to avoid an injury rebound.",
    pt: "Suba a carga aos poucos para evitar o rebote de lesão.",
  },
  "Sello HMAC-SHA256 emitido sobre JSON canónico ordenado.": {
    en: "HMAC-SHA256 seal issued over ordered canonical JSON.",
    pt: "Selo HMAC-SHA256 emitido sobre JSON canônico ordenado.",
  },
  "Acta alterada: el sello no coincide.": {
    en: "Match sheet altered: the seal does not match.",
    pt: "Súmula alterada: o selo não confere.",
  },
  "Sello válido: el acta conserva su integridad.": {
    en: "Valid seal: the match sheet keeps its integrity.",
    pt: "Selo válido: a súmula mantém a integridade.",
  },
  "Cápsula .volleyos sellada con SHA-256. Compártela offline.": {
    en: ".volleyos capsule sealed with SHA-256. Share it offline.",
    pt: "Cápsula .volleyos selada com SHA-256. Compartilhe offline.",
  },
  "Cápsula importada y verificada: checksum SHA-256 válido.": {
    en: "Capsule imported and verified: valid SHA-256 checksum.",
    pt: "Cápsula importada e verificada: checksum SHA-256 válido.",
  },
  "Pizarra de tiempo muerto lista: 30 s FIVB, dos consignas y trazos validados.": {
    en: "Timeout board ready: 30 FIVB seconds, two cues, validated strokes.",
    pt: "Lousa de tempo pronta: 30 s FIVB, duas orientações e traços validados.",
  },
  "Draft serpiente generado con auditoría por departamento.": {
    en: "Snake draft generated with a position audit.",
    pt: "Draft serpente gerado com auditoria por posição.",
  },
  "Pase de plantel verificado y listo para mesa.": {
    en: "Roster pass verified and ready for the table.",
    pt: "Passe de elenco verificado e pronto para a mesa.",
  },
  "Poster SVG generado con nombres escapados, sello HMAC y matriz de sala.": {
    en: "SVG poster generated with escaped names, HMAC seal and room matrix.",
    pt: "Pôster SVG gerado com nomes escapados, selo HMAC e matriz de sala.",
  },
  "Red y balón conformes: equipo listo.": {
    en: "Net and ball compliant: team ready.",
    pt: "Rede e bola conformes: equipe pronta.",
  },
  "Red fuera de tolerancia: corrige la tensión.": {
    en: "Net outside tolerance: fix the tension.",
    pt: "Rede fora da tolerância: corrija a tensão.",
  },
  "Balón fuera de rango: ajusta la presión.": {
    en: "Ball out of range: adjust the pressure.",
    pt: "Bola fora da faixa: ajuste a pressão.",
  },
  "Sin racha crítica: mantén la rotación y el plan de saque.": {
    en: "No critical run: keep the rotation and serve plan.",
    pt: "Sem sequência crítica: mantenha o rodízio e o plano de saque.",
  },
  "Racha de 5 o más: tiempo muerto urgente o sustitución.": {
    en: "Run of 5+: urgent timeout or substitution.",
    pt: "Sequência de 5 ou mais: tempo urgente ou substituição.",
  },
  "ÓPTIMA": { en: "OPTIMAL", pt: "ÓTIMA" },
  "FATIGA ACUMULADA": { en: "ACCUMULATED FATIGUE", pt: "FADIGA ACUMULADA" },
  "PRECAUCIÓN": { en: "CAUTION", pt: "ATENÇÃO" },
  "BAJA CARGA": { en: "LOW LOAD", pt: "CARGA BAIXA" },
  "Eficiencia": { en: "Efficiency", pt: "Eficiência" },
  "Jugadores": { en: "Players", pt: "Jogadores" },
  "Duracion": { en: "Duration", pt: "Duração" },
  "Foco": { en: "Focus", pt: "Foco" },
  "Recomendado": { en: "Recommended", pt: "Recomendado" },
  "Muneca": { en: "Wrist", pt: "Punho" },
  "Cuello": { en: "Bottleneck", pt: "Gargalo" },
  "Categoria": { en: "Category", pt: "Categoria" },
  "Puntaje": { en: "Score", pt: "Pontuação" },
  "Equipo": { en: "Team", pt: "Equipe" },
  "Jugada deshecha.": { en: "Play undone.", pt: "Jogada desfeita." },
  "Jugada rehecha.": { en: "Play redone.", pt: "Jogada refeita." },
  "Sets": { en: "Sets", pt: "Sets" },
  "FINAL": { en: "FINAL", pt: "FINAL" },
  "Bloqueo": { en: "Block", pt: "Bloqueio" },
  "Saque": { en: "Serve", pt: "Saque" },
  "Tempo": { en: "Tempo", pt: "Tempo" },
  "Armador": { en: "Setter", pt: "Levantador" },
  "Recepción": { en: "Pass", pt: "Passe" },
  "Ataque": { en: "Attack", pt: "Ataque" },
  "Defensa": { en: "Dig", pt: "Defesa" },
  "Punto": { en: "Point", pt: "Ponto" },
  "Error": { en: "Error", pt: "Erro" },
  "Bloqueada": { en: "Blocked", pt: "Bloqueada" },
  "En juego": { en: "In play", pt: "Em jogo" },
  "Cruzada": { en: "Cross", pt: "Cruzada" },
  "Paralela": { en: "Line", pt: "Paralela" },
  "Diagonal": { en: "Diagonal", pt: "Diagonal" },
  "Sin dirección": { en: "No direction", pt: "Sem direção" },
  "Alto contraste alternado.": { en: "High contrast toggled.", pt: "Alto contraste alternado." },
  "Ejemplo cargado: set decisivo 22-20.": { en: "Example loaded: decider 22-20.", pt: "Exemplo carregado: set decisivo 22-20." },
  "Elegí un equipo para sumar.": { en: "Pick a team to score.", pt: "Escolha um time para pontuar." },
  "Reglas validas.": { en: "Rules valid.", pt: "Regras válidas." },
  "Líbero armando de dedos delante de la línea de 3 m": {
    en: "Libero setting with fingers in front of the 3 m line",
    pt: "Líbero levantando de dedos à frente da linha de 3 m",
  },
  "El líbero no puede armar de dedos en zona delantera cuando la jugada termina en ataque.": {
    en: "The libero cannot finger-set in the front zone when the play ends in an attack.",
    pt: "O líbero não pode levantar de dedos na zona de frente quando a jogada termina em ataque.",
  },
  "Toque de red": { en: "Net touch", pt: "Toque na rede" },
  "La banda superior blanca y la antena cuentan; el cabello no.": {
    en: "The white top band and the antenna count; hair does not.",
    pt: "A faixa superior branca e a antena contam; o cabelo não.",
  },
  "Invasión por debajo de la red": { en: "Penetration under the net", pt: "Invasão por baixo da rede" },
  "El pie completo que cruza la línea central es falta.": {
    en: "A whole foot crossing the centre line is a fault.",
    pt: "O pé inteiro que cruza a linha central é falta.",
  },
  "Manos sobre la red en bloqueo": { en: "Hands over the net on a block", pt: "Mãos sobre a rede no bloqueio" },
  "Se permite penetrar después del golpe de ataque rival sin interferir.": {
    en: "Penetration after the opponent's attack hit is allowed if it does not interfere.",
    pt: "É permitido penetrar depois do golpe de ataque rival sem interferir.",
  },
  "Pantalla en el saque": { en: "Screen on the serve", pt: "Tela no saque" },
  "No se puede impedir la visión del receptor.": {
    en: "You cannot block the receiver's view.",
    pt: "Não se pode impedir a visão do passador.",
  },
  "Falta de orden de rotación": { en: "Rotation order fault", pt: "Falta de ordem de rodízio" },
  "Se concede punto y saque al rival y se corrige la posición.": {
    en: "A point and serve go to the opponent and the position is corrected.",
    pt: "Concede-se ponto e saque ao rival e corrige-se a posição.",
  },
  "Jugada no reconocida": { en: "Unrecognised play", pt: "Jogada não reconhecida" },
  "A/L punto · Z undo · W silbato · B buzzer · C contraste": {
    en: "A/L point · Z undo · W whistle · B buzzer · C contrast",
    pt: "A/L ponto · Z desfazer · W apito · B buzzer · C contraste",
  },
  "Describe líbero, red, invasión, bloqueo, pantalla o rotación.": {
    en: "Describe libero, net, invasion, block, screen or rotation.",
    pt: "Descreva líbero, rede, invasão, bloqueio, tela ou rodízio.",
  },
  "Distribución predecible: entrena Pipe y Setter-Dump con pase '+'.": {
    en: "Predictable distribution: train pipe and setter dump off a '+' pass.",
    pt: "Distribuição previsível: treine pipe e bola de segunda com passe '+'.",
  },
  "Distribución sana: mantén la dispersión y revisa por rotación.": {
    en: "Healthy distribution: keep the spread and review it by rotation.",
    pt: "Distribuição saudável: mantenha a dispersão e revise por rodízio.",
  },
  "Acorta la recepción: libero al centro y tres receptores en semicírculo.": {
    en: "Shorten the pass: libero in the middle and three receivers in an arc.",
    pt: "Encurte o passe: líbero no centro e três passadores em semicírculo.",
  },
  "Saque corto al 1-2 para romper la rotación rival.": {
    en: "Short serve to 1-2 to break the opponent rotation.",
    pt: "Saque curto no 1-2 para quebrar o rodízio rival.",
  },
  "Ataque de pin con cobertura de Z6 y pipe como segunda opción.": {
    en: "Pin attack with Z6 cover and pipe as the second option.",
    pt: "Ataque de ponta com cobertura de Z6 e pipe como segunda opção.",
  },
  "Bloqueo a la línea y defensa escalonada en Z5-Z6.": {
    en: "Line block with staggered defence in Z5-Z6.",
    pt: "Bloqueio na paralela e defesa escalonada em Z5-Z6.",
  },
  "SVG poster generated": { en: "SVG poster generated", pt: "SVG poster generated" },
};

const PHRASES: Array<{ pattern: RegExp; en: string; pt: string }> = [
  { pattern: /Senas del armador/gi, en: "Setter signals", pt: "Sinais do levantador" },
  { pattern: /Armador:/g, en: "Setter:", pt: "Levantador:" },
  { pattern: /Cancha \+ luz/g, en: "Court + lights", pt: "Quadra + luz" },
  { pattern: /cuota de cancha/g, en: "court fee", pt: "vaquinha da quadra" },
  { pattern: /Pagar por transferencia/g, en: "Pay by transfer", pt: "Pagar por transferência" },
  { pattern: /Tesoreria/g, en: "Treasury", pt: "Tesouraria" },
  { pattern: /Entre (\d+) personas/g, en: "Split between $1 people", pt: "Entre $1 pessoas" },
  { pattern: /Sello/g, en: "Seal", pt: "Selo" },
  { pattern: /La Vaquita/g, en: "The Court Pot", pt: "A Vaquinha" },
  { pattern: /\bLíbero\b/g, en: "Libero", pt: "Líbero" },
  { pattern: /Primera demora/g, en: "First delay", pt: "Primeira demora" },
  { pattern: /\bdemora\b/g, en: "delay", pt: "demora" },
  { pattern: /tercer tiempo/g, en: "third half", pt: "terceiro tempo" },
  { pattern: /Racha de/g, en: "Run of", pt: "Sequência de" },
  { pattern: /del equipo/g, en: "of the team", pt: "da equipe" },
  { pattern: /advertencia/g, en: "warning", pt: "advertência" },
  { pattern: /\bPunto\b/g, en: "Point", pt: "Ponto" },
  { pattern: /pide tiempo muerto/g, en: "calls timeout", pt: "pede tempo" },
  { pattern: /tiempo muerto/g, en: "timeout", pt: "tempo técnico" },
  { pattern: /Punto clutch de/g, en: "Clutch point by", pt: "Ponto decisivo de" },
  { pattern: /Punto de/g, en: "Point by", pt: "Ponto de" },
  { pattern: /recepciones positivas/g, en: "positive passes", pt: "passes positivos" },
  { pattern: /Activacion/g, en: "Activation", pt: "Ativação" },
  { pattern: /Tecnica/g, en: "Technique", pt: "Técnica" },
  { pattern: /Tactica/g, en: "Tactics", pt: "Tática" },
  { pattern: /Cierre/g, en: "Cool-down", pt: "Fechamento" },
  { pattern: /Mano afuera/g, en: "Hand wipe", pt: "Mão fora" },
  { pattern: /Mano tarde/g, en: "Late hand", pt: "Mão atrasada" },
  { pattern: /Apretado/g, en: "Tight", pt: "Apertado" },
  { pattern: /Lejos/g, en: "Far", pt: "Longe" },
  { pattern: /Cerrado/g, en: "Closed", pt: "Fechado" },
  { pattern: /Costura/g, en: "Seam", pt: "Costura" },
  { pattern: /Reciclaje/g, en: "Recycle", pt: "Reciclagem" },
  { pattern: /Amonestacion/g, en: "Warning", pt: "Advertência" },
  { pattern: /Primera demora del equipo/g, en: "First team delay", pt: "Primeira demora da equipe" },
  { pattern: /sin consecuencia en el marcador/g, en: "no scoreboard consequence", pt: "sem consequência no placar" },
  { pattern: /FALTA en banda superior\/antena/g, en: "FAULT on top band/antenna", pt: "FALTA na faixa superior/antena" },
  { pattern: /LEGAL tras el ataque rival/g, en: "LEGAL after the opponent attack", pt: "LEGAL após o ataque rival" },
  { pattern: /REVISAR VIDEO/g, en: "REVIEW VIDEO", pt: "REVISAR VÍDEO" },
  { pattern: /\bFALTA\b/g, en: "FAULT", pt: "FALTA" },
  { pattern: /\bsaque\b/gi, en: "serve", pt: "saque" },
  { pattern: /\bEquipo (\d+)/g, en: "Team $1", pt: "Equipe $1" },
  { pattern: /\bZona (\d+)/g, en: "Zone $1", pt: "Zona $1" },
];

const PATTERNS: Array<{ pattern: RegExp; en: (...groups: string[]) => string; pt: (...groups: string[]) => string }> = [
  {
    pattern: /^Rodilla (.+)° \(óptimo 110°-130°\)\.$/,
    en: (value) => `Knee ${value}° (optimal 110°-130°).`,
    pt: (value) => `Joelho ${value}° (ideal 110°-130°).`,
  },
  {
    pattern: /^Codo de armado (.+)° \(óptimo 70°-100°\)\.$/,
    en: (value) => `Draw elbow ${value}° (optimal 70°-100°).`,
    pt: (value) => `Cotovelo de armado ${value}° (ideal 70°-100°).`,
  },
  {
    pattern: /^Codo de impacto (.+)° \(óptimo 170°-180°\)\.$/,
    en: (value) => `Impact elbow ${value}° (optimal 170°-180°).`,
    pt: (value) => `Cotovelo de impacto ${value}° (ideal 170°-180°).`,
  },
  {
    pattern: /^Mano (.+)° delante de la frente \(óptimo 15°-35°\)\.$/,
    en: (value) => `Hand ${value}° in front of the forehead (optimal 15°-35°).`,
    pt: (value) => `Mão ${value}° à frente da testa (ideal 15°-35°).`,
  },
  {
    pattern: /^Asimetría de aterrizaje (.+)°\.$/,
    en: (value) => `Landing asymmetry ${value}°.`,
    pt: (value) => `Assimetria de aterrissagem ${value}°.`,
  },
  {
    pattern: /^Punto (.+?) — (\d+)-(\d+)$/,
    en: (team, a, b) => `Point ${team} — ${a}-${b}`,
    pt: (team, a, b) => `Ponto ${team} — ${a}-${b}`,
  },
  {
    pattern: /^Set para (.+?)\. Nuevo set (\d+)\.$/,
    en: (team, set) => `Set for ${team}. New set ${set}.`,
    pt: (team, set) => `Set para ${team}. Novo set ${set}.`,
  },
  {
    pattern: /^Partido para (.+?) \((\d+)-(\d+)\)\.$/,
    en: (team, a, b) => `Match for ${team} (${a}-${b}).`,
    pt: (team, a, b) => `Partida para ${team} (${a}-${b}).`,
  },
  {
    pattern: /^Saque (.+?) a ([\d.]+) km\/h; margen (\d+) ms\.$/,
    en: (type, speed, margin) => `${type} serve at ${speed} km/h; ${margin} ms reaction margin.`,
    pt: (type, speed, margin) => `Saque ${type} a ${speed} km/h; margem de ${margin} ms.`,
  },
  {
    pattern: /^Inicia en R(\d+); evita R(\d+)\. Bloqueo top: R(\d+)\.$/,
    en: (start, avoid, block) => `Start in R${start}; avoid R${avoid}. Top block: R${block}.`,
    pt: (start, avoid, block) => `Comece em R${start}; evite R${avoid}. Melhor bloqueio: R${block}.`,
  },
  {
    pattern: /^([\d.]+)% de exito; EV ([\d.-]+)\.$/,
    en: (pct, ev) => `${pct}% success; EV ${ev}.`,
    pt: (pct, ev) => `${pct}% de sucesso; EV ${ev}.`,
  },
  {
    pattern: /^(.+?) con EV ([\d.-]+); muneca ([\d.-]+) grados\.$/,
    en: (decision, ev, angle) => `${decision} with EV ${ev}; wrist ${angle} degrees.`,
    pt: (decision, ev, angle) => `${decision} com EV ${ev}; punho ${angle} graus.`,
  },
  {
    pattern: /^Plan de (\d+) min para (\d+) jugadores en (\d+) grupos\.$/,
    en: (minutes, players, groups) => `${minutes}-min plan for ${players} players in ${groups} groups.`,
    pt: (minutes, players, groups) => `Plano de ${minutes} min para ${players} jogadores em ${groups} grupos.`,
  },
  {
    pattern: /^(.+?): indice (\d+)\/100\. Cuello: (.+?)\.$/,
    en: (player, index, gap) => `${player}: index ${index}/100. Bottleneck: ${gap}.`,
    pt: (player, index, gap) => `${player}: índice ${index}/100. Gargalo: ${gap}.`,
  },
  {
    pattern: /^(.+?) con Re=([\d.]+); desvio ([\d.-]+) cm\.$/,
    en: (regime, reynolds, drift) => `${regime} at Re=${reynolds}; ${drift} cm drift.`,
    pt: (regime, reynolds, drift) => `${regime} com Re=${reynolds}; desvio de ${drift} cm.`,
  },
  {
    pattern: /^(\d+) jugadas del jugador (\d+); ([\d.]+) s netos\.$/,
    en: (plays, player, seconds) => `${plays} plays from player ${player}; ${seconds} s of live play.`,
    pt: (plays, player, seconds) => `${plays} jogadas do jogador ${player}; ${seconds} s líquidos.`,
  },
  {
    pattern: /^Dossier (.+?) (\d+)\/100; sello (.+?)\.$/,
    en: (tier, score, seal) => `${tier} dossier ${score}/100; seal ${seal}.`,
    pt: (tier, score, seal) => `Dossiê ${tier} ${score}/100; selo ${seal}.`,
  },
  {
    pattern: /^Sistema recomendado (.+?)\.$/,
    en: (system) => `Recommended system ${system}.`,
    pt: (system) => `Sistema recomendado ${system}.`,
  },
  {
    pattern: /^(.+?) de (.+?) recaudado \(([\d.]+)%\)\.$/,
    en: (paid, due, pct) => `${paid} of ${due} collected (${pct}%).`,
    pt: (paid, due, pct) => `${paid} de ${due} arrecadado (${pct}%).`,
  },
  {
    pattern: /^(\d+) violaciones\.$/,
    en: (count) => `${count} violations.`,
    pt: (count) => `${count} violações.`,
  },
  {
    pattern: /^(.+?) traducido AR\/ES\/MX\/BR\/US\.$/,
    en: (term) => `${term} translated across AR/ES/MX/BR/US.`,
    pt: (term) => `${term} traduzido em AR/ES/MX/BR/US.`,
  },
  {
    pattern: /^QR (.+?) (\d+)x(\d+) firmado HMAC\.$/,
    en: (kind, size) => `${kind} QR ${size}x${size} HMAC signed.`,
    pt: (kind, size) => `QR ${kind} ${size}x${size} assinado com HMAC.`,
  },
  {
    pattern: /^Tarjeta de premios sellada\. MVP: (.+?)\.$/,
    en: (mvp) => `Awards card sealed. MVP: ${mvp}.`,
    pt: (mvp) => `Cartão de prêmios selado. MVP: ${mvp}.`,
  },
  {
    pattern: /^Sitting: ([\d.]+) x ([\d.]+) m, red ([\d.]+) m\.$/,
    en: (length, width, net) => `Sitting: ${length} x ${width} m, net ${net} m.`,
    pt: (length, width, net) => `Sentado: ${length} x ${width} m, rede ${net} m.`,
  },
  {
    pattern: /^(.+?): ([\d.]+) x ([\d.]+) m\.$/,
    en: (mode, length, width) => `${mode}: ${length} x ${width} m.`,
    pt: (mode, length, width) => `${mode}: ${length} x ${width} m.`,
  },
  {
    pattern: /^Elo A ([+-]?[\d.-]+)\.$/,
    en: (delta) => `Elo A ${delta}.`,
    pt: (delta) => `Elo A ${delta}.`,
  },
  {
    pattern: /^Sombra de (.+?) bloqueador\(es\) cubre ([\d.]+)% del campo propio\.$/,
    en: (count, pct) => `${count} blocker(s) shadow covers ${pct}% of your court.`,
    pt: (count, pct) => `Sombra de ${count} bloqueador(es) cobre ${pct}% da sua quadra.`,
  },
  {
    pattern: /Líbero #(\d+) entra por central #(\d+) en Z(\d+) antes del saque\./,
    en: (libero, middle, target) => `Libero #${libero} subs in for middle #${middle} in Z${target} before the serve.`,
    pt: (libero, middle, target) => `Líbero #${libero} entra no central #${middle} na Z${target} antes do saque.`,
  },
  {
    pattern: /^(\d+)-BUZZER$/, en: (score) => score, pt: (score) => score,
  },
  {
    pattern: /^Racha de (\d+): pide tiempo muerto ahora\.$/,
    en: (run) => `Run of ${run}: call timeout now.`,
    pt: (run) => `Sequência de ${run}: peça tempo agora.`,
  },
  {
    pattern: /^Temprano por (\d+) ms\.$/,
    en: (ms) => `${ms} ms early.`,
    pt: (ms) => `${ms} ms cedo.`,
  },
  {
    pattern: /^Tarde por (\d+) ms\.$/,
    en: (ms) => `${ms} ms late.`,
    pt: (ms) => `${ms} ms tarde.`,
  },
  {
    pattern: /^Sombra de (\d+) bloqueador\(es\) cubre (\d+(?:\.\d+)?)% del campo propio\.$/,
    en: (count, pct) => `${count} blocker(s) shadow covers ${pct}% of your court.`,
    pt: (count, pct) => `Sombra de ${count} bloqueador(es) cobre ${pct}% da sua quadra.`,
  },
  {
    pattern: /^(.+) recibe, (.+) cierra la costura de (\d+) cm ante (.+)\.$/,
    en: (receiver, owner, gap, serve) => `${receiver} passes, ${owner} closes the ${gap} cm seam against ${serve}.`,
    pt: (receiver, owner, gap, serve) => `${receiver} passa, ${owner} fecha a costura de ${gap} cm contra ${serve}.`,
  },
  {
    pattern: /^Índice de imprevisibilidad (\d+)\/100 con (\d+) armados\.$/,
    en: (index, total) => `Unpredictability index ${index}/100 across ${total} sets.`,
    pt: (index, total) => `Índice de imprevisibilidade ${index}/100 com ${total} levantamentos.`,
  },
  {
    pattern: /^Boleta I-VI válida para arrancar en R(\d)\.$/,
    en: (rotation) => `I-VI lineup slip valid to start in R${rotation}.`,
    pt: (rotation) => `Boleta I-VI válida para começar em R${rotation}.`,
  },
  {
    pattern: /^(\d+) sanciones\. Marcador (\d+)-(\d+), saque (\w+)\.$/,
    en: (count, a, b, serve) => `${count} sanctions. Score ${a}-${b}, serve ${serve}.`,
    pt: (count, a, b, serve) => `${count} sanções. Placar ${a}-${b}, saque ${serve}.`,
  },
  {
    pattern: /^(\d+) cambios procesados\. Quedan (\d+) A y (\d+) B\.$/,
    en: (count, a, b) => `${count} substitutions processed. ${a} A and ${b} B left.`,
    pt: (count, a, b) => `${count} substituições processadas. Restam ${a} A e ${b} B.`,
  },
  {
    pattern: /^Vaquita de (.+) (.+) repartida al centavo\.$/,
    en: (currency, total) => `${currency} ${total} court fee split to the cent.`,
    pt: (currency, total) => `${currency} ${total} de vaquinha dividido ao centavo.`,
  },
  {
    pattern: /^Torneo con (.+) de resultado y break-even en (\d+) equipos\.$/,
    en: (profit, teams) => `Tournament result ${profit}, break-even at ${teams} teams.`,
    pt: (profit, teams) => `Torneio com ${profit} de resultado e break-even em ${teams} equipes.`,
  },
  {
    pattern: /^El juez cobro (.+) \((.+)\)\.$/,
    en: (call, rule) => `The referee called ${call} (${rule}).`,
    pt: (call, rule) => `O árbitro marcou ${call} (${rule}).`,
  },
  {
    pattern: /^(\d+) sanciones\. Marcador (.+), saque (.+)\.$/,
    en: (count, score, serve) => `${count} sanctions. Score ${score}, serve ${serve}.`,
    pt: (count, score, serve) => `${count} sanções. Placar ${score}, saque ${serve}.`,
  },
  {
    pattern: /^Pizarra de tiempo muerto lista: 30 s FIVB, dos consignas y trazos validados\.$/,
    en: () => "Timeout board ready: 30 FIVB seconds, two cues, validated strokes.",
    pt: () => "Lousa de tempo pronta: 30 s FIVB, duas orientações e traços validados.",
  },
];

export function translateEngineText(text: string, locale: Locale): string {
  if (locale === "es") return text;
  const trimmed = text.trim();
  if (trimmed.length === 0) return text;
  const exact = EXACT[trimmed];
  if (exact) return text.replace(trimmed, exact[locale]);
  for (const entry of PATTERNS) {
    const match = trimmed.match(entry.pattern);
    if (!match) continue;
    const groups = match.slice(1).map((group) => group ?? "");
    return text.replace(trimmed, entry[locale](...groups));
  }
  let value = text;
  for (const phrase of PHRASES) {
    value = value.replace(phrase.pattern, locale === "en" ? phrase.en : phrase.pt);
  }
  return value;
}

/** Translate every text child of a rendered station without touching props. */
export function localizeReactTree(node: ReactNode, locale: Locale): ReactNode {
  if (locale === "es") return node;
  if (typeof node === "string") return translateEngineText(node, locale);
  // Children.map keeps stable keys when static JSX children become an array.
  if (Array.isArray(node)) return Children.map(node, (child) => localizeReactTree(child, locale));
  if (isValidElement(node)) {
    const element = node as ReactElement<{ children?: ReactNode; label?: unknown; title?: unknown; placeholder?: unknown }>;
    const props: { label?: string; title?: string; placeholder?: string } = {};
    for (const key of ["label", "title", "placeholder"] as const) {
      const raw = element.props[key];
      if (typeof raw === "string") props[key] = translateEngineText(raw, locale);
    }
    if (element.props.children === undefined) return Object.keys(props).length > 0 ? cloneElement(element, props) : element;
    return cloneElement(element, props, localizeReactTree(element.props.children, locale));
  }
  return node;
}
