// Abfragen-Verlauf je Gerät (localStorage): Ausdrücke, die zu einem Ergebnis geführt haben, jüngste zuerst, je Ausdruck
// einmal. Gemerkt wird beim Übernehmen (neues Dokument) und auf Wunsch ("In den Verlauf").

import type { SprachKennung } from "../kern/abfrage";

export interface Gemerkt {
  readonly sprache: SprachKennung;
  readonly ausdruck: string;
  readonly zeit: string;
}

const SCHLUESSEL = "strukturblick-abfragen";
const HOECHSTENS = 40;

function gelesen(): Gemerkt[] {
  try {
    const roh: unknown = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? "[]");
    return Array.isArray(roh) ? (roh.filter((g) => g && typeof g.ausdruck === "string" && typeof g.sprache === "string") as Gemerkt[]) : [];
  } catch {
    return [];
  }
}

class Abfrageverlauf {
  liste = $state.raw<Gemerkt[]>(gelesen());

  merken(sprache: SprachKennung, ausdruck: string): void {
    const a = ausdruck.trim();
    if (!a) return;
    this.liste = [{ sprache, ausdruck: a, zeit: new Date().toISOString() }, ...this.liste.filter((g) => !(g.sprache === sprache && g.ausdruck === a))].slice(0, HOECHSTENS);
    try {
      localStorage.setItem(SCHLUESSEL, JSON.stringify(this.liste));
    } catch {
      // Speicher gesperrt (privates Fenster): gilt dann nur bis zum Neuladen
    }
  }

  entfernen(g: Gemerkt): void {
    this.liste = this.liste.filter((x) => x !== g);
    try {
      localStorage.setItem(SCHLUESSEL, JSON.stringify(this.liste));
    } catch {
      // wie oben
    }
  }
}

export const abfrageverlauf = new Abfrageverlauf();
