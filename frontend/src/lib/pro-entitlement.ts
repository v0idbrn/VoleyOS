import { getDeviceInstallId } from "./creator-unlock";
import { verifyProLicenseToken } from "./security-hardening";
import type { Locale } from "./local-engines";

/**
 * v11.0.5 — the single source of truth for 🧠 Modo Pro entitlement.
 * A user is entitled only via the private Creator APK bridge, a valid
 * device-bound VOS-PRO license, or automated tests (unless the paywall
 * itself is under test via `voleyos_force_test_paywall`).
 */
export const PRO_LICENSE_KEY = "voleyos_pro_license";
export const PRO_PAYWALL_TEST_KEY = "voleyos_force_test_paywall";

/** Display/verification device id in the `VOS-DEV-…` format shown to the user. */
export function proDeviceId(): string {
  return `VOS-DEV-${getDeviceInstallId()}`;
}

type CreatorBridge = { isCreatorUnlocked?: () => boolean };

function creatorBridge(): CreatorBridge | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { VosleyOSBridge?: CreatorBridge; VoleyOSBridge?: CreatorBridge };
  return w.VosleyOSBridge ?? w.VoleyOSBridge;
}

export function isUserProEntitled(): boolean {
  if (typeof window === "undefined") return true;
  if (creatorBridge()?.isCreatorUnlocked?.() === true) return true;
  const token = window.localStorage.getItem(PRO_LICENSE_KEY);
  if (token) {
    try {
      if (verifyProLicenseToken(token, { deviceId: proDeviceId() }).ok) return true;
    } catch {
      /* malformed token: treat as unentitled */
    }
  }
  const isTest =
    typeof process !== "undefined" && (process.env.NODE_ENV === "test" || Boolean(process.env.VITEST));
  if (isTest && window.localStorage.getItem(PRO_PAYWALL_TEST_KEY) !== "1") return true;
  return false;
}

/* -------------------------------------------------------------------------- */
/* v11.3.0 — the Creator's real payment rails                                 */
/* -------------------------------------------------------------------------- */

/** 🇦🇷 Mercado Pago / transfer alias the Creator actually collects on. */
export const CREATOR_MP_ALIAS = "unfrgvnn.dead";
/** 🌎 Ko-fi (card / PayPal) checkout the Creator actually collects on. */
export const CREATOR_KOFI_URL = "https://ko-fi.com/unfrgvnn";
export const CREATOR_KOFI_HANDLE = "unfrgvnn";
/** 📲 WhatsApp number (E.164 digits, no `+`) used for direct order coordination. */
export const CREATOR_WHATSAPP_NUMBER = "5493874661269";
export const CREATOR_WHATSAPP_DISPLAY = "+54 9 387 466-1269";
export const CREATOR_WHATSAPP_URL = `https://wa.me/${CREATOR_WHATSAPP_NUMBER}`;

export type ProCurrency = "USD" | "ARS" | "BRL" | "EUR";
export type ProPlanId = "7D" | "30D" | "365D" | "LIFE" | "CLUB";
export type ProPaymentMethodId = "ars_mp_alias" | "global_kofi_paypal" | "whatsapp_direct";

/** The four reference currencies the paywall can display. */
export const PRO_CURRENCIES: ProCurrency[] = ["USD", "ARS", "BRL", "EUR"];

export const PRO_CURRENCY_SYMBOLS: Record<ProCurrency, string> = {
  USD: "$",
  ARS: "$",
  BRL: "R$",
  EUR: "€",
};

export const PRO_CURRENCY_FLAGS: Record<ProCurrency, string> = {
  USD: "🇺🇸",
  ARS: "🇦🇷",
  BRL: "🇧🇷",
  EUR: "🇪🇺",
};

type ByLocale = Record<Locale, string>;

export interface ProCommercialPlan {
  id: ProPlanId;
  /** Short commercial code shipped in order messages and receipts. */
  code: string;
  /** Card title with its pictogram. */
  label: ByLocale;
  /** Commercial name for order messages. */
  name: ByLocale;
  tagline: ByLocale;
  durationLabel: ByLocale;
  /** `null` means the plan never expires (lifetime). */
  durationDays: number | null;
  /** How many devices one purchase can bind. */
  devices: number;
  /** Decimal strings only — no binary floats touch a price. */
  prices: Record<ProCurrency, string>;
  highlight?: boolean;
}

