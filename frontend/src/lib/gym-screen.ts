import type { Locale } from "./local-engines";

export const GYM_SCREEN: Record<Locale, { name: string; tagline: string; hint: string }> = {
  es: {
    name: "Pantalla Gigante de Gimnasio",
    tagline: "Marcador gigante en horizontal para leer el partido a 30 metros sin tocar la pantalla.",
    hint: "Girar el teléfono al modo horizontal para la Pantalla Gigante de Gimnasio.",
  },
  en: {
    name: "Gym Giant Screen",
    tagline: "Giant horizontal scoreboard to read the match from 30 meters without touching the screen.",
    hint: "Rotate the phone to landscape for the Gym Giant Screen.",
  },
  pt: {
    name: "Tela Gigante do Ginásio",
    tagline:
      "Placar gigante horizontal para ler a partida a 30 metros sem tocar na tela.",
    hint: "Gire o telefone para paisagem para a Tela Gigante do Ginásio.",
  },
};

export type GymPayload = {
  title: string;
  scoreA: number;
  scoreB: number;
  setA: number;
  setB: number;
  service: "A" | "B";
  timer: string;
  setter: string;
};

export const DEFAULT_GYM_PAYLOAD: GymPayload = {
  title: "Gym Scoreboard",
  scoreA: 0,
  scoreB: 0,
  setA: 0,
  setB: 0,
  service: "A",
  timer: "00:00",
  setter: "1",
};
