// Zustand der Ansicht Vergleich je Blatt: die Gegenseite (offenes Dokument, Ablage, früherer Stand oder Datei), ob die
// Seiten getauscht sind, Optionen des Abgleichs, aufgeklappte Falten und der gewählte Unterschied. Der Vergleich wird je
// Analyse, Gegentext und Optionen gemerkt.

import type { Analyse } from "../../../kern";
import { erkennen } from "../../../formate/registrierung";
import { wertAus } from "../../../analyse/wert";
import { vergleichen, type Vergleich, type Vergleichsoptionen } from "../../../analyse/vergleich/vergleichen";
import { ablageverwaltung } from "../../../zustand/ablageverwaltung.svelte";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";

export type Gegenseite =
  | { readonly art: "dokument"; readonly kennung: string; readonly name: string }
  | { readonly art: "stand"; readonly zeiger: number; readonly name: string }
  | { readonly art: "datei"; readonly name: string };

export interface Seite {
  readonly name: string;
  readonly neben: string;
}

export class VergleichZustand {
  gegenseite = $state<Gegenseite | null>(null);
  /** Text der Gegenseite (beim Wählen geladen; beim Stand jedes Mal frisch aus dem Verlauf) */
  gegenText = $state.raw<string | null>(null);
  ladefehler = $state<string | null>(null);
  /** Getauscht: das Blatt ist Vorher, die Gegenseite Jetzt */
  getauscht = $state(false);
  optionen = $state<Vergleichsoptionen>({ schluessel: true, reihenfolgeEgal: false, felder: {} });
  offen = $state.raw<ReadonlySet<string>>(new Set());
  /** Pfad des gewählten Unterschieds */
  gewaehlt = $state<string | null>(null);
  private merk: { analyse: Analyse; gegen: string; schluessel: string; vergleich: Vergleich | null; fehler: string | null } | null = null;

  /** Ein Dokument als Gegenseite; ist es offen, gilt sein aktueller Text, sonst der abgelegte */
  async dokumentWaehlen(kennung: string, name: string, offenerText?: string): Promise<void> {
    const t = offenerText !== undefined ? { text: offenerText } : await ablageverwaltung.textVon(kennung);
    this.gegenseite = { art: "dokument", kennung, name };
    this.gegenText = t?.text ?? null;
    this.ladefehler = t ? null : `${name} gibt es in der Ablage nicht mehr`;
    this.zuruecksetzen();
  }

  standWaehlen(blatt: Arbeitsblatt, zeiger: number): void {
    this.gegenseite = { art: "stand", zeiger, name: `${blatt.name}, Stand ${zeiger}` };
    this.gegenText = null;
    this.ladefehler = null;
    this.zuruecksetzen();
  }

  dateiWaehlen(name: string, text: string): void {
    this.gegenseite = { art: "datei", name };
    this.gegenText = text;
    this.ladefehler = null;
    this.zuruecksetzen();
  }

  private zuruecksetzen(): void {
    this.offen = new Set();
    this.gewaehlt = null;
  }

  umschalten(id: string): void {
    const neu = new Set(this.offen);
    if (neu.has(id)) neu.delete(id);
    else neu.add(id);
    this.offen = neu;
  }

  setzen<K extends keyof Vergleichsoptionen>(option: K, wert: Vergleichsoptionen[K]): void {
    this.optionen = { ...this.optionen, [option]: wert };
  }

  /** Text der Gegenseite zum aktuellen Stand */
  private gegentext(blatt: Arbeitsblatt): string | null {
    const g = this.gegenseite;
    if (g?.art === "stand") return blatt.sitzung.textBei(g.zeiger);
    return this.gegenText;
  }

  /** Vergleich zwischen Gegenseite und Blatt (in der gewählten Richtung); null ohne Gegenseite oder Analyse */
  vergleich(blatt: Arbeitsblatt): { vergleich: Vergleich | null; fehler: string | null } {
    const a = blatt.analyse;
    const gegen = this.gegentext(blatt);
    if (!a?.index || gegen === null || !this.gegenseite) return { vergleich: null, fehler: this.ladefehler };
    const schluessel = `${this.getauscht} ${JSON.stringify(this.optionen)}`;
    const m = this.merk;
    if (m && m.analyse === a && m.gegen === gegen && m.schluessel === schluessel) return m;
    const f = erkennen(gegen, this.gegenseite.name);
    const r = f.lesen(gegen);
    let ergebnis: { vergleich: Vergleich | null; fehler: string | null };
    if (!r.index) ergebnis = { vergleich: null, fehler: `${this.gegenseite.name} lässt sich nicht lesen (${f.name})` };
    else {
      const blattWert = wertAus(a.index, blatt.analyseText);
      const gegenWert = wertAus(r.index, gegen);
      ergebnis = { vergleich: this.getauscht ? vergleichen(blattWert, gegenWert, this.optionen) : vergleichen(gegenWert, blattWert, this.optionen), fehler: null };
    }
    this.merk = { analyse: a, gegen, schluessel, ...ergebnis };
    return ergebnis;
  }

  /** Name und Nebeninfo beider Seiten in der Reihenfolge Vorher, Jetzt */
  seiten(blatt: Arbeitsblatt): [Seite, Seite] {
    const gegen: Seite = { name: this.gegenseite?.name ?? "", neben: this.gegenseite?.art === "stand" ? "aus dem Verlauf" : this.gegenseite?.art === "datei" ? "Datei, nicht abgelegt" : "aus der Ablage" };
    const ich: Seite = { name: blatt.name, neben: `Stand ${blatt.verlauf.zeiger}` };
    return this.getauscht ? [ich, gegen] : [gegen, ich];
  }
}

export const vergleichZustand = (blatt: Arbeitsblatt): VergleichZustand => blatt.zustandFuer("vergleich", () => new VergleichZustand());
