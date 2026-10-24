"use client";

import { useState } from "react";

import {
  CURRENCIES,
  DURATIONS,
  KOFI_URL,
  MP_ALIAS,
  TIERS,
  expiryForDuration,
  priceFor,
  waReceiptUrl,
  type Currency,
  type LicenseDuration,
} from "@/lib/payment-config";
import {
  getDeviceInstallId,
  signCustomerLicense,
  verifyCustomerLicense,
  type LicenseTier,
} from "@/lib/creator-unlock";
import type { Locale } from "@/lib/local-engines";

function t(locale: Locale, es: string, en: string, pt: string): string {
  return locale === "es" ? es : locale === "en" ? en : pt;
}

const BTN =
  "tap w-full rounded-lg px-3 py-2.5 text-[11px] font-black uppercase tracking-wider text-white";
const FIELD =
  "w-full rounded-lg border border-white/15 bg-obsidian px-3 py-2 text-sm text-white outline-none focus:border-volt";
const LEGEND = "text-[10px] font-black uppercase tracking-[0.18em] text-white/45";

interface MonetizationModalProps {
  locale: Locale;
  onClose: () => void;
  onActivated: (license: string) => void;
}

/** Multi-currency, multi-duration VOS-PRO activation with MP / Ko-fi / WhatsApp. */
export function MonetizationModal({ locale, onClose, onActivated }: MonetizationModalProps) {
  const [tier, setTier] = useState<LicenseTier>("PLAYER");
  const [duration, setDuration] = useState<LicenseDuration>("30d");
  const [currency, setCurrency] = useState<Currency>("ARS");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const deviceId = getDeviceInstallId();
  const price = priceFor(tier, duration, currency);

  const copyAlias = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(MP_ALIAS);
    } catch {
      /* clipboard blocked: the alias stays visible for manual copy */
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const activate = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    const check = await verifyCustomerLicense(code, { deviceId });
    if (!check.ok) {
      setStatus(
        check.reason === "device_mismatch"
          ? t(locale, "❌ Licencia de otro dispositivo", "❌ Licence from another device", "❌ Licença de outro dispositivo")
          : check.reason === "expired"
            ? t(locale, "❌ Licencia vencida", "❌ Licence expired", "❌ Licença expirada")
            : t(locale, "❌ Código inválido", "❌ Invalid code", "❌ Código inválido"),
      );
      return;
    }
    const trimmed = code.trim();
    onActivated(trimmed);
    setStatus(t(locale, "✅ Licencia activa", "✅ Licence active", "✅ Licença ativa"));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t(locale, "Activar VOS-PRO", "Activate VOS-PRO", "Ativar VOS-PRO")}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="vos-section-card w-full max-w-md rounded-2xl border border-white/15 bg-panel p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-crimson">VOS·PRO</p>
            <h3 className="text-lg font-black text-white">
              {t(locale, "Activación de licencia", "Licence activation", "Ativação de licença")}
            </h3>
            <p className="mt-0.5 text-[10px] text-white/45">
              {t(locale, "Bloqueada a este dispositivo", "Locked to this device", "Bloqueada neste dispositivo")} ·{" "}
              <span className="font-mono text-volt">{deviceId}</span>
            </p>
          </div>
          <button type="button" aria-label={t(locale, "Cerrar", "Close", "Fechar")} className="tap text-white/50" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="mt-4 grid gap-3">
          <div>
            <p className={LEGEND}>{t(locale, "Plan", "Tier", "Plano")}</p>
            <div className="mt-1 flex gap-1.5">
              {TIERS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={tier === value}
                  onClick={() => setTier(value)}
                  className={`tap flex-1 rounded-lg border px-2 py-2 text-[10px] font-black ${
                    tier === value ? "border-crimson bg-crimson/20 text-white" : "border-white/10 text-white/55"
                  }`}
                >
                  {value === "PLAYER" ? "🏐 " : value === "CLUB" ? "🛡️ " : "🏆 "}
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={LEGEND}>{t(locale, "Duración", "Duration", "Duração")}</p>
            <div className="mt-1 flex gap-1.5">
              {DURATIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={duration === value}
                  onClick={() => setDuration(value)}
                  className={`tap flex-1 rounded-lg border px-2 py-2 text-[10px] font-black ${
                    duration === value ? "border-volt bg-volt/15 text-volt" : "border-white/10 text-white/55"
                  }`}
                >
                  {value === "LIFE" ? t(locale, "Para siempre", "Lifetime", "Vitalício") : value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={LEGEND}>{t(locale, "Moneda", "Currency", "Moeda")}</p>
            <div className="mt-1 flex gap-1.5">
              {CURRENCIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={currency === value}
                  onClick={() => setCurrency(value)}
                  className={`tap flex-1 rounded-lg border px-2 py-2 text-[10px] font-black ${
                    currency === value ? "border-white/40 bg-white/10 text-white" : "border-white/10 text-white/55"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-volt/30 bg-volt/10 px-3 py-3 text-center">
            <p className="text-2xl font-black text-volt">{price}</p>
            <p className="text-[10px] uppercase tracking-widest text-white/50">
              {tier} · {duration === "LIFE" ? t(locale, "vitalicio", "lifetime", "vitalício") : duration} · {currency}
            </p>
          </div>

          <div className="grid gap-2">
            <button type="button" onClick={() => void copyAlias()} className={`${BTN} border border-white/15 bg-white/5`}>
              {copied
                ? t(locale, "✓ Alias copiado", "✓ Alias copied", "✓ Alias copiado")
                : t(locale, `📋 Copiar Alias MP: ${MP_ALIAS}`, `📋 Copy MP Alias: ${MP_ALIAS}`, `📋 Copiar Alias MP: ${MP_ALIAS}`)}
            </button>
            <a href={KOFI_URL} target="_blank" rel="noreferrer" className={`${BTN} bg-crimson text-center hover:bg-imperial`}>
              ☕ {t(locale, "Pagar con Ko-fi (USD/EUR/BRL/Tarjeta)", "Pay with Ko-fi (USD/EUR/BRL/Card)", "Pagar com Ko-fi (USD/EUR/BRL/Cartão)")}
            </a>
            <a
              href={waReceiptUrl({ deviceId, tier, duration, currency })}
              target="_blank"
              rel="noreferrer"
              className={`${BTN} border border-emerald/50 bg-emerald/10 text-emerald text-center`}
            >
              📲 {t(locale, "Enviar Comprobante + Mi ID por WhatsApp", "Send Receipt + My ID on WhatsApp", "Enviar Comprovante + Meu ID por WhatsApp")}
            </a>
          </div>

          <form onSubmit={(event) => void activate(event)} className="grid gap-2 border-t border-white/10 pt-3">
            <label className={LEGEND} htmlFor="vospro-code">
              {t(locale, "Recibí tu código VOS-PRO", "Paste your VOS-PRO code", "Cole seu código VOS-PRO")}
            </label>
            <input
              id="vospro-code"
              className={`${FIELD} font-mono text-[11px]`}
              placeholder="VOS-PRO.XXXX-XXXX.PLAYER.20270101.HOLDER.0123456789abcdef"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
            />
            <button type="submit" className={`${BTN} bg-volt text-obsidian`}>
              {t(locale, "Activar en este dispositivo", "Activate on this device", "Ativar neste dispositivo")}
            </button>
            {status ? <p className="text-center text-[11px] font-bold text-white/70">{status}</p> : null}
          </form>

          <p className="text-[9px] leading-relaxed text-white/35">
            {t(
              locale,
              "La licencia se firma con SHA-256 y queda ligada a este teléfono: no puede copiarse a otro. Sin telemetría.",
              "The licence is SHA-256 signed and bound to this phone: it cannot be copied elsewhere. No telemetry.",
              "A licença é assinada com SHA-256 e vinculada a este aparelho: não pode ser copiada. Sem telemetria.",
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

interface KeygenPanelProps {
  locale: Locale;
}

/** Creator-only console (visible only in Creator Mode) to issue licences. */
export function CreatorKeygenPanel({ locale }: KeygenPanelProps) {
  const [device, setDevice] = useState("");
  const [tier, setTier] = useState<LicenseTier>("PLAYER");
  const [duration, setDuration] = useState<LicenseDuration>("30d");
  const [holder, setHolder] = useState("");
  const [issued, setIssued] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generate = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setError(null);
    const code = await signCustomerLicense({
      deviceId: device,
      tier,
      expiry: expiryForDuration(duration),
      holder,
    });
    if (!code) {
      setError(
        t(
          locale,
          "Device ID inválido (XXXX-XXXX) o falta NEXT_PUBLIC_CREATOR_KEY_SHA256",
          "Invalid Device ID (XXXX-XXXX) or missing NEXT_PUBLIC_CREATOR_KEY_SHA256",
          "Device ID inválido (XXXX-XXXX) ou falta NEXT_PUBLIC_CREATOR_KEY_SHA256",
        ),
      );
      setIssued(null);
      return;
    }
    setIssued(code);
  };

  const copy = async (): Promise<void> => {
    if (!issued) return;
    try {
      await navigator.clipboard.writeText(issued);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the code stays visible for manual copy */
    }
  };

  return (
    <form onSubmit={(event) => void generate(event)} className="mt-3 grid gap-2 rounded-2xl border border-volt/30 bg-volt/5 p-3" data-testid="keygen">
      <p className={LEGEND}>🔐 {t(locale, "Consola Keygen (Solo Creador)", "Keygen Console (Creator only)", "Consolea Keygen (Só Criador)")}</p>
      <input
        className={`${FIELD} font-mono uppercase`}
        placeholder={t(locale, "Device ID del comprador (XXXX-XXXX)", "Buyer Device ID (XXXX-XXXX)", "Device ID do comprador (XXXX-XXXX)")}
        value={device}
        onChange={(event) => setDevice(event.target.value.toUpperCase())}
        autoComplete="off"
      />
      <input
        className={FIELD}
        placeholder={t(locale, "Nombre del comprador", "Buyer name", "Nome do comprador")}
        value={holder}
        onChange={(event) => setHolder(event.target.value)}
        autoComplete="off"
      />
      <div className="flex gap-1.5">
        <select className={FIELD} value={tier} onChange={(event) => setTier(event.target.value as LicenseTier)} aria-label="tier">
          {TIERS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select className={FIELD} value={duration} onChange={(event) => setDuration(event.target.value as LicenseDuration)} aria-label="duration">
          {DURATIONS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className={`${BTN} bg-volt text-obsidian`}>
        ⚡ {t(locale, "Generar código VOS-PRO", "Generate VOS-PRO code", "Gerar código VOS-PRO")}
      </button>
      {issued ? (
        <div className="grid gap-2">
          <p className="rounded-lg border border-white/10 bg-obsidian p-2 font-mono text-[10px] break-all text-emerald">{issued}</p>
          <button type="button" onClick={() => void copy()} className={`${BTN} border border-white/15 bg-white/5`}>
            {copied ? t(locale, "✓ Copiado", "✓ Copied", "✓ Copiado") : t(locale, "📋 Copiar código", "📋 Copy code", "📋 Copiar código")}
          </button>
        </div>
      ) : null}
      {error ? <p className="text-[10px] font-bold text-crimson">{error}</p> : null}
    </form>
  );
}
