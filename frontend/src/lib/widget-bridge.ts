import { readLiveScoreboard } from "@/lib/court-ux";
import { loadFlowRoster } from "@/lib/season-vault";

interface WidgetBridge {
  updateWidgetSnapshot?: (matchTitle: string, scoreLine: string, nextMatchInfo: string) => void;
}

/**
 * Pushes the live match + scheduled-game snapshot to the pure-SDK Android
 * home screen widget. On web builds the bridge is absent and this is a no-op.
 */
export function syncWidgetSnapshot(): void {
  try {
    const bridge = (window as Window & { VoleyOSBridge?: WidgetBridge }).VoleyOSBridge;
    if (!bridge?.updateWidgetSnapshot) return;
    const score = readLiveScoreboard();
    const roster = loadFlowRoster();
    const title = score ? `🏐 ${score.teamA} vs ${score.teamB}` : "🏐 VoleyOS — Listo para jugar";
    const line = score
      ? `${score.scoreA} - ${score.scoreB} · Sets ${score.setsA}-${score.setsB}`
      : "0 - 0 · Tocá para abrir Marcador";
    const next =
      roster && roster.time && roster.time !== "—"
        ? `📋 Hoy ${roster.time} · ${roster.venue}`
        : "📋 Sin turno agendado";
    bridge.updateWidgetSnapshot(title, line, next);
  } catch {
    /* no bridge outside the APK */
  }
}
