"use client";

import { copyTextUniversal } from "@/lib/security-shield";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { LOCALE_NAMES, SHELL, t } from "@/lib/i18n";
import { awardIndoorPoint, buildTarget, jumpLoad, newScoreboard, paywallEnabled, swapCourt, type Locale, type Profile, type ScoreboardState } from "@/lib/local-engines";
import { clearCreatorUnlock, creatorUnlocked, matchesCreatorKey, persistCreatorToken } from "@/lib/creator-unlock";
import { clearLicenseToken, unlockCreatorOnServer } from "@/lib/api-client";
import { MODULES, MODULE_BY_SLUG, PROFILE_LABELS } from "@/lib/modules";
import { DIFFICULTY_BADGES, GUIDED_MODES, GUIDED_MODE_BY_ID, type GuidedModeId } from "@/lib/guided-modes";
import { ModuleGuideBanner } from "@/components/ModuleGuideBanner";
import { CoachMarksOverlay } from "@/components/CoachMarksOverlay";
import { MODULE_GUIDES } from "@/lib/module-guides";
import { CreatorKeygenPanel, MonetizationModal } from "@/components/MonetizationModal";
import { SupportSheet } from "@/components/SupportSheet";
import { canAskSupport, persistSupporterChip, supporterChipActive } from "@/lib/support";
import { APP_VERSION, checkForUpdate, type UpdateCheck } from "@/lib/update-check";
import { addVaultEntry, loadVault } from "@/lib/vault";
import { downloadXlsx, openPrintableReport, type ReportSpec } from "@/lib/offline-xlsx";
import { LIVE_SCORE_EVENT, announceScoreTTS, isMatchActive, persistLiveScoreboard, readLiveScoreboard, requestCourtWakeLock, triggerCourtHaptics } from "@/lib/court-ux";
import { playWhistle, setCourtAudioEnabled } from "@/lib/court-audio";
import { loadCrowdAmbience, saveCrowdAmbience, setSoundEffectsEnabled } from "@/lib/sound-effects";
import { EphemeralVaultBar } from "@/components/EphemeralVaultBar";
import { STATIONS } from "@/components/stations";
import { GymScreenModule } from "@/components/GymScreenModule";
import { CasualPlayerSuite, type SuiteSection } from "@/components/CasualPlayerSuite";
import { LiveCastModal } from "@/components/LiveCastModal";
import { ModuleErrorBoundary } from "@/components/ModuleErrorBoundary";
import { createHostSecret, createRoomId, parseRoomParams } from "@/lib/live-cast-engine";
import {
  applyVosBackup,
  decryptVosBackup,
  downloadEncryptedVosBackup,
  downloadVosBackup,
  verifyVosBackup,
  VOS_ENC_FORMAT,
} from "@/lib/backup-vos";
import { loadFlowRoster } from "@/lib/season-vault";
import { acwrSample } from "@/lib/samples";

const FILTERS: Array<Profile | "all"> = ["all", "players", "coaches", "court", "referees", "fans", "tournaments"];
const LOCALES: Locale[] = ["es", "en", "pt"];
const ROLE_KEY = "volleyos.role";
const THEME_KEY = "volleyos.theme";
const PIN_KEY = "volleyos.pins";
const RECENT_KEY = "volleyos.recent";
const AUDIO_KEY = "volleyos.courtAudio";
const VOICE_KEY = "volleyos.voice";
const ONBOARDING_KEY = "voleyos_onboarding_done";
const ONBOARDING_LANG_KEY = "voleyos.onboardingLang";

const ROLE_SETUP: Record<string, { profile: Profile; tab: Tab; slugs: string[] }> = {
  player: { profile: "players", tab: "lab", slugs: ["biomechanics", "volleycard", "serve-radar", "tempo"] },
  coach: { profile: "coaches", tab: "board", slugs: ["rotation", "scouting", "block-shadow", "setter-iq"] },
  referee: { profile: "referees", tab: "court", slugs: ["lineup-slip", "referee-console", "var", "integrity-seal"] },
  organiser: { profile: "tournaments", tab: "home", slugs: ["tournament", "captain-draft", "court-split", "team-treasury"] },
  fan: { profile: "fans", tab: "home", slugs: ["overlay", "match-poster", "fan-companion", "arena-dj"] },
};

type Tab = "home" | "court" | "board" | "lab" | "settings";

const TAB_GROUP: Record<Exclude<Tab, "home" | "settings">, string[]> = {
  court: ["scoreboard", "beach", "referee-console", "var", "timeout-chalkboard", "substitution-tracker", "gym-screen"],
  board: ["rotation", "block-shadow", "seam-radar", "system-transition", "blockout-lab", "matchup-matrix"],
  lab: ["biomechanics", "serve-radar", "ball-aerodynamics", "volleycard", "scouting", "acwr"],
};

const TAB_ICON: Record<Tab, string> = { home: "🏠", court: "⏱️", board: "📋", lab: "⚡", settings: "⚙️" };

function isProfile(value: string | null): value is Profile {
  return value !== null && (FILTERS as string[]).includes(value);
}

function readStringList(key: string): string[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(key) ?? "[]") as unknown;
    return Array.isArray(raw) ? raw.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

interface Plan {
  name: string;
  price: string;
  tagline: Record<Locale, string>;
  features: Record<Locale, string[]>;
  highlight?: boolean;
}

const PLANS: Plan[] = [
  {
    name: "Pase Express",
    price: "$7",
    tagline: { es: "Un torneo, cero fricción", en: "One tournament, zero friction", pt: "Um torneio, sem atrito" },
    features: {
      es: ["1 torneo completo", "Export Excel con auditoría", "1 overlay OBS", "Sin suscripción"],
      en: ["1 full tournament", "Audited Excel export", "1 OBS overlay", "No subscription"],
      pt: ["1 torneio completo", "Export Excel com auditoria", "1 overlay OBS", "Sem assinatura"],
    },
  },
  {
    name: "DT & Club Pro",
    price: "$19",
    tagline: { es: "El plan del cuerpo técnico", en: "The staff plan", pt: "O plano da comissão técnica" },
    features: {
      es: ["Torneos ilimitados", "VAR + Volleycards", "3 overlays a la vez", "Scouting avanzado", "Soporte prioritario"],
      en: ["Unlimited tournaments", "VAR + Volleycards", "3 overlays at once", "Advanced scouting", "Priority support"],
      pt: ["Torneios ilimitados", "VAR + Volleycards", "3 overlays ao mesmo tempo", "Scout avançado", "Suporte prioritário"],
    },
    highlight: true,
  },
  {
    name: "Torneo Cloud",
    price: "$29",
    tagline: { es: "Para organizadores y ligas", en: "For organisers and leagues", pt: "Para organizadores e ligas" },
    features: {
      es: ["Multi-sede y multi-cancha", "API + webhooks HMAC", "Marca propia en overlay", "Exportes masivos"],
      en: ["Multi-venue, multi-court", "API + HMAC webhooks", "White-label overlay", "Bulk exports"],
      pt: ["Multi-sede e multi-quadra", "API + webhooks HMAC", "Marca própria no overlay", "Exports em massa"],
    },
  },
];

