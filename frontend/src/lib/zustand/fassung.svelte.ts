// Neue Fassung (STB-61): nie mitten in der Arbeit von selbst neu laden, sonst bricht ein Neuladen Vorgänge ab und nimmt
// Ungespeichertes mit. Nur in den ersten Sekunden nach dem Start (noch nichts getan) lädt die Seite wie bisher von
// selbst; danach fragt ein Band, ob jetzt neu geladen wird. "Später" blendet es für diese Fassung aus, der Fuß zeigt sie
// weiter an. Neu laden legt vorher alles ab. Woher die Fassung kommt (Server oder Startseite), weiß die Bauart.

import { arbeitsplatz } from "./arbeitsplatz.svelte";
import { istNeuer } from "../kern/fassung";
import { FASSUNG } from "../dienste/bauart";

/** So lange nach dem Laden gilt die Seite als "eben gestartet" und darf von selbst neu laden */
export const START_FENSTER_MS = 10_000;

export interface Fassungsquelle {
  /** Die neuere Fassung, die die Bauart gefunden hat; null, solange es keine gibt */
  neu(): string | null;
  /** Lädt die Seite mit der neuen Fassung */
  laden(): void;
}

class Fassungsstand {
  /** Für diese Fassung hat der Mensch "Später" gewählt */
  spaeter = $state<string | null>(null);
  laedt = $state(false);
  /** Reaktiv, weil die Bauart erst nach dem ersten Zeichnen verbunden wird */
  private quelle = $state.raw<Fassungsquelle | null>(null);

  verbinden(q: Fassungsquelle): void {
    this.quelle = q;
  }

  /** Nur eine wirklich neuere Fassung; meldet der Server eine ältere (beim Entwickeln), gibt es nichts zu laden */
  get neu(): string | null {
    const n = this.quelle?.neu() ?? null;
    return n !== null && istNeuer(n, FASSUNG) ? n : null;
  }

  /** Das Band fragt, solange es eine neue Fassung gibt und sie nicht auf später gelegt ist */
  get fragen(): boolean {
    return this.neu !== null && this.neu !== this.spaeter;
  }

  verschieben(): void {
    this.spaeter = this.neu;
  }

  async neuLaden(): Promise<void> {
    if (!this.quelle || this.laedt) return;
    this.laedt = true;
    await arbeitsplatz.allesSpeichern();
    this.quelle.laden();
  }
}

export const fassungsstand = new Fassungsstand();

/** Darf die Seite jetzt von selbst neu laden? Nur kurz nach dem Start und wenn alles abgelegt ist. */
export const vonSelbstErlaubt = (): boolean => performance.now() < START_FENSTER_MS && arbeitsplatz.blaetter.every((b) => b.gespeichert);
