// Anzeige je Gerät: Thema, Schriftstufe und ob die linke Leiste eingeklappt ist (localStorage), wirkt über data-theme,
// data-schrift und data-leiste am html.

export type Thema = "mittelton" | "dunkel";
export type Schriftstufe = "klein" | "mittel" | "gross";
/** Linke Leiste: breit mit Namen oder eingeklappt nur mit Symbolen (STB-63) */
export type Leistenform = "breit" | "schmal";

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

interface Anzeige {
  thema: Thema;
  schrift: Schriftstufe;
  leiste: Leistenform;
}

const VORGABE: Anzeige = { thema: "mittelton", schrift: "mittel", leiste: "breit" };

function gelesen(): Anzeige {
  try {
    const roh = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? "{}") as Partial<Anzeige>;
    return {
      thema: THEMEN.some((t) => t.kennung === roh.thema) ? roh.thema! : VORGABE.thema,
      schrift: SCHRIFTSTUFEN.some((s) => s.kennung === roh.schrift) ? roh.schrift! : VORGABE.schrift,
      leiste: roh.leiste === "schmal" ? "schmal" : VORGABE.leiste,
    };
  } catch {
    return { ...VORGABE };
  }
}

class Einstellungen {
  thema = $state<Thema>("mittelton");
  schrift = $state<Schriftstufe>("mittel");
  leiste = $state<Leistenform>("breit");

  constructor() {
    const g = gelesen();
    this.thema = g.thema;
    this.schrift = g.schrift;
    this.leiste = g.leiste;
    this.anwenden();
  }

  setzen(teil: Partial<Anzeige>): void {
    if (teil.thema) this.thema = teil.thema;
    if (teil.schrift) this.schrift = teil.schrift;
    if (teil.leiste) this.leiste = teil.leiste;
    this.anwenden();
    try {
      localStorage.setItem(SCHLUESSEL, JSON.stringify({ thema: this.thema, schrift: this.schrift, leiste: this.leiste }));
    } catch {
      // Speicher gesperrt (privates Fenster): gilt dann nur bis zum Neuladen
    }
  }

  private anwenden(): void {
    document.documentElement.dataset.theme = this.thema;
    document.documentElement.dataset.schrift = this.schrift;
    document.documentElement.dataset.leiste = this.leiste;
  }

  leisteUmschalten(): void {
    this.setzen({ leiste: this.leiste === "schmal" ? "breit" : "schmal" });
  }
}

export const einstellungen = new Einstellungen();
