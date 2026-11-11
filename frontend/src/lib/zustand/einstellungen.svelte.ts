// Anzeige je Gerät: Thema und Schriftstufe (localStorage), wirkt über data-theme und data-schrift am html.

export type Thema = "mittelton" | "dunkel";
export type Schriftstufe = "klein" | "mittel" | "gross";

export const THEMEN: readonly { kennung: Thema; name: string }[] = [
  { kennung: "mittelton", name: "Mittelton" },
  { kennung: "dunkel", name: "Dunkel" },
];
export const SCHRIFTSTUFEN: readonly { kennung: Schriftstufe; name: string; px: number }[] = [
  { kennung: "klein", name: "Klein", px: 16 },
  { kennung: "mittel", name: "Mittel", px: 17 },
  { kennung: "gross", name: "Groß", px: 18 },
];

const SCHLUESSEL = "strukturblick-anzeige";

function gelesen(): { thema: Thema; schrift: Schriftstufe } {
  try {
    const roh = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? "{}") as Partial<{ thema: Thema; schrift: Schriftstufe }>;
    return {
      thema: THEMEN.some((t) => t.kennung === roh.thema) ? roh.thema! : "mittelton",
      schrift: SCHRIFTSTUFEN.some((s) => s.kennung === roh.schrift) ? roh.schrift! : "mittel",
    };
  } catch {
    return { thema: "mittelton", schrift: "mittel" };
  }
}

class Einstellungen {
  thema = $state<Thema>("mittelton");
  schrift = $state<Schriftstufe>("mittel");

  constructor() {
    const g = gelesen();
    this.thema = g.thema;
    this.schrift = g.schrift;
    this.anwenden();
  }

  setzen(teil: Partial<{ thema: Thema; schrift: Schriftstufe }>): void {
    if (teil.thema) this.thema = teil.thema;
    if (teil.schrift) this.schrift = teil.schrift;
    this.anwenden();
    try {
      localStorage.setItem(SCHLUESSEL, JSON.stringify({ thema: this.thema, schrift: this.schrift }));
    } catch {
      // Speicher gesperrt (privates Fenster): gilt dann nur bis zum Neuladen
    }
  }

  private anwenden(): void {
    document.documentElement.dataset.theme = this.thema;
    document.documentElement.dataset.schrift = this.schrift;
  }
}

export const einstellungen = new Einstellungen();