function SwitchRow({
  label,
  checked,
  onToggle,
  hint,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className="tap flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-panel px-4 py-3 text-left"
    >
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-white">{label}</span>
        {hint ? <span className="mt-0.5 block truncate text-[10px] text-white/45">{hint}</span> : null}
      </span>
      <span
        aria-hidden
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-emerald" : "bg-white/20"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? "left-[1.375rem]" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

function ValueRow({
  label,
  value,
  onClick,
  href,
}: {
  label: string;
  value: string;
  onClick?: () => void;
  href?: string;
}) {
  const body = (
    <>
      <span className="text-[13px] font-semibold text-white">{label}</span>
      <span className="flex items-center gap-1 text-[11px] text-white/50">
        {value}
        <span aria-hidden className="text-white/30">›</span>
      </span>
    </>
  );
  if (href) {
    return (
      <a href={href} className="tap flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-panel px-4 py-3">
        {body}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} className="tap flex w-full items-center justify-between gap-3 rounded-2xl border border-white/10 bg-panel px-4 py-3 text-left">
      {body}
    </button>
  );
}

/**
 * Sticky mini scoreboard shown above every tab while a match is live in
 * the Court tab, so the score is always one tap away (v9.2).
 */
export function StickyMiniScoreboard({
  state,
  locale,
  onPoint,
  onSwap,
  onGoCourt,
}: {
  state: ScoreboardState;
  locale: Locale;
  onPoint: (team: "A" | "B") => void;
  onSwap: () => void;
  onGoCourt: () => void;
}) {
  return (
    <div data-testid="sticky-mini-scoreboard" className="z-30 shrink-0 border-b border-volt/30 bg-panel/95 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center gap-1.5 px-3 py-2">
        <span aria-hidden className="text-sm leading-none">🏐</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-black text-white">
            {state.teamA} <span className="tabular-nums text-volt">{state.scoreA} - {state.scoreB}</span> {state.teamB}
          </p>
          <p className="truncate text-[9px] font-bold uppercase tracking-wider text-white/45">
            {t(locale, "Sets", "Sets", "Sets")} {state.setsA} - {state.setsB} ·{" "}
            {state.status === "finished"
              ? t(locale, "Final", "Finished", "Final")
              : t(locale, "En juego", "Live", "Ao vivo")}
          </p>
        </div>
        <button
          type="button"
          aria-label={`${t(locale, "Punto", "Point", "Ponto")} +1 ${state.teamA} [A]`}
          onClick={() => onPoint("A")}
          className="tap rounded-lg border border-volt/50 bg-volt/15 px-2 py-1.5 text-[10px] font-black text-volt"
        >
          +1 A
        </button>
        <button
          type="button"
          aria-label={`${t(locale, "Punto", "Point", "Ponto")} +1 ${state.teamB} [B]`}
          onClick={() => onPoint("B")}
          className="tap rounded-lg border border-volt/50 bg-volt/15 px-2 py-1.5 text-[10px] font-black text-volt"
        >
          +1 B
        </button>
        <button
          type="button"
          aria-label={t(locale, "Cambiar de lado", "Swap sides", "Trocar de lado")}
          onClick={onSwap}
          className="tap rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-black text-white/70"
        >
          🔄 {t(locale, "Lado", "Sides", "Lado")}
        </button>
        <button
          type="button"
          aria-label={t(locale, "Ir a Cancha", "Go to Court", "Ir para Cancha")}
          onClick={onGoCourt}
          className="tap rounded-lg border border-crimson/60 bg-crimson/20 px-2 py-1.5 text-[10px] font-black text-white"
        >
          ⏱️ {t(locale, "Ir a Cancha", "Court", "Cancha")}
        </button>
      </div>
    </div>
  );
}

export function VolleyOSHub({ locale }: { locale: Locale }) {
  const shell = SHELL[locale];
  const [tab, setTab] = useState<Tab>("home");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [tabPick, setTabPick] = useState<Record<string, string>>({
    court: TAB_GROUP.court[0] ?? "",
    board: TAB_GROUP.board[0] ?? "",
    lab: TAB_GROUP.lab[0] ?? "",
  });
  const [teamColor, setTeamColor] = useState<string>("#eab308");
  const [profile, setProfile] = useState<Profile | "all">("all");
  const [favOnly, setFavOnly] = useState(false);
  const [guidedMode, setGuidedMode] = useState<GuidedModeId | null>(null);
  const [casualOpen, setCasualOpen] = useState(false);
  const [openDrawers, setOpenDrawers] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [pinned, setPinned] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [solar, setSolar] = useState(false);
  const isTestEnv = typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST));
  const [uiMode, setUiMode] = useState<"simple" | "pro">(() => {
    if (typeof window === "undefined" || isTestEnv) return "pro";
    const saved = window.localStorage.getItem("volleyos.uiMode");
    if (saved === "simple") return "simple";
    if (saved === "pro") return "pro";
    return "simple";
  });
  const [modeButtonPressed, setModeButtonPressed] = useState(false);
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "home";
    return isTestEnv ? "home" : "court";
  });
  const [voice, setVoice] = useState(false);
  const [courtAudio, setCourtAudio] = useState(true);
  const [shareMsg, setShareMsg] = useState<string | null>(null);

  const toggleUiMode = (): void => {
    const next: "simple" | "pro" = uiMode === "simple" ? "pro" : "simple";
    setUiMode(next);
    window.localStorage.setItem("volleyos.uiMode", next);
    window.dispatchEvent(new CustomEvent("volleyos:uimode", { detail: { mode: next } }));
    triggerCourtHaptics(14);
  };
  const [awake, setAwake] = useState(false);
  const [creator, setCreator] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [roleChoice, setRoleChoice] = useState<string | null>(null);
  const [keyOpen, setKeyOpen] = useState(false);
  const [keyValue, setKeyValue] = useState("");
  const [keyError, setKeyError] = useState(false);
  const [checkout, setCheckout] = useState<Plan | null>(null);
  const [monetizationOpen, setMonetizationOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [liveScore, setLiveScore] = useState<ScoreboardState | null>(null);
  const [coachMarks, setCoachMarks] = useState(false);
  const [crowdVolume, setCrowdVolume] = useState(0.7);
  const [suiteSection, setSuiteSection] = useState<SuiteSection | null>(null);
  const [suiteNonce, setSuiteNonce] = useState(0);
  const [reminder, setReminder] = useState<{ time: string; venue: string; acwr: string } | null>(null);
  const [supporter, setSupporter] = useState(false);
  const [supportMoment, setSupportMoment] = useState<"match" | "export" | null>(null);
  const [updateState, setUpdateState] = useState<UpdateCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  // v9.3.0 live broadcast: the Hub is also a spectator entry point (QR → ?room=).
  const [castOpen, setCastOpen] = useState(false);
  const [castJoinRoom, setCastJoinRoom] = useState<string | null>(null);
  const [vosMsg, setVosMsg] = useState<string | null>(null);
  const [vosPassword, setVosPassword] = useState("");
  const castRoomRef = useRef<string>("");
  const castSecretRef = useRef<string>("");
  if (!castRoomRef.current) castRoomRef.current = createRoomId();
  if (!castSecretRef.current) castSecretRef.current = createHostSecret();
  const target = buildTarget();
  const locked = paywallEnabled() && !creator;
  const activeMeta = activeSlug ? MODULE_BY_SLUG.get(activeSlug) : undefined;

  // v9.3.0: a scanned spectator QR (?room=CANCHA-XXXX) opens the live view.
  useEffect(() => {
    const { roomId } = parseRoomParams(window.location.search);
    if (roomId) {
      setCastJoinRoom(roomId);
      setCastOpen(true);
    }
  }, []);

  // v9.4: restore a signed .vos full backup from a file pick.
  const restoreVosFile = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("read_failed"));
        reader.onload = () => resolve(String(reader.result ?? ""));
        reader.readAsText(file);
      });
      const trimmed = text.trim();
      let result = verifyVosBackup(trimmed);
      if (!result.ok && trimmed.includes(VOS_ENC_FORMAT)) {
        // v10 AES-256-GCM envelope: decrypt with the password typed in Settings.
        const decrypted = await decryptVosBackup(trimmed, vosPassword);
        if (!decrypted.ok) {
          setVosMsg(
            decrypted.reason === "passphrase"
              ? t(locale, "❌ Contraseña incorrecta.", "❌ Wrong password.", "❌ Senha incorreta.")
              : t(locale, "❌ Copia inválida o corrupta.", "❌ Invalid or corrupt backup.", "❌ Cópia inválida ou corrompida."),
          );
          return;
        }
        result = verifyVosBackup(decrypted.plaintext);
      }
      if (!result.ok) {
        setVosMsg(t(locale, "❌ Copia inválida o corrupta.", "❌ Invalid or corrupt backup.", "❌ Cópia inválida ou corrompida."));
        return;
      }
      const applied = applyVosBackup(result.backup);
      setVosMsg(
        applied
          ? t(locale, "✅ Copia restaurada: equipos, jugadores, temporada y fijas.", "✅ Backup restored: teams, players, season and pins.", "✅ Cópia restaurada: times, jogadores, temporada e fixos.")
          : t(locale, "❌ No se pudo restaurar.", "❌ Restore failed.", "❌ Falha ao restaurar."),
      );
    } catch {
      setVosMsg(t(locale, "❌ No se pudo leer el archivo.", "❌ Could not read the file.", "❌ Não foi possível ler o arquivo."));
    }
  };

  const visible = useMemo(() => {
    const needle = query.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    return MODULES.filter((module) => {
      if (favOnly && !pinned.includes(module.slug)) return false;
      if (!favOnly && profile !== "all" && !module.profiles.includes(profile)) return false;
      if (!needle) return true;
      return `${module.name[locale]} ${module.tagline[locale]} ${module.slug}`
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .includes(needle);
    });
  }, [locale, profile, query, favOnly, pinned]);

  const chooseMode = (id: GuidedModeId): void => {
    if (guidedMode === id) {
      setGuidedMode(null);
      window.localStorage.removeItem("volleyos.guided");
      return;
    }
    const mode = GUIDED_MODE_BY_ID.get(id);
    if (!mode) return;
    setGuidedMode(id);
    setFavOnly(false);
    setProfile("all");
    setOpenDrawers(Object.fromEntries(mode.drawers.map((drawer) => [drawer.id, drawer.openByDefault ?? false])));
    window.localStorage.setItem("volleyos.guided", id);
    triggerCourtHaptics(22);
  };

  const toggleDrawer = (drawerId: string): void => {
    setOpenDrawers((current) => ({ ...current, [drawerId]: !current[drawerId] }));
  };

  useEffect(() => {
    document.documentElement.classList.add("app-shell");
    return () => document.documentElement.classList.remove("app-shell");
  }, []);

  useEffect(() => {
    let active = true;
    void creatorUnlocked().then((unlocked) => {
      if (active) setCreator(unlocked);
    });
    const storedRole = window.localStorage.getItem(ROLE_KEY);
    if (isProfile(storedRole)) setProfile(storedRole);
    const storedGuided = window.localStorage.getItem("volleyos.guided");
    if (storedGuided && GUIDED_MODE_BY_ID.has(storedGuided as GuidedModeId)) {
      const mode = GUIDED_MODE_BY_ID.get(storedGuided as GuidedModeId);
      if (mode) {
        setGuidedMode(mode.id);
        setOpenDrawers(Object.fromEntries(mode.drawers.map((drawer) => [drawer.id, drawer.openByDefault ?? false])));
      }
    }
    setSolar(window.localStorage.getItem(THEME_KEY) === "solar");
    setVoice(window.localStorage.getItem(VOICE_KEY) === "1");
    setCourtAudio(window.localStorage.getItem(AUDIO_KEY) !== "0");
    setCrowdVolume(loadCrowdAmbience());
    setSupporter(supporterChipActive());
    setPinned((current) => (current.length > 0 ? current : readStringList(PIN_KEY)));
    setRecent(readStringList(RECENT_KEY));
    const done = window.localStorage.getItem(ONBOARDING_KEY) === "1";
    setOnboarding(!done);
    if (!done && window.localStorage.getItem(ONBOARDING_LANG_KEY)) setOnboardingStep(2);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("solar", solar);
    window.localStorage.setItem(THEME_KEY, solar ? "solar" : "obsidian");
  }, [solar]);

  useEffect(() => {
    setCourtAudioEnabled(courtAudio);
    // The studio cues live in another module: gate both from one switch.
    setSoundEffectsEnabled(courtAudio);
    window.localStorage.setItem(AUDIO_KEY, courtAudio ? "1" : "0");
  }, [courtAudio]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const sync = (event?: Event): void => {
      const next = event instanceof CustomEvent ? (event.detail as ScoreboardState) : readLiveScoreboard();
      setLiveScore(next);
    };
    sync();
    window.addEventListener(LIVE_SCORE_EVENT, sync as EventListener);
    return () => window.removeEventListener(LIVE_SCORE_EVENT, sync as EventListener);
  }, []);

  useEffect(() => {
    const openCoach = (): void => setCoachMarks(true);
    window.addEventListener("voleyos:coach-marks", openCoach);
    return () => window.removeEventListener("voleyos:coach-marks", openCoach);
  }, []);

  // Chained Picadito flow: any step can pull the suite (or the scoreboard)
  // forward, carrying the roster and the live match saved in localStorage.
  useEffect(() => {
    const openSuite = (event: Event): void => {
      const detail = event instanceof CustomEvent ? event.detail : null;
      setSuiteSection(typeof detail === "string" ? (detail as SuiteSection) : null);
      setSuiteNonce((value) => value + 1);
      setActiveSlug(null);
      setCasualOpen(true);
    };
    const openScoreboard = (): void => {
      setCasualOpen(false);
      setTab("court");
      setActiveSlug(null);
      setTabPick((current) => ({ ...current, court: "scoreboard" }));
      triggerCourtHaptics(16);
    };
    const nativeNav = (event: Event): void => {
      const target = event instanceof CustomEvent ? String(event.detail) : "";
      if (target === "cancha") {
        setCasualOpen(false);
        setTab("court");
        setActiveSlug(null);
        setTabPick((current) => ({ ...current, court: "scoreboard" }));
      } else {
        setSuiteSection(target === "season" ? "temporada" : "lista");
        setSuiteNonce((value) => value + 1);
        setActiveSlug(null);
        setCasualOpen(true);
      }
      triggerCourtHaptics(16);
    };
    window.addEventListener("voleyos:open-suite", openSuite);
    window.addEventListener("voleyos:open-scoreboard", openScoreboard);
    window.addEventListener("vos-native-nav", nativeNav);
    return () => {
      window.removeEventListener("voleyos:open-suite", openSuite);
      window.removeEventListener("voleyos:open-scoreboard", openScoreboard);
      window.removeEventListener("vos-native-nav", nativeNav);
    };
  }, []);

  useEffect(() => {
    if (tab !== "home") return;
    const roster = loadFlowRoster();
    if (!roster || roster.time === "—" || roster.time.length === 0) {
      setReminder(null);
      return;
    }
    const stored = Number(window.localStorage.getItem("volleyos.acwrLoad") ?? "185");
    const weekly = Number.isFinite(stored) && stored > 0 ? stored : 185;
    const report = jumpLoad(acwrSample().map((day, index) => (index >= 21 ? { ...day, jumps: weekly } : day)));
    setReminder({ time: roster.time, venue: roster.venue, acwr: `${report.ratio.toFixed(2)} · ${report.zone}` });
  }, [tab]);

  // Layer 1 of the donation funnel: a support sheet at emotional moments,
  // gated by the persistent 7-day cooldown.
  useEffect(() => {
    const onRequest = (event: Event): void => {
      if (!canAskSupport()) return;
      const moment = event instanceof CustomEvent && event.detail === "export" ? "export" : "match";
      setSupportMoment(moment);
    };
    window.addEventListener("voleyos:support-moment", onRequest);
    return () => window.removeEventListener("voleyos:support-moment", onRequest);
  }, []);

  const closeOverlays = useCallback((): boolean => {
    if (keyOpen) {
      setKeyOpen(false);
      return true;
    }
    if (checkout) {
      setCheckout(null);
      return true;
    }
    return false;
  }, [checkout, keyOpen]);

  const closeModule = useCallback(() => setActiveSlug(null), []);

  useEffect(() => {
    const onBack = (): void => {
      if (closeOverlays()) return;
      setActiveSlug(null);
    };
    window.addEventListener("voleyos:back", onBack);
    return () => window.removeEventListener("voleyos:back", onBack);
  }, [closeOverlays]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setActiveSlug(null);
        setTab("home");
        window.setTimeout(() => searchRef.current?.focus(), 0);
      }
      if (event.key === "Escape") {
        if (closeOverlays()) return;
        if (document.activeElement === searchRef.current) {
          setQuery("");
          searchRef.current?.blur();
          return;
        }
        setActiveSlug(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeOverlays]);

  const openModule = useCallback((slug: string) => {
    if (!STATIONS[slug]) return;
    setActiveSlug(slug);
    setRecent((current) => {
      const next = [slug, ...current.filter((value) => value !== slug)].slice(0, 6);
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
    triggerCourtHaptics(18);
  }, []);

  const togglePin = (slug: string): void => {
    const next = pinned.includes(slug) ? pinned.filter((value) => value !== slug) : [...pinned, slug];
    setPinned(next);
    window.localStorage.setItem(PIN_KEY, JSON.stringify(next));
    triggerCourtHaptics(25);
  };

  const chooseProfile = (value: Profile | "all"): void => {
    setProfile(value);
    setFavOnly(false);
    window.localStorage.setItem(ROLE_KEY, value);
    triggerCourtHaptics(22);
  };

  const submitCreatorKey = async (): Promise<void> => {
    if (keyValue.trim().toUpperCase().startsWith("VOS-CHIP")) {
      const ok = await persistSupporterChip(keyValue);
      if (ok) {
        setSupporter(true);
        setKeyOpen(false);
        setKeyValue("");
        setKeyError(false);
        setToast(t(locale, "👑 Eres Patrocinador Oficial", "👑 You are an Official Supporter", "👑 Você é Patrocinador Oficial"));
        triggerCourtHaptics([40, 30, 60]);
      } else {
        setKeyError(true);
      }
      return;
    }
    if (await matchesCreatorKey(keyValue)) {
      const key = keyValue.trim();
      persistCreatorToken(key);
      void unlockCreatorOnServer(key);
      setCreator(true);
      setKeyOpen(false);
      setKeyValue("");
      setKeyError(false);
      setToast(shell.creatorOn);
      triggerCourtHaptics([40, 30, 60]);
      return;
    }
    setKeyError(true);
  };

  const relockCreator = (): void => {
    clearCreatorUnlock();
    clearLicenseToken();
    setCreator(false);
    setToast(shell.creatorOff);
  };

  const activateLicense = async (license: string): Promise<void> => {
    const trimmed = license.trim();
    await persistCreatorToken(trimmed);
    void unlockCreatorOnServer(trimmed);
    setCreator(true);
    setMonetizationOpen(false);
    setToast(shell.creatorOn);
    triggerCourtHaptics([40, 30, 60]);
  };

  const toggleWakeLock = async (): Promise<void> => {
    if (awake) {
      setAwake(false);
      setToast(shell.wakeOff);
      return;
    }
    const sentinel = await requestCourtWakeLock();
    setAwake(sentinel !== null);
    setToast(
      sentinel
        ? shell.wakeOn
        : t(locale, "Wake Lock no disponible en este navegador.", "Wake Lock unavailable in this browser.", "Wake Lock indisponível neste navegador."),
    );
  };

  const toggleVoice = (): void => {
    const next = !voice;
    setVoice(next);
    window.localStorage.setItem(VOICE_KEY, next ? "1" : "0");
    setToast(next ? shell.voiceOn : shell.voiceOff);
    announceScoreTTS(next ? shell.voiceOn : shell.voiceOff, next, locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-ES");
  };

  const handleSave = (slug: string, rows: number): void => {
    addVaultEntry(slug, rows);
    const meta = MODULE_BY_SLUG.get(slug);
    const text = `${meta?.name[locale] ?? slug}: ${rows} ${t(locale, "filas en la bóveda", "rows in the vault", "linhas no cofre")}`;
    setToast(text);
    triggerCourtHaptics([60, 40, 80]);
    announceScoreTTS(text, voice, locale === "pt" ? "pt-BR" : locale === "en" ? "en-US" : "es-ES");
  };

  const shareWhatsApp = async (slug: string): Promise<void> => {
    const meta = MODULE_BY_SLUG.get(slug);
    if (!meta) return;
    const text = `${meta.icon} ${meta.name[locale]} — VolleyOS\n${meta.tagline[locale]}\n${t(locale, "61 módulos offline en tu cancha.", "61 offline modules on your court.", "61 módulos offline na sua quadra.")}`;
    const done = await copyTextUniversal(text);
    setToast(done ? shell.copied : t(locale, "No se pudo copiar.", "Could not copy.", "Não foi possível copiar."));
    triggerCourtHaptics(20);
  };

  const buildReport = (slug: string): ReportSpec | null => {
    const meta = MODULE_BY_SLUG.get(slug);
    if (!meta) return null;
    const entries = loadVault().filter((entry) => entry.module === slug);
    if (entries.length === 0) {
      setToast(t(locale, "Guardá un reporte primero.", "Save a report first.", "Salve um relatório primeiro."));
      return null;
    }
    return {
      title: meta.name[locale],
      module: meta.slug,
      locale,
      generatedAt: new Date().toISOString(),
      sheets: [
        {
          name: t(locale, "Reportes", "Reports", "Relatórios"),
          headers: [
            t(locale, "Módulo", "Module", "Módulo"),
            t(locale, "Reporte", "Report", "Relatório"),
            t(locale, "Filas", "Rows", "Linhas"),
            t(locale, "Fecha", "Date", "Data"),
          ],
          rows: entries.map((entry) => [meta.name[locale], entry.id, entry.rows, entry.createdAt]),
        },
        {
          name: t(locale, "Ficha", "Sheet", "Ficha"),
          headers: [t(locale, "Campo", "Field", "Campo"), t(locale, "Valor", "Value", "Valor")],
          rows: [
            [t(locale, "Módulo", "Module", "Módulo"), meta.name[locale]],
            [t(locale, "Número", "Number", "Número"), String(meta.number).padStart(2, "0")],
            [t(locale, "Resumen", "Summary", "Resumo"), meta.tagline[locale]],
            [t(locale, "Generado", "Generated", "Gerado"), new Date().toISOString()],
            [t(locale, "Idioma", "Language", "Idioma"), locale.toUpperCase()],
          ],
        },
      ],
    };
  };

  const exportExcel = (slug: string): void => {
    const report = buildReport(slug);
    if (!report) return;
    if ((slug === "fivb-escoresheet" || slug === "match-poster") && canAskSupport()) setSupportMoment("export");
    downloadXlsx(report);
    setToast(t(locale, "XLSX generado offline.", "XLSX generated offline.", "XLSX gerado offline."));
    triggerCourtHaptics(30);
  };

  const exportPdf = (slug: string): void => {
    const report = buildReport(slug);
    if (!report) return;
    if ((slug === "fivb-escoresheet" || slug === "match-poster") && canAskSupport()) setSupportMoment("export");
    void openPrintableReport(report).then((opened) => {
      setToast(
        opened
          ? t(locale, "Reporte listo para guardar como PDF.", "Report ready to save as PDF.", "Relatório pronto para salvar como PDF.")
          : t(locale, "Permití ventanas emergentes para imprimir.", "Allow pop-ups to print.", "Permita pop-ups para imprimir."),
      );
    });
  };

  const livePoint = (team: "A" | "B"): void => {
    if (!liveScore) return;
    try {
      persistLiveScoreboard(awardIndoorPoint(liveScore, team).state);
      triggerCourtHaptics(30);
    } catch {
      /* the match is already finished */
    }
  };

  const liveSwap = (): void => {
    if (!liveScore) return;
    persistLiveScoreboard(swapCourt(liveScore));
    triggerCourtHaptics([40, 30, 40]);
  };

  const goCourtScoreboard = (): void => {
    setCasualOpen(false);
    setTab("court");
    setActiveSlug(null);
    setTabPick((current) => ({ ...current, court: "scoreboard" }));
    triggerCourtHaptics(16);
  };

  const goTab = (next: Tab): void => {
    setTab(next);
    setActiveSlug(null);
    triggerCourtHaptics(16);
  };

  const finishOnboarding = (): void => {
    const setup = roleChoice ? ROLE_SETUP[roleChoice] : null;
    if (setup) {
      setPinned(setup.slugs);
      window.localStorage.setItem(PIN_KEY, JSON.stringify(setup.slugs));
      setProfile(setup.profile);
      window.localStorage.setItem(ROLE_KEY, setup.profile);
      setTab(setup.tab);
    }
    window.localStorage.setItem(ONBOARDING_KEY, "1");
    window.localStorage.removeItem(ONBOARDING_LANG_KEY);
    setOnboarding(false);
    setOnboardingStep(1);
    triggerCourtHaptics([40, 30, 70]);
  };

  const reopenOnboarding = (): void => {
    window.localStorage.removeItem(ONBOARDING_KEY);
    window.localStorage.removeItem(ONBOARDING_LANG_KEY);
    setRoleChoice(null);
    setOnboardingStep(1);
    setOnboarding(true);
  };

  const groupKey = tab === "court" || tab === "board" || tab === "lab" ? tab : null;
  const groupSlugs = groupKey ? TAB_GROUP[groupKey] : [];
  const pickedSlug = groupKey ? tabPick[groupKey] ?? groupSlugs[0] ?? "" : "";
  const onScoreboard =
    activeMeta?.slug === "scoreboard" || (!activeMeta && !casualOpen && tab === "court" && pickedSlug === "scoreboard");
  const stickyVisible = liveScore !== null && isMatchActive(liveScore) && !onScoreboard;
  const PickedStation = pickedSlug ? STATIONS[pickedSlug] : undefined;
  const tabTitles: Record<Tab, { title: string; sub: string }> = {
    home: { title: shell.allModules, sub: shell.fullScreenHint },
    court: { title: shell.courtTitle, sub: shell.courtSub },
    board: { title: shell.boardTitle, sub: shell.boardSub },
    lab: { title: shell.labTitle, sub: shell.labSub },
    settings: { title: shell.settingsTitle, sub: shell.license },
  };

  return (
    <main
      id="main"
      lang={locale}
      data-view={activeMeta ? "module" : casualOpen ? "casual" : "tabs"}
      data-dialog={keyOpen || checkout ? "open" : "closed"}
      className="flex h-[100dvh] w-full flex-col overflow-hidden bg-obsidian text-white"
    >
      <a
        href="#app-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-crimson focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        {t(locale, "Saltar al contenido", "Skip to content", "Pular para o conteúdo")}
      </a>

      {activeMeta ? (
        <header className="safe-top z-30 shrink-0 border-b border-white/10 bg-obsidian/95">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2">
            <button
              type="button"
              onClick={closeModule}
              aria-label={shell.back}
              className="tap flex h-10 items-center gap-1 rounded-xl px-2 text-[12px] font-bold text-white/80"
            >
              <span aria-hidden className="text-lg leading-none">←</span>
              {shell.back}
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-[13px] font-black leading-tight">
                <span aria-hidden className="mr-1">{activeMeta.icon}</span>
                {activeMeta.name[locale]}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                {shell.module} {activeMeta.number.toString().padStart(2, "0")}
              </p>
            </div>
            <button
              type="button"
              aria-label={shell.favorite}
              aria-pressed={pinned.includes(activeMeta.slug)}
              onClick={() => togglePin(activeMeta.slug)}
              className={`tap grid h-10 w-10 place-items-center rounded-xl text-lg ${pinned.includes(activeMeta.slug) ? "text-volt" : "text-white/45"}`}
            >
              {pinned.includes(activeMeta.slug) ? "★" : "☆"}
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("voleyos:demo"))}
              className="tap flex h-10 items-center gap-1 rounded-xl border border-volt/40 bg-volt/10 px-2 text-[11px] font-black text-volt"
            >
              <span aria-hidden>⚡</span>
              {shell.demo}
            </button>
          </div>
        </header>
      ) : casualOpen ? (
        <header className="safe-top z-30 shrink-0 border-b border-white/10 bg-obsidian/95">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-1 px-2">
            <button
              type="button"
              onClick={() => setCasualOpen(false)}
              aria-label={shell.back}
              className="tap flex h-10 items-center gap-1 rounded-xl px-2 text-[12px] font-bold text-white/80"
            >
              <span aria-hidden className="text-lg leading-none">←</span>
              {shell.back}
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="truncate text-[13px] font-black leading-tight">
                🍻 {t(locale, "Picadito & Amigos", "Pickup & Friends", "Picadito & Amigos")}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                {t(locale, "Suite casual · 8 herramientas", "Casual suite · 8 tools", "Suíte casual · 8 ferramentas")}
              </p>
            </div>
          </div>
        </header>
      ) : (
        <header className="safe-top z-30 shrink-0 border-b border-white/10 bg-obsidian/95">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-3">
            <button type="button" onClick={() => goTab("home")} className="tap flex items-center gap-2" aria-label="VolleyOS">
              <span aria-hidden className="grid h-8 w-8 place-items-center rounded-xl bg-crimson text-base">🏐</span>
              <span className="text-[13px] font-black tracking-tight">
                Volley<span className="text-crimson">OS</span>
              </span>
            </button>
            <span
              className={"flex rounded-full border-2 border-white/15 bg-panel/90 px-3 py-1.5 text-[9px] font-black uppercase tracking-wider sm:inline-flex" + (uiMode === "simple" ? " bg-emerald text-emerald" : " bg-volt text-volt")}
            >
              {uiMode === "simple" ? `⚡ ${t(locale, "Modo Simple", "Simple Mode", "Modo Simples")}` : `🧠 ${t(locale, "Modo Pro (61)", "Pro Mode (61)", "Modo Pro (61)")}`}
            </span>
            {supporter ? (
              <span
                data-testid="supporter-badge"
                className="max-w-[120px] truncate rounded-full border border-volt/60 bg-volt/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-volt"
              >
                👑 {t(locale, "Patrocinador Oficial", "Official Supporter", "Patrocinador Oficial")}
              </span>
            ) : null}
            <div className="ml-auto flex items-center gap-0.5">
              <button
                type="button"
                aria-label={t(locale, "Guía interactiva", "Interactive guide", "Guia interativa")}
                onClick={() => setCoachMarks(true)}
                className="tap grid h-10 w-10 place-items-center rounded-xl text-base text-white/70"
              >
                🎯
              </button>
              <button
                type="button"
                aria-label={shell.whistle}
                onClick={() => {
                  playWhistle("short");
                  triggerCourtHaptics(35);
                }}
                className="tap grid h-10 w-10 place-items-center rounded-xl text-base text-white/70"
              >
                🔊
              </button>
              <button
                type="button"
                aria-label={t(locale, "Transmitir en vivo", "Broadcast live", "Transmitir ao vivo")}
                data-testid="hub-live-cast"
                onClick={() => setCastOpen(true)}
                className="tap grid h-10 w-10 place-items-center rounded-xl text-base text-white/70"
              >
                📡
              </button>
              <button
                type="button"
                aria-label={shell.sun}
                aria-pressed={solar}
                onClick={() => setSolar((value) => !value)}
                className={`tap grid h-10 w-10 place-items-center rounded-xl text-base ${solar ? "bg-volt text-obsidian" : "text-white/70"}`}
              >
                ☀️
              </button>
              <a
                href={`/${LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length]}`}
                aria-label={shell.language}
                className="tap grid h-10 min-w-9 place-items-center rounded-xl px-1 text-[11px] font-black text-white/60"
              >
                {LOCALE_NAMES[locale]}
              </a>
              <button
                type="button"
                aria-label={creator ? t(locale, "Modo creador activo. Desactivar", "Creator mode active. Disable", "Modo criador ativo. Desativar") : shell.unlockCreator}
                aria-pressed={creator}
                onClick={() => {
                  if (creator) relockCreator();
                  else {
                    setKeyOpen(true);
                    setKeyError(false);
                  }
                }}
                className={`tap grid h-10 min-w-10 place-items-center rounded-xl px-2 text-[10px] font-black ${creator ? "bg-volt text-obsidian" : "text-white/40"}`}
              >
                {creator ? "👑" : "***"}
              </button>
            </div>
          </div>
        </header>
      )}

      {stickyVisible && liveScore ? (
        <StickyMiniScoreboard state={liveScore} locale={locale} onPoint={livePoint} onSwap={liveSwap} onGoCourt={goCourtScoreboard} />
      ) : null}

      <div id="app-content" className="relative min-h-0 flex-1">
        {activeMeta ? (
          <>
            <div className="h-full overflow-y-auto no-scrollbar px-3 pb-28 pt-3">
              <div className="mx-auto w-full max-w-2xl">
                {(() => {
                  if (activeMeta.slug === "gym-screen") {
                    return (
                      <ModuleErrorBoundary locale={locale} resetKey={activeMeta.slug}>
                        <GymScreenModule locale={locale} onClose={closeModule} />
                      </ModuleErrorBoundary>
                    );
                  }
                  const Station = STATIONS[activeMeta.slug];
                  return (
                    <ModuleErrorBoundary locale={locale} resetKey={activeMeta.slug}>
                      {Station ? <Station meta={activeMeta} locale={locale} onSave={handleSave} /> : null}
                    </ModuleErrorBoundary>
                  );
                })()}
              </div>
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-obsidian via-obsidian/90 to-transparent pb-1 pt-8">
              <div className="safe-bottom pointer-events-auto mx-auto flex max-w-2xl gap-2 px-3">
                <button
                  type="button"
                  onClick={() => void shareWhatsApp(activeMeta.slug)}
                  className="tap flex-1 rounded-xl border border-emerald/40 bg-emerald/15 px-2 py-2.5 text-[11px] font-black text-emerald"
                >
                  {shell.shareWhatsApp}
                </button>
                <button
                  type="button"
                  onClick={() => exportExcel(activeMeta.slug)}
                  className="tap flex-1 rounded-xl border border-white/15 bg-panel px-1 py-2.5 text-[10px] font-black text-white/80"
                >
                  {shell.exportCsv}
                </button>
                <button
                  type="button"
                  onClick={() => exportPdf(activeMeta.slug)}
                  className="tap flex-1 rounded-xl border border-white/15 bg-panel px-1 py-2.5 text-[10px] font-black text-white/80"
                >
                  {t(locale, "PDF", "PDF", "PDF")}
                </button>
                <button
                  type="button"
                  onClick={() => openModule("match-poster")}
                  className="tap flex-1 rounded-xl border border-white/15 bg-panel px-1 py-2.5 text-[10px] font-black text-white/80"
                >
                  {t(locale, "Póster", "Poster", "Pôster")}
                </button>
              </div>
            </div>
          </>
        ) : casualOpen ? (
          <div className="h-full overflow-y-auto no-scrollbar px-3 pb-28 pt-3">
            <div className="mx-auto w-full max-w-2xl space-y-3">
              <CasualPlayerSuite key={suiteNonce} locale={locale} initialSection={suiteSection ?? undefined} />
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto no-scrollbar">
            {tab === "home" ? (
              <div className="mx-auto max-w-3xl px-3 pb-28 pt-3">
                {uiMode === "simple" ? (
                  <section data-testid="simple-mode-tabs" className="mb-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald">
                      ⚡ {t(locale, "Modo Simple", "Simple Mode", "Modo Simples")}
                    </p>
                    <div className="snap-row mt-1 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      <button
                        key="cancha"
                        type="button"
                        onClick={() => goTab("court")}
                        className="tap shrink-0 rounded-full border border-emerald/50 bg-emerald/10 px-4 py-2 text-[11px] font-bold text-emerald"
                      >
                        🏐 {t(locale, "Cancha (Marcador)", "Court (Scoreboard)", "Cancha (Marcador)")}
                      </button>
                      <button
                        key="picadito"
                        type="button"
                        onClick={() => setCasualOpen(true)}
                        className="tap shrink-0 rounded-full border border-emerald/50 bg-emerald/10 px-4 py-2 text-[11px] font-bold text-emerald"
                      >
                        🍻 {t(locale, "Picadito & Amigos", "Pickup & Friends", "Picadito & Amigos")}
                      </button>
                      <button
                        key="ajustes"
                        type="button"
                        onClick={() => window.dispatchEvent(new CustomEvent("voleyos:open-suite", { detail: "ajustes" }))}
                        className="tap shrink-0 rounded-full border border-emerald/50 bg-emerald/10 px-4 py-2 text-[11px] font-bold text-emerald"
                      >
                        ⚙️ {t(locale, "Ajustes", "Settings", "Ajustes")}
                      </button>
                    </div>
                  </section>
                ) : (
                  <section data-testid="mis-fijas" className="mb-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-volt">
                      ⭐ {t(locale, "Mis Fijas (Acceso Rápido)", "My Pins (Quick Access)", "Minhas Fixas (Acesso Rápido)")}
                    </p>
                    <div className="snap-row mt-1 flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                      {pinned.map((slug) => {
                        const module = MODULE_BY_SLUG.get(slug);
                        if (!module) return null;
                        return (
                          <button
                            key={slug}
                            type="button"
                            onClick={() => openModule(slug)}
                            className="tap shrink-0 rounded-full border border-volt/40 bg-volt/10 px-3 py-1.5 text-[10px] font-bold text-volt"
                          >
                            {module.icon} {module.name[locale]}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}
                {reminder ? (
                  <section data-testid="next-match-banner" className="mb-3 rounded-2xl border border-volt/30 bg-volt/10 px-3 py-2">
                    <p className="text-[11px] font-black text-volt">
                      ⏰ {t(locale, "Próximo partido agendado", "Next match scheduled", "Próximo jogo agendado")}:{" "}
                      {t(locale, "Hoy", "Today", "Hoje")} {reminder.time} hs
                    </p>
                    <p className="truncate text-[10px] text-white/60">📍 {reminder.venue}</p>
                    <p className="text-[10px] text-white/55">
                      ✅ {t(locale, "Checklist", "Checklist", "Checklist")}: {t(locale, "Pelota", "Ball", "Bola")} ✓ ·{" "}
                      {t(locale, "Entrada en calor 4′", "4′ warmup", "Aquecimento 4′")} ✓ · ACWR {reminder.acwr}
                    </p>
                  </section>
                ) : null}
                <label className="relative block">
                  <span className="sr-only">{shell.search}</span>
                  <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-white/35">⌕</span>
                  <input
                    ref={searchRef}
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={shell.searchPlaceholder}
                    aria-label={shell.search}
                    className="w-full rounded-xl border border-white/10 bg-panel py-2.5 pl-9 pr-3 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-volt"
                  />
                </label>

                <button
                  type="button"
                  data-testid="picadito-entry"
                  onClick={() => {
                    setCasualOpen(true);
                    triggerCourtHaptics(22);
                  }}
                  className="tap mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-crimson/60 bg-crimson/15 px-3 py-2.5 text-[12px] font-black uppercase tracking-wider text-white"
                >
                  🍻 {t(locale, "Picadito & Amigos", "Pickup & Friends", "Picadito & Amigos")}
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-black text-white/70">
                    {t(locale, "8 herramientas", "8 tools", "8 ferramentas")}
                  </span>
                </button>

                <div data-testid="guided-modes" className="snap-row mt-3 flex gap-1.5 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label={t(locale, "Modos guiados", "Guided modes", "Modos guiados")}>
                  {GUIDED_MODES.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      role="tab"
                      aria-selected={guidedMode === mode.id}
                      onClick={() => chooseMode(mode.id)}
                      className={`tap shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                        guidedMode === mode.id ? "border-crimson bg-crimson text-white" : "border-white/10 text-white/60"
                      }`}
                    >
                      {mode.icon} {mode.label[locale]}
                    </button>
                  ))}
                </div>

                <div data-testid="profile-filters" className="snap-row mt-1.5 flex gap-1.5 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label={shell.allModules}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={!favOnly && profile === "all"}
                    onClick={() => chooseProfile("all")}
                    className={`tap shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                      !favOnly && profile === "all" ? "border-volt bg-volt text-obsidian" : "border-white/10 text-white/60"
                    }`}
                  >
                    {PROFILE_LABELS.all[locale]}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={favOnly}
                    onClick={() => {
                      setFavOnly(true);
                      triggerCourtHaptics(22);
                    }}
                    className={`tap shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                      favOnly ? "border-volt bg-volt text-obsidian" : "border-white/10 text-white/60"
                    }`}
                  >
                    ⭐ {shell.favorites}
                  </button>
                  {FILTERS.filter((value): value is Profile => value !== "all").map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="tab"
                      aria-selected={!favOnly && profile === value}
                      onClick={() => chooseProfile(value)}
                      className={`tap shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                        !favOnly && profile === value ? "border-volt bg-volt text-obsidian" : "border-white/10 text-white/60"
                      }`}
                    >
                      {PROFILE_LABELS[value][locale]}
                    </button>
                  ))}
                </div>

                {guidedMode && GUIDED_MODE_BY_ID.has(guidedMode) ? (
                  <section className="mt-5 space-y-3" data-testid="guided-drawers">
                    <ModuleGuideBanner slug="home" locale={locale} defaultOpen={guidedMode === "novice"} />
                    {guidedMode === "novice" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCasualOpen(true);
                          triggerCourtHaptics(22);
                        }}
                        className="tap w-full rounded-xl border border-crimson/50 bg-crimson/15 px-3 py-2.5 text-left text-[11px] font-black text-white"
                      >
                        🍻 {t(locale, "Picadito & Amigos: lista, banco, juez, calentamiento y vaquita", "Pickup & Friends: roster, bench, judge, warmup and pot", "Picadito & Amigos: lista, banco, juiz, aquecimento e vaquinha")}
                      </button>
                    ) : null}
                    {GUIDED_MODE_BY_ID.get(guidedMode)?.drawers.map((drawer) => (
                      <div key={drawer.id} className="vos-section-card vos-stack">
                        <button
                          type="button"
                          aria-expanded={openDrawers[drawer.id] ?? false}
                          onClick={() => toggleDrawer(drawer.id)}
                          className="flex w-full items-center justify-between gap-2 text-left"
                        >
                          <span className="text-[12px] font-black uppercase tracking-wider text-white">
                            {drawer.title[locale]}
                            {drawer.badge ? (
                              <span className="ml-2 rounded-full bg-volt/15 px-2 py-0.5 text-[9px] text-volt">
                                {DIFFICULTY_BADGES[drawer.badge][locale]}
                              </span>
                            ) : null}
                          </span>
                          <span className="flex items-center gap-2 text-[10px] text-white/45">
                            {drawer.slugs.length} {t(locale, "herramientas", "tools", "ferramentas")}
                            <span aria-hidden>{openDrawers[drawer.id] ? "▲" : "▼"}</span>
                          </span>
                        </button>
                        {openDrawers[drawer.id] ? (
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {drawer.slugs.map((slug) => {
                              const meta = MODULE_BY_SLUG.get(slug);
                              if (!meta) return null;
                              return (
                                <button
                                  key={slug}
                                  type="button"
                                  data-testid="guided-tool"
                                  onClick={() => openModule(slug)}
                                  className="tap flex w-full items-center gap-2 rounded-xl border border-white/10 bg-panel p-2 text-left active:border-volt/50"
                                >
                                  <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-obsidian text-base ring-1 ring-white/10">
                                    {meta.icon}
                                  </span>
                                  <span className="line-clamp-2 text-[11px] font-bold leading-tight">{meta.name[locale]}</span>
                                </button>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    ))}
                    <button
                      type="button"
                      data-testid="all-tools-toggle"
                      onClick={() => chooseMode(guidedMode)}
                      className="tap w-full rounded-xl border border-white/15 bg-panel px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-white/70"
                    >
                      📂 {t(locale, "Ver / Buscar las 60 Herramientas", "Browse / Search all 60 Tools", "Ver / Buscar as 60 Ferramentas")}
                    </button>
                  </section>
                ) : null}

                {recent.length > 0 && !guidedMode ? (
                  <section className="mt-5">
                    <h2 className="px-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{shell.recents}</h2>
                    <div className="snap-row mt-2 flex gap-2 overflow-x-auto no-scrollbar pb-1">
                      {recent.map((slug) => {
                        const meta = MODULE_BY_SLUG.get(slug);
                        if (!meta) return null;
                        return (
                          <button
                            key={slug}
                            type="button"
                            onClick={() => openModule(slug)}
                            className="tap flex w-[136px] shrink-0 flex-col gap-1 rounded-2xl border border-white/10 bg-panel p-3 text-left"
                          >
                            <span aria-hidden className="text-lg">{meta.icon}</span>
                            <span className="line-clamp-2 text-[11px] font-bold leading-tight">{meta.name[locale]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                <section className="mt-5">
                  <div className="flex items-baseline justify-between px-1">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                      {favOnly ? shell.favorites : shell.allModules}
                    </h2>
                    <span className="text-[10px] font-bold text-emerald">{visible.length}/{MODULES.length}</span>
                  </div>
                  {visible.length === 0 ? (
                    <p className="mt-6 rounded-2xl border border-white/10 bg-panel px-4 py-6 text-center text-[12px] text-white/50">
                      {favOnly ? shell.favoritesHint : shell.noRecents}
                    </p>
                  ) : (
                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                      {visible.map((meta) => (
                        <div key={meta.slug} className="relative">
                          <button
                            type="button"
                            data-testid="module-card"
                            onClick={() => openModule(meta.slug)}
                            className="tap flex h-full w-full flex-col items-start gap-2 rounded-2xl border border-white/10 bg-panel p-3 text-left active:border-volt/50"
                          >
                            <span className="flex w-full items-start justify-between">
                              <span aria-hidden className="grid h-10 w-10 place-items-center rounded-xl bg-obsidian text-lg ring-1 ring-white/10">
                                {meta.icon}
                              </span>
                              <span className="text-[9px] font-black tabular-nums text-white/25">{meta.number.toString().padStart(2, "0")}</span>
                            </span>
                            <span className="line-clamp-2 text-[12px] font-bold leading-tight text-white">{meta.name[locale]}</span>
                            <span className="line-clamp-1 text-[10px] leading-tight text-white/45">{meta.tagline[locale]}</span>
                          </button>
                          <button
                            type="button"
                            aria-label={`${shell.favorite}: ${meta.name[locale]}`}
                            aria-pressed={pinned.includes(meta.slug)}
                            onClick={() => togglePin(meta.slug)}
                            className={`tap absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full text-[12px] ${
                              pinned.includes(meta.slug) ? "text-volt" : "text-white/25"
                            }`}
                          >
                            {pinned.includes(meta.slug) ? "★" : "☆"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <p className="mt-6 text-center text-[9px] uppercase tracking-[0.18em] text-white/25">
                  {t(locale, "61 motores locales · 0 telemetría · AGPL-3.0", "61 local engines · 0 telemetry · AGPL-3.0", "61 motores locais · 0 telemetria · AGPL-3.0")}
                </p>
              </div>
            ) : null}

            {groupKey ? (
              <div className="mx-auto flex h-full max-w-3xl flex-col">
                <div className="shrink-0 px-3 pt-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h1 className="text-lg font-black tracking-tight">{tabTitles[tab].title}</h1>
                      <p className="text-[11px] text-white/45">{tabTitles[tab].sub}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openModule(pickedSlug)}
                      className="tap rounded-full border border-white/10 px-2 py-1 text-[10px] font-bold text-white/60"
                    >
                      ⤢ {shell.openModule}
                    </button>
                  </div>
                  <div className="snap-row mt-2 flex gap-1.5 overflow-x-auto no-scrollbar pb-1" role="tablist" aria-label={tabTitles[tab].title}>
                    {groupSlugs.map((slug) => {
                      const meta = MODULE_BY_SLUG.get(slug);
                      if (!meta) return null;
                      return (
                        <button
                          key={slug}
                          type="button"
                          role="tab"
                          aria-selected={pickedSlug === slug}
                          onClick={() => {
                            setTabPick((current) => ({ ...current, [groupKey]: slug }));
                            triggerCourtHaptics(18);
                          }}
                          className={`tap shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-bold ${
                            pickedSlug === slug ? "border-volt bg-volt text-obsidian" : "border-white/10 text-white/60"
                          }`}
                        >
                          {meta.icon} {meta.name[locale]}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar px-3 pb-24 pt-3">
                  {PickedStation ? (
                    <PickedStation meta={MODULE_BY_SLUG.get(pickedSlug) ?? MODULES[0]!} locale={locale} onSave={handleSave} />
                  ) : null}
                </div>
              </div>
            ) : null}

            {tab === "settings" ? (
              <div className="mx-auto max-w-3xl px-3 pb-28 pt-3">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h1 className="text-lg font-black tracking-tight">{shell.settingsTitle}</h1>
                    <p className="text-[11px] text-white/45">
                      {creator ? `👑 ${shell.licenseCreator}` : shell.licenseLocked}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${
                    target === "fdroid" ? "border-emerald/40 text-emerald" : "border-crimson/50 text-crimson"
                  }`}>
                    {target === "fdroid" ? "FOSS" : "CLOUD"}
                  </span>
                </div>

                <h2 className="px-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{shell.language}</h2>
                <div className="grid grid-cols-3 gap-2">
                  {LOCALES.map((code) => {
                    const names: Record<Locale, string> = { es: "Español", en: "English", pt: "Português" };
                    return (
                      <a
                        key={code}
                        href={`/${code}`}
                        aria-current={code === locale ? "page" : undefined}
                        className={`tap rounded-2xl border px-3 py-3 text-center text-[12px] font-bold ${
                          code === locale ? "border-volt bg-volt/15 text-volt" : "border-white/10 bg-panel text-white/60"
                        }`}
                      >
                        {names[code]}
                      </a>
                    );
                  })}
                </div>                 <ValueRow
                  label={t(locale, "Asistente inicial", "Setup assistant", "Assistente inicial")}
                  value={t(locale, "3 toques", "3 taps", "3 toques")}
                  onClick={reopenOnboarding}
                />

                <div className="relative mt-3 flex items-center gap-2">
                  <span className="sr-only">{t(locale, "Modo de interfaz", "Interface mode", "Modo de interface")}</span>
                  {uiMode === "simple" ? (
                    <button
                      type="button"
                      data-testid="hub-mode-toggle"
                      aria-pressed={uiMode === "simple"}
                      aria-label={t(locale, "Activar modo profesional", "Activate pro mode", "Ativar modo profissional")}
                      onClick={toggleUiMode}
                      className="tap inline-flex items-center gap-2 rounded-2xl border border-crimson/70 bg-emerald/20 px-4 py-2.5 text-[13px] font-black uppercase tracking-wider text-emerald shadow& transition-colors"
                    >
                      <span aria-hidden className="text-base leading-none">⚡</span>
                      {t(locale, "Modo Simple", "Simple mode", "Modo Simples")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      data-testid="hub-mode-toggle"
                      aria-pressed={uiMode === "pro"}
                      aria-label={t(locale, "Activar modo simple", "Activate simple mode", "Ativar modo simples")}
                      onClick={toggleUiMode}
                      className="tap inline-flex items-center gap-2 rounded-2xl border border-volt/60 bg-volt/15 px-4 py-2.5 text-[13px] font-black uppercase tracking-wider text-volt shadow transition-colors"
                    >
                      <span aria-hidden className="text-base leading-none">🧠</span>
                      {t(locale, "Modo Pro", "Pro mode", "Modo Profissional")} ({shell.allModules})
                    </button>
                  )
                </div>
                <h2 className="mt-5 px-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{shell.theme}</h2>
                <SwitchRow
                  label={shell.theme}
                  hint={solar ? shell.themeSolar : shell.themeObsidian}
                  checked={solar}
                  onToggle={() => setSolar((value) => !value)}
                />
                <div className="mt-2 grid gap-2">
                  <SwitchRow label={shell.courtAudio} checked={courtAudio} onToggle={() => setCourtAudio((value) => !value)} />
                  <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-panel px-4 py-3">
                    <span className="text-[13px] font-semibold text-white">
                      🔉 {t(locale, "Público del estadio", "Stadium crowd", "Torcida do estádio")}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={Math.round(crowdVolume * 100)}
                      aria-label={t(locale, "Volumen del público", "Crowd volume", "Volume da torcida")}
                      onChange={(event) => setCrowdVolume(saveCrowdAmbience(Number(event.target.value) / 100))}
                      className="w-32 accent-volt"
                    />
                  </label>
                  <SwitchRow label={shell.voice} checked={voice} onToggle={toggleVoice} />
                  <SwitchRow
                    label={t(locale, "Pantalla despierta", "Keep screen awake", "Tela acordada")}
                    checked={awake}
                    onToggle={() => {
                      void toggleWakeLock();
                    }}
                  />
                </div>

                <h2 className="mt-5 px-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{shell.license}</h2>
                <ValueRow
                  label={creator ? shell.licenseCreator : shell.licenseLocked}
                  value={creator ? t(locale, "Activo", "Active", "Ativo") : "***"}
                  onClick={() => {
                    if (creator) relockCreator();
                    else {
                      setKeyOpen(true);
                      setKeyError(false);
                    }
                  }}
                />

                <h2 className="mt-5 px-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">
                  {t(locale, "Copia de seguridad", "Backup", "Cópia de segurança")}
                </h2>
                <div className="grid gap-2">
                  <button
                    type="button"
                    data-testid="vos-export"
                    onClick={() => {
                      const name = downloadVosBackup();
                      setVosMsg(
                        name
                          ? t(locale, `📦 ${name} guardada.`, `📦 ${name} saved.`, `📦 ${name} salva.`)
                          : t(locale, "❌ No se pudo exportar.", "❌ Export failed.", "❌ Falha ao exportar."),
                      );
                    }}
                    className="tap w-full rounded-xl border border-white/10 bg-panel px-4 py-3 text-left text-[13px] font-semibold"
                  >
                    📦 {t(locale, "Exportar / Restaurar Copia de Seguridad Completa (.vos)", "Export / Restore Full Backup (.vos)", "Exportar / Restaurar Backup Completo (.vos)")}
                  </button>
                  <label className="tap flex w-full cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-panel px-4 py-3 text-[13px] font-semibold">
                    <span>📥 {t(locale, "Restaurar desde archivo .vos", "Restore from .vos file", "Restaurar de arquivo .vos")}</span>
                    <input
                      type="file"
                      accept=".vos,.enc,application/json"
                      data-testid="vos-import"
                      className="hidden"
                      onChange={(event) => void restoreVosFile(event)}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-panel px-4 py-2.5">
                    <span className="text-[11px] font-semibold text-white/60">
                      🔒 {t(locale, "Contraseña AES-256 (opcional)", "AES-256 password (optional)", "Senha AES-256 (opcional)")}
                    </span>
                    <input
                      type="password"
                      data-testid="vos-password"
                      value={vosPassword}
                      onChange={(event) => setVosPassword(event.target.value)}
                      className="w-40 rounded-lg border border-white/10 bg-obsidian px-2 py-1 text-[12px] text-white outline-none focus:border-volt"
                    />
                  </label>
                  <button
                    type="button"
                    data-testid="vos-export-encrypted"
                    disabled={vosPassword.trim().length === 0}
                    onClick={() => {
                      void downloadEncryptedVosBackup(vosPassword).then((name) => {
                        setVosMsg(
                          name
                            ? t(locale, `🔐 ${name} cifrada.`, `🔐 ${name} encrypted.`, `🔐 ${name} criptografada.`)
                            : t(locale, "❌ No se pudo cifrar.", "❌ Encryption failed.", "❌ Falha ao criptografar."),
                        );
                      });
                    }}
                    className="tap w-full rounded-xl border border-white/10 bg-panel px-4 py-3 text-left text-[13px] font-semibold disabled:opacity-40"
                  >
                    🔐 {t(locale, "Exportar cifrado (.vos.enc)", "Export encrypted (.vos.enc)", "Exportar criptografado (.vos.enc)")}
                  </button>
                  {vosMsg ? (
                    <p data-testid="vos-msg" role="status" className="text-[10px] text-emerald">
                      {vosMsg}
                    </p>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setMonetizationOpen(true)}
                  className="tap w-full rounded-xl border border-white/10 bg-panel px-4 py-3 text-left"
                >
                  {t(locale, "Licencias, donaciones y keygen", "Licences, donations & keygen", "Licenças, doações e keygen")}
                </button>

                {creator ? <CreatorKeygenPanel locale={locale} /> : null}

                <button
                  type="button"
                  data-testid="share-app"
                  onClick={() => {
                    void (async () => {
                      const shareData = {
                        title: "VolleyOS Global",
                        text: t(locale, "El sistema operativo del vóley", "The volleyball operating system", "O sistema operacional do voleibol"),
                        url: "https://volleyos.app",
                      };
                      try {
                        if (typeof navigator.share === "function") {
                          await navigator.share(shareData);
                          setShareMsg(t(locale, "📤 Compartido.", "📤 Shared.", "📤 Compartilhado."));
                        } else if (await copyTextUniversal(shareData.url)) {
                          setShareMsg(t(locale, "🔗 Enlace copiado.", "🔗 Link copied.", "🔗 Link copiado."));
                        } else {
                          setShareMsg("🔗 volleyos.app");
                        }
                      } catch {
                        setShareMsg(t(locale, "✖ Cancelado.", "✖ Cancelled.", "✖ Cancelado."));
                      }
                    })();
                  }}
                  className="tap w-full rounded-xl border border-white/10 bg-panel px-4 py-3 text-left text-[13px] font-semibold text-white"
                >
                  📤 {t(locale, "Compartir VolleyOS", "Share VolleyOS", "Compartilhar VolleyOS")}
                </button>
                {shareMsg ? (
                  <p data-testid="share-result" role="status" className="rounded-xl border border-white/15 bg-panel px-3 py-2 text-[11px] font-semibold text-white/70">
                    {shareMsg}
                  </p>
                ) : null}
                <button
                  type="button"
                  data-testid="update-check"
                  disabled={checking}
                  onClick={() => {
                    setChecking(true);
                    setUpdateState(null);
                    void checkForUpdate(APP_VERSION).then((result) => {
                      setUpdateState(result);
                      setChecking(false);
                    });
                  }}
                  className="tap w-full rounded-xl border border-white/10 bg-panel px-4 py-3 text-left text-[13px] font-semibold text-white disabled:opacity-50"
                >
                  🔄{" "}
                  {checking
                    ? t(locale, "Consultando GitHub…", "Checking GitHub…", "Consultando GitHub…")
                    : t(
                        locale,
                        "Verificar si hay una versión nueva en GitHub",
                        "Check for a new version on GitHub",
                        "Verificar se há uma versão nova no GitHub",
                      )}
                </button>
                {updateState ? (
                  <p
                    data-testid="update-result"
                    className={`rounded-xl border px-3 py-2 text-[11px] font-semibold ${
                      updateState.status === "update"
                        ? "border-emerald/40 bg-emerald/10 text-emerald"
                        : "border-white/15 bg-panel text-white/60"
                    }`}
                  >
                    {updateState.status === "update" ? (
                      <>
                        {t(
                          locale,
                          `⬆️ Nueva versión disponible: ${updateState.version}`,
                          `⬆️ New version available: ${updateState.version}`,
                          `⬆️ Nova versão disponível: ${updateState.version}`,
                        )}{" "}
                        <a href={updateState.url} target="_blank" rel="noreferrer" className="font-black underline">
                          ⬇️ {t(locale, "Descargar APK", "Download APK", "Baixar APK")}
                        </a>
                      </>
                    ) : updateState.status === "up-to-date" ? (
                      t(
                        locale,
                        `✅ Estás en la última versión (${APP_VERSION}).`,
                        `✅ You are on the latest version (${APP_VERSION}).`,
                        `✅ Você está na última versão (${APP_VERSION}).`,
                      )
                    ) : (
                      t(
                        locale,
                        `⚠️ No se pudo consultar (${updateState.message}).`,
                        `⚠️ Check failed (${updateState.message}).`,
                        `⚠️ Falha na consulta (${updateState.message}).`,
                      )
                    )}
                  </p>
                ) : null}

                <section
                  data-testid="coverage-card"
                  className="mt-5 rounded-2xl border border-emerald/30 bg-emerald/10 p-4"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald">
                    📊 {t(locale, "Estadística de Rigor y Cobertura", "Rigor & Coverage Stat", "Estatística de Rigor e Cobertura")}
                  </p>
                  <p className="mt-1 text-[13px] font-black text-white">
                    {Object.keys(MODULE_GUIDES).length}/{MODULES.length}{" "}
                    {t(locale, "módulos con guía interactiva", "modules with an interactive guide", "módulos com guia interativa")}
                  </p>
                  <ul className="mt-2 space-y-0.5 text-[11px] text-white/70">
                    <li>
                      ✅ 100% {t(locale, "offline", "offline", "offline")} · 0%{" "}
                      {t(locale, "telemetría", "telemetry", "telemetria")}
                    </li>
                    <li>
                      🌍 {t(locale, "Cobertura trilingüe ES/EN/PT verificada", "Verified ES/EN/PT trilingual coverage", "Cobertura trilíngue ES/EN/PT verificada")}
                    </li>
                    <li>
                      🧭 {t(locale, "Guías paso a paso en cada módulo", "Step-by-step guides in every module", "Guias passo a passo em cada módulo")}
                    </li>
                  </ul>
                </section>

                <h2 className="mt-5 px-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{shell.vaultSection}</h2>
                <EphemeralVaultBar locale={locale} embedded />

                <h2 className="mt-5 px-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{shell.dataSection}</h2>
                <ValueRow label={shell.capsule} value=".volleyos" onClick={() => openModule("capsule-io")} />

                <details className="mt-5 rounded-2xl border border-white/10 bg-panel px-4 py-3">
                  <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{shell.pricingTitle}</summary>
                  <p className="mt-2 text-[11px] leading-relaxed text-white/55">{shell.pricingNote}</p>
                  <div className="mt-3 grid gap-2">
                    {PLANS.map((plan) => (
                      <div key={plan.name} className={`rounded-xl border p-3 ${plan.highlight ? "border-crimson/60 bg-crimson/10" : "border-white/10 bg-obsidian/60"}`}>
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-[12px] font-black">{plan.name}</p>
                          <p className="text-sm font-black text-volt">{plan.price} <span className="text-[9px] text-white/40">USD</span></p>
                        </div>
                        <p className="mt-0.5 text-[10px] text-white/50">{plan.tagline[locale]}</p>
                        {locked ? (
                          <button
                            type="button"
                            onClick={() => setCheckout(plan)}
                            className="tap mt-2 w-full rounded-lg bg-crimson px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white"
                          >
                            {t(locale, "Ver plan", "See plan", "Ver plano")}
                          </button>
                        ) : (
                          <p className="mt-2 text-[10px] font-bold text-emerald">{t(locale, "Incluido en tu build", "Included in your build", "Incluído na sua versão")}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>

                <details className="mt-3 rounded-2xl border border-white/10 bg-panel px-4 py-3">
                  <summary className="cursor-pointer text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{shell.legalSection}</summary>
                  <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-white/60">
                    <a className="tap py-1 hover:text-volt" href={`/${locale}/legal/privacy`}>{shell.privacy}</a>
                    <a className="tap py-1 hover:text-volt" href={`/${locale}/legal/terms`}>{shell.terms}</a>
                    <a className="tap py-1 hover:text-volt" href={`/${locale}/legal/disclaimer`}>{shell.disclaimer}</a>
                    <a className="tap py-1 hover:text-volt" href={`/${locale}/legal/trademarks`}>{shell.trademarks}</a>
                  </div>
                </details>

                <p className="mt-6 text-center text-[9px] text-white/30">
                  © {new Date().getFullYear()} VolleyOS Global · AGPL-3.0-or-later · {t(locale, "hecho para canchas reales", "built for real courts", "feito para quadras reais")}
                </p>
                {monetizationOpen && (
                  <MonetizationModal
                    locale={locale}
                    onClose={() => setMonetizationOpen(false)}
                    onActivated={activateLicense}
                  />
                )}
              </div>
            ) : null}
          </div>
        )}       </div>
      )}

      {!activeMeta ? (        <nav aria-label={shell.tabsLabel} className="safe-bottom z-30 shrink-0 border-t border-white/10 bg-obsidian/95">
            <div role="tablist" aria-label={shell.tabsLabel} className="mx-auto grid h-16 max-w-3xl grid-cols-3">
              {uiMode === "simple"
                ? (["court", "home", "settings"] as const).map((value) => {
                    const labels: Record<Tab, string> = {
                      court: shell.tabCourt,
                      home: t(locale, "Picadito & Amigos", "Pickup & Friends", "Picadito & Amigos"),
                      settings: shell.tabSettings,
                    };
                    const active = tab === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={active}
                        onClick={() => goTab(value)}
                        className={`tap flex flex-col items-center justify-center gap-0.5 ${active ? "text-volt" : "text-white/45"}`}
                      >
                        <span aria-hidden className="text-lg leading-none">{TAB_ICON[value]}</span>            <span className="text-[9px] font-black uppercase tracking-wider">{labels[value]}</span>
                      </button>
                    );
                  })
               : (["home", "court", "board", "lab", "settings"] as Tab[]).map((value) => {
                   const labels: Record<Tab, string> = {
                     home: shell.tabHome,
                     court: shell.tabCourt,
                     board: shell.tabBoard,
                     lab: shell.tabLab,
                     settings: shell.tabSettings,
                   };
                   const active = tab === value;
                   return (
                     <button
                       key={value}
                       type="button"
                       role="tab"
                       aria-selected={active}
                       onClick={() => goTab(value)}
                       className={`tap flex flex-col items-center justify-center gap-0.5 ${active ? "text-volt" : "text-white/45"}`}
                     >
                       <span aria-hidden className="text-lg leading-none">{TAB_ICON[value]}</span>
                       <span className="text-[9px] font-black uppercase tracking-wider">{labels[value]}</span>
                     </button>
                   );
                 })}
            </div>
          </nav>
        ) : null}

      {onboarding ? (
        <div role="dialog" aria-modal="true" aria-label={t(locale, "Configuración inicial", "First setup", "Configuração inicial")} className="fixed inset-0 z-50 grid place-items-end bg-black/80 p-3 sm:place-items-center">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-panel p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-crimson">
                {onboardingStep}/3 · {t(locale, "Tu cancha en 3 toques", "Your court in 3 taps", "Sua quadra em 3 toques")}
              </p>
              <button type="button" aria-label={t(locale, "Cerrar", "Close", "Fechar")} onClick={finishOnboarding} className="text-white/40">✕</button>
            </div>

            {onboardingStep === 1 ? (
              <div className="mt-3">
                <h2 className="text-lg font-black">{t(locale, "¿En qué idioma hablás en la cancha?", "Which language do you speak on court?", "Em que idioma você fala na quadra?")}</h2>
                <div className="mt-3 grid gap-2">
                  {([["es", "🇦🇷 / 🇪🇸 Español"], ["en", "🇺🇸 English"], ["pt", "🇧🇷 Português"]] as const).map(([code, label]) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => {
                        window.localStorage.setItem(ONBOARDING_LANG_KEY, code);
                        if (code === locale) setOnboardingStep(2);
                        else window.location.href = `/${code}`;
                      }}
                      className={`tap rounded-2xl border px-4 py-3 text-left text-[13px] font-bold ${code === locale ? "border-volt bg-volt/10 text-volt" : "border-white/10 bg-obsidian text-white/80"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {onboardingStep === 2 ? (
              <div className="mt-3">
                <h2 className="text-lg font-black">{t(locale, "¿Cuál es tu rol principal?", "What is your main role?", "Qual é o seu papel principal?")}</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {([
                    ["player", "🔥", t(locale, "Jugador", "Player", "Jogador")],
                    ["coach", "📋", t(locale, "DT / Estadístico", "Coach / Analyst", "Técnico / Estatístico")],
                    ["referee", "🟨", t(locale, "Árbitro / Mesa", "Referee / Table", "Árbitro / Mesa")],
                    ["organiser", "🏆", t(locale, "Organizador", "Organiser", "Organizador")],
                    ["fan", "🍿", t(locale, "Tribuna", "Fan stand", "Torcida")],
                  ] as const).map(([key, icon, label]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={roleChoice === key}
                      onClick={() => { setRoleChoice(key); setOnboardingStep(3); triggerCourtHaptics(25); }}
                      className={`tap flex items-center gap-2 rounded-2xl border px-3 py-3 text-[12px] font-bold ${roleChoice === key ? "border-volt bg-volt/10 text-volt" : "border-white/10 bg-obsidian text-white/80"}`}
                    >
                      <span aria-hidden className="text-lg">{icon}</span>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {onboardingStep === 3 ? (
              <div className="mt-3">
                <h2 className="text-lg font-black">{t(locale, "Listo, cancha armada", "Court ready", "Quadra pronta")}</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-white/55">
                  {t(locale, "Te dejamos 4 módulos clave en favoritos y abrimos la pestaña que más vas a usar.", "Four key modules are starred and we open the tab you will use most.", "Deixamos 4 módulos-chave nos favoritos e abrimos a aba que você mais vai usar.")}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {(roleChoice ? ROLE_SETUP[roleChoice]?.slugs ?? [] : []).map((slug) => (
                    <span key={slug} className="rounded-full border border-volt/40 bg-volt/10 px-2 py-1 text-[10px] font-bold text-volt">
                      {MODULE_BY_SLUG.get(slug)?.name[locale] ?? slug}
                    </span>
                  ))}
                </div>
                <button type="button" onClick={finishOnboarding} className="tap mt-4 w-full rounded-xl bg-crimson px-3 py-3 text-[12px] font-black uppercase tracking-wider text-white">
                  {t(locale, "Entrar a la cancha", "Enter the court", "Entrar na quadra")}
                </button>
                <button type="button" onClick={() => setOnboardingStep(2)} className="tap mt-2 w-full rounded-xl border border-white/15 px-3 py-2 text-[10px] font-bold text-white/60">
                  {t(locale, "Cambiar rol", "Change role", "Mudar papel")}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {coachMarks ? <CoachMarksOverlay locale={locale} onClose={() => setCoachMarks(false)} /> : null}

      {supportMoment ? (
        <SupportSheet locale={locale} moment={supportMoment} onClose={() => setSupportMoment(null)} />
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-24 left-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 rounded-xl border border-emerald/40 bg-emerald/15 px-3 py-2 text-center text-[11px] font-semibold text-emerald backdrop-blur"
        >
          {toast}
        </div>
      ) : null}

      {keyOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={shell.creatorTitle}
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
          onClick={() => setKeyOpen(false)}
        >
          <form
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-panel p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              void submitCreatorKey();
            }}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-crimson">{shell.license}</p>
            <h3 className="mt-1 text-xl font-black">{shell.creatorTitle}</h3>
            <p className="mt-2 text-[11px] leading-relaxed text-white/60">{shell.creatorHelp}</p>
            <input
              type="password"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              value={keyValue}
              onChange={(event) => {
                setKeyValue(event.target.value);
                setKeyError(false);
              }}
              aria-invalid={keyError}
              aria-label={shell.creatorTitle}
              className="mt-4 w-full rounded-lg border border-white/15 bg-obsidian px-3 py-2 text-sm text-white outline-none focus:border-volt"
            />
            {keyError ? (
              <p role="alert" className="mt-2 text-[11px] font-semibold text-crimson">
                {shell.wrongKey}
              </p>
            ) : null}
            <button type="submit" className="tap mt-4 w-full rounded-lg bg-crimson px-3 py-2 text-[11px] font-black uppercase tracking-wider text-white">
              {shell.unlock}
            </button>
            <button
              type="button"
              className="tap mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white"
              onClick={() => setKeyOpen(false)}
            >
              {shell.close}
            </button>
          </form>
        </div>
      ) : null}

      {checkout ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t(locale, "Confirmar plan", "Confirm plan", "Confirmar plano")}
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
          onClick={() => setCheckout(null)}
        >
          <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-panel p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-crimson">Cloud Pro</p>
            <h3 className="mt-1 text-xl font-black">{checkout.name}</h3>
            <p className="mt-1 text-2xl font-black text-volt">
              {checkout.price} <span className="text-[10px] text-white/40">USD</span>
            </p>
            <p className="mt-2 text-[11px] text-white/60">{checkout.tagline[locale]}</p>
            <ul className="mt-3 space-y-1 text-[11px] text-white/70">
              {checkout.features[locale].map((feature) => (
                <li key={feature}>· {feature}</li>
              ))}
            </ul>
            <a
              href={`mailto:cloud@volleyos.app?subject=${encodeURIComponent(`VolleyOS ${checkout.name}`)}`}
              className="tap mt-4 block rounded-lg bg-crimson px-3 py-2 text-center text-[11px] font-black uppercase tracking-wider text-white"
            >
              {t(locale, "Reservar por email", "Book by email", "Reservar por e-mail")}
            </a>
            <button
              type="button"
              className="tap mt-2 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-white"
              onClick={() => setCheckout(null)}
            >
              {shell.close}
            </button>
            <p className="mt-2 text-[9px] leading-relaxed text-white/35">
              {t(locale, "Sin telemetría. La confirmación se firma con HMAC-SHA256 en el backend.", "No telemetry. Confirmation is HMAC-SHA256 signed by the backend.", "Sem telemetria. A confirmação é assinada com HMAC-SHA256 no backend.")}
            </p>
          </div>
        </div>
      ) : null}

      {castOpen ? (
        <LiveCastModal
          locale={locale}
          state={liveScore ?? readLiveScoreboard() ?? newScoreboard()}
          roomId={castRoomRef.current}
          hostSecret={castSecretRef.current}
          initialJoin={castJoinRoom}
          onClose={() => {
            setCastOpen(false);
            setCastJoinRoom(null);
          }}
        />
      ) : null}
    </main>
  );
}
