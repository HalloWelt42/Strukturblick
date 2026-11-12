// "Zuletzt gefragt" (STB-60): die letzten Fragen an die KI mit Dokument, Zeit, Aufgabe und Sprache, je Gerät im
// Browser. Ein Klick stellt Aufgabe, Sprache und Frage wieder ein; gefragt wird erst auf Knopfdruck.

import type { KiAufgabe, KiSprache } from "../../../analyse/ki/aufgaben";

const SCHLUESSEL = "strukturblick_ki_verlauf";
const HOECHSTENS = 8;

export interface Gefragt {
  readonly frage: string;
  readonly aufgabe: KiAufgabe;
  readonly sprache: KiSprache | null;
  readonly dokument: string;
  /** ISO-Zeit */
  readonly wann: string;
}

function gelesen(): Gefragt[] {
  try {
    const roh = JSON.parse(localStorage.getItem(SCHLUESSEL) ?? "[]") as unknown;
    return Array.isArray(roh) ? (roh.filter((g) => typeof g?.frage === "string" && typeof g?.aufgabe === "string") as Gefragt[]).slice(0, HOECHSTENS) : [];
  } catch {
    return [];
  }
}

class KiVerlauf {
  liste = $state.raw<readonly Gefragt[]>(gelesen());

  merken(g: Omit<Gefragt, "wann">): void {
    const neu = { ...g, wann: new Date().toISOString() };
    this.liste = [neu, ...this.liste.filter((x) => x.frage !== g.frage || x.aufgabe !== g.aufgabe || x.dokument !== g.dokument)].slice(0, HOECHSTENS);
    try {
      localStorage.setItem(SCHLUESSEL, JSON.stringify(this.liste));
    } catch {
      // Speicher gesperrt (privates Fenster): gilt dann nur bis zum Neuladen
    }
  }
}

export const kiVerlauf = new KiVerlauf();
