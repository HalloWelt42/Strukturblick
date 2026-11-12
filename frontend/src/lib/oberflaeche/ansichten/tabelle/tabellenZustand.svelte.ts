// Zustand der Tabelle je Arbeitsblatt (blatt.zustandFuer("tabelle", ...)): Filter, Sortierung, Spaltenbreiten,
// Rollstand, gezeigte Liste, laufende Bearbeitung und die eben geänderte Zelle. Kein Entwurf: Werte stehen nur im
// Text des Blatts; hier liegt allein, wie die Tabelle ihn zeigt.

import type { Sortierung } from "../../../analyse/tabelle";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
import type { Adressierbar, Werte } from "../../../zustand/adresse";

export interface Bearbeitung {
  readonly zeiger: string;
  /** Inhalt beim Beginn; das Feld zeigt ihn markiert, Tippen ersetzt ihn */
  readonly anfang: string;
  /** Art des alten Werts (für die Typregel beim Übernehmen) */
  readonly art: number;
}

export interface Geaendert {
  readonly zeiger: string;
  readonly vorher: string;
}

/** Wie lange eine eben geänderte Zelle markiert bleibt */
const MARKIERT_MS = 2500;

export class TabellenZustand implements Adressierbar {
  filter = $state("");
  sortierung = $state<Sortierung | null>(null);
  /** Breite je Spalte in px, Schlüssel aus Liste und Spalte (siehe breitenSchluessel) */
  breiten = $state<Record<string, number>>({});
  rollOben = $state(0);
  rollLinks = $state(0);
  /** Zeiger der zuletzt gezeigten Liste; ein Klick in die Tabelle soll nie in eine verschachtelte Liste springen */
  liste = $state<string | null>(null);
  /** Zeiger, den ein Klick auf einen Spaltenkopf gewählt hat; solange er gewählt ist, gilt die Spalte als gewählt */
  spaltenwahl = $state<string | null>(null);
  bearbeitung = $state<Bearbeitung | null>(null);
  geaendert = $state<Geaendert | null>(null);

  private markiertZeit: ReturnType<typeof setTimeout> | null = null;

  /** Sortierung dreistufig: auf, ab, aus */
  sortierungWeiter(spalte: string, selbst: boolean): void {
    const s = this.sortierung;
    if (!s || s.spalte !== spalte || s.selbst !== selbst) this.sortierung = { spalte, selbst, richtung: "auf" };
    else if (s.richtung === "auf") this.sortierung = { spalte, selbst, richtung: "ab" };
    else this.sortierung = null;
  }

  markieren(g: Geaendert): void {
    if (this.markiertZeit) clearTimeout(this.markiertZeit);
    this.geaendert = g;
    this.markiertZeit = setTimeout(() => {
      this.geaendert = null;
      this.markiertZeit = null;
    }, MARKIERT_MS);
  }

  adresseWerte(): Werte {
    return this.liste !== null ? { liste: this.liste } : {};
  }

  adresseUebernehmen(w: Werte): void {
    this.liste = w.liste ?? null;
  }
}

export const breitenSchluessel = (listeZeiger: string, spalte: string, selbst: boolean): string => `${listeZeiger}\u0000${selbst ? "" : "/"}${spalte}`;

export const tabellenZustand = (blatt: Arbeitsblatt): TabellenZustand => blatt.zustandFuer("tabelle", () => new TabellenZustand());
