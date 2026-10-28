/** Inventory consumer hooks — small helpers that let the app describe the
 *  consuemr's current order in a single line that travels into QR payloads and
 *  order previews in multiple languages.
 */

export interface InventoryHook {
  /** Short, per-hook machine id (e.g. 'live-room-host'). */
  id: string;
  /** Label rendered in the order preview. */
  label: string;
  /** What the hook adds to the order (e.g. 'default-host room CANCHA-ABCD'). */
  value: string;
}

/** All hooks loaded from the inventory once; public surface only for tests and
 *  the few screens that render a hook summary. */
export const INVENTORY_HOOKS: InventoryHook[] = [
  {
    id: "live-room-host",
    label: "Live-room default host",
    value: "default-host room CANCHA-ABCD",
  },
  {
    id: "supporter-seat-replacements",
    label: "Supporter seat replacements",
    value: "1 replacement seat credit",
  },
];

/** One-line summary of the current supporter discount tier for order previews. */
export function supporterDiscountLabel(
  lang: "es" | "en" | "pt",
  percent: number = 15,
): string {
  if (lang === "es") return `Descuento de ${percent}% por chip de patrocinador`;
  if (lang === "en") return `Supporter-chip discount of ${percent}%`;
  return `Desconto de ${percent}% pelo chip de patrocinador`;
}
