// KI über die Leitstelle (STB-60): gibt es sie, ist sie an, welches Modell gilt. Nur in der Bauart mit Server; ohne
// Server (GitHub Pages) zeigt Strukturblick nichts von KI (nur zeigen, was geht). Der Stand kommt vom Server, der die
// Leitstelle fragt; Einstellungen gelten für alle Geräte.

import type { KiAuftrag, KiStand, KiVorschlag } from "../dienste/ki";
import { zugang } from "./zugang.svelte";

export type { KiAuftrag, KiModell, KiStand, KiVorschlag } from "../dienste/ki";

class Ki {
  stand = $state.raw<KiStand | null>(null);
  laedt = $state(false);
  /** Warum der Stand fehlt (Server antwortet nicht) */
  fehler = $state<string | null>(null);

  /** Mit Server und angemeldet: KI lässt sich überhaupt einrichten */
  get moeglich(): boolean {
    return zugang.teil !== null && zugang.stand === "bereit";
  }

  /** Das Werkzeug Mit KI erscheint: an und die Leitstelle eingerichtet */
  get verfuegbar(): boolean {
    return this.moeglich && !!this.stand?.an && this.stand.eingerichtet;
  }

  /** Lesbarer Name eines Modells aus dem Angebot der Leitstelle, sonst die Kennung */
  modellname(id: string): string {
    return this.stand?.modelle.find((m) => m.id === id || m.name === id)?.name ?? id;
  }

  async laden(): Promise<void> {
    const t = zugang.teil;
    if (!t || this.laedt) return;
    this.laedt = true;
    try {
      this.stand = await t.kiStand();
      this.fehler = null;
    } catch (f) {
      this.fehler = (f as Error).message;
    } finally {
      this.laedt = false;
    }
  }

  async einstellen(werte: { ki_an?: boolean; ki_modell?: string }): Promise<void> {
    const t = zugang.teil;
    if (!t) return;
    await t.kiEinstellen(werte);
    await this.laden();
  }

  async vorschlagen(auftrag: KiAuftrag, signal?: AbortSignal): Promise<KiVorschlag> {
    const t = zugang.teil;
    if (!t) throw new Error("KI gibt es nur mit Server");
    return t.kiVorschlag(auftrag, signal);
  }
}

export const ki = new Ki();
