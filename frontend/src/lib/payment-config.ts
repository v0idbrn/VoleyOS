/**
 * VoleyOS v9 payment & contact endpoints plus the multi-currency pricing
 * matrix for device-bound VOS-PRO licences.
 *
 * No telemetry, no third-party SDKs: these are plain links the user taps.
 */

export const WHATSAPP_NUMBER = "+5493874661269";
export const WHATSAPP_URL = "https://wa.me/5493874661269";
export const MP_ALIAS = "unfrgvnn.dead";
export const KOFI_URL = "https://ko-fi.com/unfrgvnn";

export type Currency = "ARS" | "USD" | "EUR" | "BRL";
export type LicenseTier = "PLAYER" | "CLUB" | "TOURNAMENT";
export type LicenseDuration = "7d" | "30d" | "1y" | "LIFE";

export const CURRENCIES: Currency[] = ["ARS", "USD", "EUR", "BRL"];
export const TIERS: LicenseTier[] = ["PLAYER", "CLUB", "TOURNAMENT"];
export const DURATIONS: LicenseDuration[] = ["7d", "30d", "1y", "LIFE"];

/** Display prices per tier, duration and currency. */
export const PRICING: Record<LicenseTier, Record<LicenseDuration, Record<Currency, string>>> = {
  PLAYER: {
    "7d": { ARS: "$2.500", USD: "$2.99", EUR: "€2.99", BRL: "R$ 14,90" },
    "30d": { ARS: "$4.500", USD: "$4.99", EUR: "€4.99", BRL: "R$ 24,90" },
    "1y": { ARS: "$12.000", USD: "$11.99", EUR: "€11.99", BRL: "R$ 59,90" },
    LIFE: { ARS: "$20.000", USD: "$19.99", EUR: "€19.99", BRL: "R$ 99,90" },
  },
  CLUB: {
    "7d": { ARS: "$4.500", USD: "$4.99", EUR: "€4.99", BRL: "R$ 24,90" },
    "30d": { ARS: "$8.500", USD: "$8.99", EUR: "€8.99", BRL: "R$ 44,90" },
    "1y": { ARS: "$24.000", USD: "$24.99", EUR: "€24.99", BRL: "R$ 119,90" },
    LIFE: { ARS: "$42.000", USD: "$39.99", EUR: "€39.99", BRL: "R$ 199,90" },
  },
  TOURNAMENT: {
    "7d": { ARS: "$9.000", USD: "$9.99", EUR: "€9.99", BRL: "R$ 49,90" },
    "30d": { ARS: "$16.000", USD: "$16.99", EUR: "€16.99", BRL: "R$ 84,90" },
    "1y": { ARS: "$40.000", USD: "$39.99", EUR: "€39.99", BRL: "R$ 199,90" },
    LIFE: { ARS: "$68.000", USD: "$69.99", EUR: "€69.99", BRL: "R$ 349,90" },
  },
};

export function priceFor(tier: LicenseTier, duration: LicenseDuration, currency: Currency): string {
  return PRICING[tier][duration][currency];
}

/** Expiry stamp for a licence: YYYYMMDD (UTC) or LIFE. */
export function expiryForDuration(duration: LicenseDuration, now: Date = new Date()): string {
  if (duration === "LIFE") return "LIFE";
  const days = duration === "7d" ? 7 : duration === "30d" ? 30 : 365;
  const expiry = new Date(now.getTime() + days * 86_400_000);
  const yyyy = expiry.getUTCFullYear();
  const mm = String(expiry.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(expiry.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/** Pre-filled WhatsApp message with the buyer's device id and chosen plan. */
export function waReceiptUrl(params: {
  deviceId: string;
  tier: LicenseTier;
  duration: LicenseDuration;
  currency: Currency;
}): string {
  const text = [
    "📋 Solicitud de activación VOS-PRO — VolleyOS",
    `Plan: ${params.tier} · ${params.duration}`,
    `Precio: ${priceFor(params.tier, params.duration, params.currency)} ${params.currency}`,
    `Mi Device ID: ${params.deviceId}`,
    "Comprobante: (adjunto)",
  ].join("\n");
  return `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;
}