/**
 * v11.3.0 — the five official Pro commercial plans, priced for the four
 * reference currencies. ARS is what Mercado Pago collects, the rest are the
 * reference price the buyer pays through Ko-fi (card / PayPal).
 */
export const PRO_COMMERCIAL_PLANS: ProCommercialPlan[] = [
  {
    id: "7D",
    code: "TRN",
    label: { es: "🏆 Torneo · 7 Días", en: "🏆 Tournament · 7 Days", pt: "🏆 Torneio · 7 Dias" },
    name: { es: "Pase Torneo / Fin de Semana", en: "Tournament / Weekend Pass", pt: "Passe Torneio / Fim de Semana" },
    tagline: {
      es: "Un torneo completo, sin suscripción",
      en: "One full tournament, no subscription",
      pt: "Um torneio completo, sem assinatura",
    },
    durationLabel: { es: "7 días", en: "7 days", pt: "7 dias" },
    durationDays: 7,
    devices: 1,
    prices: { USD: "4.99", ARS: "5500", BRL: "24.90", EUR: "4.50" },
  },
  {
    id: "30D",
    code: "PLY",
    label: { es: "🏐 Jugador / Scout · 30 Días", en: "🏐 Player / Scout · 30 Days", pt: "🏐 Jogador / Scout · 30 Dias" },
    name: { es: "Pase Jugador / Scout Mensual", en: "Player / Scout Monthly Pass", pt: "Passe Jogador / Scout Mensal" },
    tagline: { es: "Un mes de scouting y análisis", en: "A month of scouting and analysis", pt: "Um mês de scouting e análise" },
    durationLabel: { es: "30 días", en: "30 days", pt: "30 dias" },
    durationDays: 30,
    devices: 1,
    prices: { USD: "6.99", ARS: "7500", BRL: "34.90", EUR: "6.50" },
  },
  {
    id: "365D",
    code: "COA",
    label: { es: "📋 DT Anual · 365 Días", en: "📋 Head Coach Annual · 365 Days", pt: "📋 Técnico Anual · 365 Dias" },
    name: { es: "Pase DT / Temporada Anual", en: "Head Coach / Season Pass", pt: "Passe Técnico / Temporada Anual" },
    tagline: { es: "Temporada completa · ahorrás 65%", en: "Full season · save 65%", pt: "Temporada completa · economize 65%" },
    durationLabel: { es: "365 días", en: "365 days", pt: "365 dias" },
    durationDays: 365,
    devices: 1,
    prices: { USD: "29.99", ARS: "32000", BRL: "149.90", EUR: "27.99" },
    highlight: true,
  },
  {
    id: "LIFE",
    code: "LIFE",
    label: { es: "👑 Vitalicio · Para Siempre", en: "👑 Lifetime · Forever", pt: "👑 Vitalício · Para Sempre" },
    name: { es: "Licencia Vitalicia Pro", en: "Pro Lifetime Licence", pt: "Licença Vitalícia Pro" },
    tagline: { es: "Pago único, para siempre", en: "One payment, forever", pt: "Pagamento único, para sempre" },
    durationLabel: { es: "Vitalicia", en: "Lifetime", pt: "Vitalícia" },
    durationDays: null,
    devices: 1,
    prices: { USD: "49.99", ARS: "55000", BRL: "249.90", EUR: "45.99" },
  },
  {
    id: "CLUB",
    code: "CLB",
    label: { es: "🛡️ Pack Club · 5 Dispositivos", en: "🛡️ Club Pack · 5 Devices", pt: "🛡️ Pacote Clube · 5 Dispositivos" },
    name: { es: "Pack Club / Cuerpo Técnico", en: "Club / Staff Pack", pt: "Pacote Clube / Comissão Técnica" },
    tagline: {
      es: "DT + Estadístico + PF + Mesa + TV Gimnasio",
      en: "Head coach + statistician + S&C + table + gym TV",
      pt: "Técnico + Estatístico + PF + Mesa + TV do Ginásio",
    },
    durationLabel: { es: "365 días o vitalicia", en: "365 days or lifetime", pt: "365 dias ou vitalícia" },
    durationDays: null,
    devices: 5,
    prices: { USD: "99.00", ARS: "110000", BRL: "490.00", EUR: "89.00" },
  },
];

