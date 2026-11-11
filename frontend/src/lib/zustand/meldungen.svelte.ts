// Schwebende Meldung unten in der Mitte, auf Wunsch mit Aktion (Rückgängig). Eine Meldung zur Zeit; eine neue ersetzt
// die alte.

export interface Meldung {
  readonly text: string;
  readonly art: "erfolg" | "fehler" | "hinweis";
  readonly aktion?: { readonly titel: string; readonly ausfuehren: () => void };
}

const DAUER_MS: Record<Meldung["art"], number> = { erfolg: 6000, hinweis: 6000, fehler: 10000 };
/** Mit Aktion (Rückgängig) länger, damit man sie erreicht */
const DAUER_MIT_AKTION_MS = 12000;

class Meldungen {
  aktuell = $state<(Meldung & { readonly nummer: number }) | null>(null);
  private zaehler = 0;
  private zeit: ReturnType<typeof setTimeout> | null = null;

  zeigen(m: Meldung): void {
    if (this.zeit) clearTimeout(this.zeit);
    this.aktuell = { ...m, nummer: ++this.zaehler };
    this.zeit = setTimeout(() => this.schliessen(), m.aktion ? DAUER_MIT_AKTION_MS : DAUER_MS[m.art]);
  }

  schliessen(): void {
    if (this.zeit) clearTimeout(this.zeit);
    this.zeit = null;
    this.aktuell = null;
  }
}

export const meldungen = new Meldungen();
