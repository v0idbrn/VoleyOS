import type { Locale } from "@/lib/local-engines";

export const LOCALE_NAMES: Record<Locale, string> = { es: "ES", en: "EN", pt: "PT" };

export function isLocale(value: string): value is Locale {
  return value === "es" || value === "en" || value === "pt";
}

interface Copy {
  heroKicker: string;
  heroTitle: string;
  heroSubtitle: string;
  cta: string;
  modules: string;
  pricing: string;
  vault: string;
  offline: string;
  loadExample: string;
  reset: string;
  supportFoss: string;
  cloudPro: string;
}

export const COPY: Record<Locale, Copy> = {
  es: {
    heroKicker: "61 módulos · 3 idiomas · 0 telemetría",
    heroTitle: "El sistema operativo del vóley",
    heroSubtitle:
      "Biomecánica, táctica, arbitraje, torneos y streaming en una sola app. Corre sin señal en el gimnasio y sincroniza cuando vuelve el WiFi.",
    cta: "Abrir la cancha",
    modules: "Módulos",
    pricing: "Cloud Pro",
    vault: "Bóveda efímera",
    offline: "Funciona sin internet",
    loadExample: "⚡ Cargar ejemplo",
    reset: "Reiniciar",
    supportFoss: "Apoyar la versión libre",
    cloudPro: "Cloud Pro",
  },
  en: {
    heroKicker: "61 modules · 3 languages · 0 telemetry",
    heroTitle: "The operating system for volleyball",
    heroSubtitle:
      "Biomechanics, tactics, officiating, tournaments and streaming in one app. Runs without signal in the gym and syncs when the WiFi is back.",
    cta: "Open the court",
    modules: "Modules",
    pricing: "Cloud Pro",
    vault: "Ephemeral vault",
    offline: "Works offline",
    loadExample: "⚡ Load example",
    reset: "Reset",
    supportFoss: "Support the free build",
    cloudPro: "Cloud Pro",
  },
  pt: {
    heroKicker: "61 módulos · 3 idiomas · 0 telemetria",
    heroTitle: "O sistema operacional do vôlei",
    heroSubtitle:
      "Biomecânica, tática, arbitragem, torneios e streaming em um só app. Roda sem sinal no ginásio e sincroniza quando o Wi-Fi volta.",
    cta: "Abrir a quadra",
    modules: "Módulos",
    pricing: "Cloud Pro",
    vault: "Cofre efêmero",
    offline: "Funciona sem internet",
    loadExample: "⚡ Carregar exemplo",
    reset: "Reiniciar",
    supportFoss: "Apoiar a versão livre",
    cloudPro: "Cloud Pro",
  },
};

export interface ShellCopy {
  tabsLabel: string;
  tabHome: string;
  tabCourt: string;
  tabBoard: string;
  tabLab: string;
  tabSettings: string;
  search: string;
  searchPlaceholder: string;
  favorites: string;
  recents: string;
  allModules: string;
  local: string;
  pro: string;
  whistle: string;
  sun: string;
  language: string;
  back: string;
  demo: string;
  favorite: string;
  module: string;
  courtTitle: string;
  courtSub: string;
  boardTitle: string;
  boardSub: string;
  labTitle: string;
  labSub: string;
  settingsTitle: string;
  theme: string;
  themeObsidian: string;
  themeSolar: string;
  courtAudio: string;
  voice: string;
  rollAnimation: string;
  license: string;
  licenseCreator: string;
  licenseLocked: string;
  unlockCreator: string;
  lockCreator: string;
  vaultSection: string;
  dataSection: string;
  capsule: string;
  legalSection: string;
  privacy: string;
  terms: string;
  disclaimer: string;
  trademarks: string;
  pricingTitle: string;
  pricingNote: string;
  openModule: string;
  saveReport: string;
  shareWhatsApp: string;
  exportCsv: string;
  reportSaved: string;
  copied: string;
  noRecents: string;
  creatorTitle: string;
  creatorHelp: string;
  wrongKey: string;
  unlock: string;
  close: string;
  creatorOn: string;
  creatorOff: string;
  wakeOn: string;
  wakeOff: string;
  voiceOn: string;
  voiceOff: string;
  fullScreenHint: string;
  favoritesHint: string;
}