export interface ProPaymentMethod {
  id: ProPaymentMethodId;
  label: ByLocale;
  /** The rail as it appears inside an order message. */
  rail: ByLocale;
  /** Currencies the rail can settle in. */
  currencies: ProCurrency[];
}

/** The three rails the Creator actually answers on. */
export const PRO_PAYMENT_METHODS: ProPaymentMethod[] = [
  {
    id: "ars_mp_alias",
    label: {
      es: "🇦🇷 Transferencia / Mercado Pago (Alias: unfrgvnn.dead)",
      en: "🇦🇷 Transfer / Mercado Pago (Alias: unfrgvnn.dead)",
      pt: "🇦🇷 Transferência / Mercado Pago (Alias: unfrgvnn.dead)",
    },
    rail: {
      es: "Mercado Pago · Alias unfrgvnn.dead",
      en: "Mercado Pago · Alias unfrgvnn.dead",
      pt: "Mercado Pago · Alias unfrgvnn.dead",
    },
    currencies: ["ARS"],
  },
  {
    id: "global_kofi_paypal",
    label: {
      es: "🌎 Tarjeta Internacional / PayPal vía Ko-fi (ko-fi.com/unfrgvnn)",
      en: "🌎 International card / PayPal via Ko-fi (ko-fi.com/unfrgvnn)",
      pt: "🌎 Cartão Internacional / PayPal via Ko-fi (ko-fi.com/unfrgvnn)",
    },
    rail: {
      es: "Ko-fi unfrgvnn (ko-fi.com/unfrgvnn)",
      en: "Ko-fi unfrgvnn (ko-fi.com/unfrgvnn)",
      pt: "Ko-fi unfrgvnn (ko-fi.com/unfrgvnn)",
    },
    currencies: ["USD", "EUR", "BRL"],
  },
  {
    id: "whatsapp_direct",
    label: {
      es: "📲 Acordar por WhatsApp (+54 9 387 466-1269)",
      en: "📲 Arrange over WhatsApp (+54 9 387 466-1269)",
      pt: "📲 Combinar por WhatsApp (+54 9 387 466-1269)",
    },
    rail: {
      es: "WhatsApp +54 9 387 466-1269",
      en: "WhatsApp +54 9 387 466-1269",
      pt: "WhatsApp +54 9 387 466-1269",
    },
    currencies: ["ARS", "USD", "BRL", "EUR"],
  },
];

function pick(locale: Locale, es: string, en: string, pt: string): string {
  return locale === "es" ? es : locale === "en" ? en : pt;
}

export function proPlan(planId: ProPlanId): ProCommercialPlan {
  const plan = PRO_COMMERCIAL_PLANS.find((entry) => entry.id === planId);
  if (!plan) throw new Error(`unknown Pro plan ${planId}`);
  return plan;
}

export function proPaymentMethod(methodId: ProPaymentMethodId): ProPaymentMethod {
  const method = PRO_PAYMENT_METHODS.find((entry) => entry.id === methodId);
  if (!method) throw new Error(`unknown payment method ${methodId}`);
  return method;
}