export const SHELL: Record<Locale, ShellCopy> = {
  es: {
    tabsLabel: "Navegación principal",
    tabHome: "Inicio",
    tabCourt: "Cancha",
    tabBoard: "Pizarra",
    tabLab: "Lab & IA",
    tabSettings: "Ajustes",
    search: "Buscar módulo",
    searchPlaceholder: "Buscar módulo (Ctrl+K)",
    favorites: "Mis favoritos",
    recents: "Usados recientemente",
    allModules: "Todos los módulos",
    local: "61 Local",
    pro: "Pro",
    whistle: "Silbato rápido",
    sun: "Modo Sol",
    language: "Idioma",
    back: "Volver",
    demo: "Demo",
    favorite: "Favorito",
    module: "Módulo",
    courtTitle: "Cancha",
    courtSub: "Marcador, mesa y árbitro a un toque",
    boardTitle: "Pizarra",
    boardSub: "Táctica y cancha en SVG",
    labTitle: "Lab & IA",
    labSub: "Rendimiento medido del jugador",
    settingsTitle: "Ajustes",
    theme: "Tema",
    themeObsidian: "Obsidian Night",
    themeSolar: "Solar Outdoor",
    courtAudio: "Audio de cancha",
    voice: "Locutor por voz (TTS)",
    license: "Licencia",

    rollAnimation: "Animación de dominance roll",
    licenseCreator: "Creador Pro activo",
    licenseLocked: "Versión libre",
    unlockCreator: "Desbloquear con clave",
    lockCreator: "Cerrar sesión de creador",
    vaultSection: "Bóveda local",
    dataSection: "Datos",
    capsule: "Cápsula .volleyos",
    legalSection: "Legal",
    privacy: "Privacidad",
    terms: "Términos",
    disclaimer: "Aviso",
    trademarks: "Marcas",
    pricingTitle: "Planes Cloud Pro",
    pricingNote: "La app libre nunca se bloquea. Cloud Pro suma streaming, salas y exportes.",
    openModule: "Abrir módulo",
    saveReport: "Guardar",
    shareWhatsApp: "WhatsApp",
    exportCsv: "Excel",
    reportSaved: "Reporte guardado en la bóveda.",
    copied: "Copiado para WhatsApp.",
    noRecents: "Todavía no abriste ningún módulo.",
    creatorTitle: "Clave maestra",
    creatorHelp: "La app compara el SHA-256 en tu equipo. La clave no viaja en el código.",
    wrongKey: "Clave incorrecta.",
    unlock: "Desbloquear",
    close: "Cerrar",
    creatorOn: "Modo creador activado.",
    creatorOff: "Modo creador desactivado.",
    wakeOn: "Pantalla despierta durante el partido.",
    wakeOff: "Wake Lock liberado.",
    voiceOn: "Narrador listo.",
    voiceOff: "Narrador apagado.",
    fullScreenHint: "Tocá un módulo para abrirlo a pantalla completa.",
    favoritesHint: "Marcá módulos con la estrella para tenerlos a mano.",
  },
  en: {
    tabsLabel: "Main navigation",
    tabHome: "Home",
    tabCourt: "Court",
    tabBoard: "Board",
    tabLab: "Lab & AI",
    tabSettings: "Settings",
    search: "Search modules",
    searchPlaceholder: "Search modules (Ctrl+K)",
    favorites: "My favorites",
    recents: "Recently used",
    allModules: "All modules",
    local: "61 Local",
    pro: "Pro",
    whistle: "Quick whistle",
    sun: "Sun mode",
    language: "Language",
    back: "Back",
    demo: "Demo",
    favorite: "Favorite",
    module: "Module",
    courtTitle: "Court",
    courtSub: "Scoreboard, table and referee one tap away",
    boardTitle: "Board",
    boardSub: "Tactics and court in SVG",
    labTitle: "Lab & AI",
    labSub: "Measured player performance",
    settingsTitle: "Settings",
    theme: "Theme",
    themeObsidian: "Obsidian Night",
    themeSolar: "Solar Outdoor",
    courtAudio: "Court audio",
    voice: "Voice announcer (TTS)",
    license: "License",
    rollAnimation: "Dominance roll animation",
    licenseCreator: "Creator Pro active",
    licenseLocked: "Free build",
    unlockCreator: "Unlock with key",
    lockCreator: "Sign out of creator",
    vaultSection: "Local vault",
    dataSection: "Data",
    capsule: ".volleyos capsule",
    legalSection: "Legal",
    privacy: "Privacy",
    terms: "Terms",
    disclaimer: "Disclaimer",
    trademarks: "Trademarks",
    pricingTitle: "Cloud Pro plans",
    pricingNote: "The free app is never locked. Cloud Pro adds streaming, rooms and exports.",
    openModule: "Open module",
    saveReport: "Save",
    shareWhatsApp: "WhatsApp",
    exportCsv: "Excel",
    reportSaved: "Report saved to the vault.",
    copied: "Copied for WhatsApp.",
    noRecents: "No modules opened yet.",
    creatorTitle: "Master key",
    creatorHelp: "The app compares the SHA-256 on your device. The key never ships in the source.",
    wrongKey: "Wrong key.",
    unlock: "Unlock",
    close: "Close",
    creatorOn: "Creator mode enabled.",
    creatorOff: "Creator mode disabled.",
    wakeOn: "Screen kept awake during the match.",
    wakeOff: "Wake Lock released.",
    voiceOn: "Announcer ready.",
    voiceOff: "Announcer off.",
    fullScreenHint: "Tap a module to open it full screen.",
    favoritesHint: "Star modules to keep them one tap away.",
  },
  pt: {
    tabsLabel: "Navegação principal",
    tabHome: "Início",
    tabCourt: "Quadra",
    tabBoard: "Quadro",
    tabLab: "Lab & IA",
    tabSettings: "Ajustes",
    search: "Buscar módulo",
    searchPlaceholder: "Buscar módulo (Ctrl+K)",
    favorites: "Meus favoritos",
    recents: "Usados recentemente",
    allModules: "Todos os módulos",
    local: "61 Local",
    pro: "Pro",
    whistle: "Apito rápido",
    sun: "Modo Sol",
    language: "Idioma",
    back: "Voltar",
    demo: "Demo",
    favorite: "Favorito",
    module: "Módulo",
    courtTitle: "Quadra",
    courtSub: "Placar, mesa e árbitro a um toque",
    boardTitle: "Quadro",
    boardSub: "Tática e quadra em SVG",
    labTitle: "Lab & IA",
    labSub: "Desempenho medido do jogador",
    settingsTitle: "Ajustes",
    theme: "Tema",
    themeObsidian: "Obsidian Night",
    themeSolar: "Solar Outdoor",
    courtAudio: "Áudio de quadra",
    voice: "Locutor por voz (TTS)",
    license: "Licenca",

    rollAnimation: "Animação de dominância",
    licenseCreator: "Criador Pro ativo",
    licenseLocked: "Versão livre",
    unlockCreator: "Desbloquear com chave",
    lockCreator: "Sair do modo criador",
    vaultSection: "Cofre local",
    dataSection: "Dados",
    capsule: "Cápsula .volleyos",
    legalSection: "Legal",
    privacy: "Privacidade",
    terms: "Termos",
    disclaimer: "Aviso",
    trademarks: "Marcas",
    pricingTitle: "Planos Cloud Pro",
    pricingNote: "O app livre nunca é bloqueado. O Cloud Pro soma streaming, salas e exports.",
    openModule: "Abrir módulo",
    saveReport: "Salvar",
    shareWhatsApp: "WhatsApp",
    exportCsv: "Excel",
    reportSaved: "Relatório salvo no cofre.",
    copied: "Copiado para o WhatsApp.",
    noRecents: "Nenhum módulo aberto ainda.",
    creatorTitle: "Chave mestra",
    creatorHelp: "O app compara o SHA-256 no seu aparelho. A chave nunca vai no código.",
    wrongKey: "Chave incorreta.",
    unlock: "Desbloquear",
    close: "Fechar",
    creatorOn: "Modo criador ativado.",
    creatorOff: "Modo criador desativado.",
    wakeOn: "Tela acordada durante a partida.",
    wakeOff: "Wake Lock liberado.",
    voiceOn: "Narrador pronto.",
    voiceOff: "Narrador desligado.",
    fullScreenHint: "Toque em um módulo para abrir em tela cheia.",
    favoritesHint: "Marque módulos com a estrela para ter à mão.",
  },
};

export function t(locale: Locale, es: string, en: string, pt: string): string {
  if (locale === "es") return es;
  if (locale === "en") return en;
  return pt;
}