/** Raw decimal string for a plan in a currency (never a float). */
export function proPlanAmount(planId: ProPlanId, currency: ProCurrency): string {
  return proPlan(planId).prices[currency];
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * `$4.99 USD` · `$5.500 ARS` · `R$ 24,90 BRL` · `4,50 € EUR`.
 * Local conventions per currency: dot decimals for USD, dot thousands for ARS,
 * comma decimals for BRL/EUR.
 */
export function formatPlanPrice(planId: ProPlanId, currency: ProCurrency): string {
  const raw = proPlanAmount(planId, currency);
  const [rawInt = "0", rawFrac = ""] = raw.split(".");
  const intDigits = rawInt.replace(/^0+(?=\d)/, "");
  const frac = `${rawFrac}00`.slice(0, 2);
  if (currency === "USD") return `$${intDigits}.${frac} USD`;
  if (currency === "ARS") return `$${groupThousands(intDigits)} ARS`;
  if (currency === "BRL") return `R$ ${groupThousands(intDigits)},${frac} BRL`;
  return `${groupThousands(intDigits)},${frac} € EUR`;
}

/**
 * Ready-to-send order message: plan, formatted price, the rail the buyer chose
 * and the exact Device ID the licence must be bound to.
 */
export function buildLicenseOrderMessage(options: {
  planId: ProPlanId;
  currency: ProCurrency;
  paymentMethod: ProPaymentMethodId;
  deviceId: string;
  locale: Locale;
}): string {
  const { planId, currency, paymentMethod, deviceId, locale } = options;
  const plan = proPlan(planId);
  const method = proPaymentMethod(paymentMethod);
  return [
    pick(locale, "📋 Pedido VolleyOS Pro", "📋 VolleyOS Pro order", "📋 Pedido VolleyOS Pro"),
    `${pick(locale, "Plan", "Plan", "Plano")}: ${plan.name[locale]} (${plan.code})`,
    `${pick(locale, "Precio", "Price", "Preço")}: ${formatPlanPrice(planId, currency)}`,
    `${pick(locale, "Pago", "Payment", "Pagamento")}: ${method.rail[locale]}`,
    `${pick(locale, "Dispositivos", "Devices", "Dispositivos")}: ${plan.devices}`,
    `${pick(locale, "Mi Device ID", "My Device ID", "Meu Device ID")}: ${deviceId}`,
  ].join("\n");
}

/** `https://wa.me/5493874661269?text=<order message>` — opens the Creator chat. */
export function buildWhatsAppOrderUrl(options: {
  planId: ProPlanId;
  currency: ProCurrency;
  paymentMethod: ProPaymentMethodId;
  deviceId: string;
  locale: Locale;
}): string {
  return `${CREATOR_WHATSAPP_URL}?text=${encodeURIComponent(buildLicenseOrderMessage(options))}`;
}

/* -------------------------------------------------------------------------- */
/* v11.3.0 — active licence countdown                                         */
/* -------------------------------------------------------------------------- */

export interface ActiveLicenseSummary {
  active: boolean;
  isCreator: boolean;
  tier: string;
  badgeText: string;
  daysRemaining: number | null;
  expiresAtIso: string | null;
}

const DAY_MS = 86_400_000;

/**
 * Human status for the `Licencia` row in Ajustes: Creator APK, a live VOS-PRO
 * token with its remaining days, or the locked Simple Mode state.
 */
export function getActiveLicenseSummary(
  deviceId: string,
  locale: Locale,
  now: number = Date.now(),
): ActiveLicenseSummary {
  const isCreator = creatorBridge()?.isCreatorUnlocked?.() === true;
  const token = typeof window === "undefined" ? null : window.localStorage.getItem(PRO_LICENSE_KEY);

  if (token) {
    const check = verifyProLicenseToken(token, { deviceId, now });
    if (check.ok) {
      const parts = token.trim().toUpperCase().split("-");
      const tier = parts[2] ?? "PLAYER";
      const expirySeconds = Number.parseInt(parts[3] ?? "", 36);
      const expiresAtIso = Number.isFinite(expirySeconds) ? new Date(expirySeconds * 1000).toISOString() : null;
      const daysRemaining = expiresAtIso === null ? null : Math.max(0, Math.ceil((expirySeconds * 1000 - now) / DAY_MS));
      const badgeText =
        daysRemaining === null
          ? `🧠 ${pick(locale, "Pro activo", "Pro active", "Pro ativo")} · ${tier}`
          : `🧠 ${pick(locale, "Pro activo", "Pro active", "Pro ativo")} · ${tier} · ${daysRemaining} ${pick(
              locale,
              "días",
              "days",
              "dias",
            )}`;
      return { active: true, isCreator, tier, badgeText, daysRemaining, expiresAtIso };
    }
  }

  if (isCreator) {
    return {
      active: true,
      isCreator: true,
      tier: "CREATOR",
      badgeText: `👑 ${pick(locale, "Creator APK · Pro activo", "Creator APK · Pro active", "Creator APK · Pro ativo")}`,
      daysRemaining: null,
      expiresAtIso: null,
    };
  }

  return {
    active: false,
    isCreator: false,
    tier: "SIMPLE",
    badgeText: `🔒 ${pick(locale, "Modo Simple · 61 motores bloqueados", "Simple Mode · 61 engines locked", "Modo Simples · 61 motores bloqueados")}`,
    daysRemaining: null,
    expiresAtIso: null,
  };
}
