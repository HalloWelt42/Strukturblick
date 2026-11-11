// Rezepte (STB-7) für die Oberfläche: Liste aus der Ablage, Wahl und Modus des Werkzeugs, Bearbeiten, Anlegen aus dem
// Verlauf eines Dokuments und Übernehmen eines Laufs (als neues Dokument oder als ein Vorgang im Dokument). Geplant
// und ausgeführt wird in analyse/rezepte; hier entsteht nur, was gespeichert und geöffnet wird.

import { REZEPTSCHRITT, schrittTitel, type Rezept, type Rezeptschritt } from "../analyse/rezepte/rezept";
import { rezeptTabelle } from "../analyse/rezepte/planen";
import type { Behalten } from "../analyse/duplikate";
import type { Lauf } from "../analyse/rezepte/ausfuehren";
import { Ablagefehler } from "../dienste/ablage";
import type { Arbeitsblatt } from "./arbeitsblatt.svelte";
import { arbeitsplatz } from "./arbeitsplatz.svelte";
import { meldungen } from "./meldungen.svelte";

export type Rezeptmodus = "ansehen" | "neu" | "anwenden";

/** Ein Vorgang im Verlauf, der einen Rezeptschritt mitbringt */
export interface Verlaufsschritt {
  /** Stelle im Verlauf (ab 1, wie der Verlauf sie zeigt) */
  readonly nr: number;
  readonly titel: string;
  readonly schritt: Rezeptschritt;
}

/** So viele Einträge "Zuletzt angewendet" behält ein Rezept */
const ZULETZT = 10;
const neueKennung = (): string => globalThis.crypto.randomUUID();
const jetzt = (): string => new Date().toISOString();

async function mitMeldung(arbeit: () => Promise<void>): Promise<boolean> {
  try {
    await arbeit();
    return true;
  } catch (f) {
    meldungen.zeigen({ text: f instanceof Ablagefehler ? f.message : `Die Ablage antwortet nicht wie erwartet: ${(f as Error).message}`, art: "fehler" });
    return false;
  }
}

class Rezepte {
  liste = $state.raw<Rezept[]>([]);
  geladen = $state(false);
  gewaehlt = $state<string | null>(null);
  modus = $state<Rezeptmodus>("ansehen");
  readonly aktuell = $derived(this.liste.find((r) => r.kennung === this.gewaehlt) ?? this.liste[0] ?? null);

  async laden(): Promise<void> {
    await mitMeldung(async () => {
      this.liste = await arbeitsplatz.ablage.rezepte();
    });
    this.geladen = true;
  }

  /** Beim ersten Bedarf laden (Leiste, Werkzeug) */
  sicherGeladen(): void {
    if (!this.geladen) void this.laden();
  }

  /** Werkzeug Rezepte auf einem Blatt öffnen, wahlweise mit Rezept und Modus */
  oeffnen(blatt: Arbeitsblatt, kennung: string | null = null, modus: Rezeptmodus = "ansehen"): void {
    if (kennung !== null) this.gewaehlt = kennung;
    this.modus = modus;
    blatt.zeigen({ art: "werkzeug", kennung: "rezepte" });
  }

  private async ablegen(r: Rezept, meldung?: string): Promise<boolean> {
    const neu = { ...r, geaendert: jetzt() };
    const ok = await mitMeldung(() => arbeitsplatz.ablage.rezeptSpeichern(neu));
    if (ok) {
      this.liste = [neu, ...this.liste.filter((x) => x.kennung !== r.kennung)];
      if (meldung) meldungen.zeigen({ text: meldung, art: "erfolg" });
    }
    return ok;
  }

  async umbenennen(r: Rezept, name: string): Promise<void> {
    const n = name.trim();
    if (!n || n === r.name) return;
    await this.ablegen({ ...r, name: n.slice(0, 120) });
  }

  async schrittAendern(r: Rezept, i: number, teil: Partial<Pick<Rezeptschritt, "an">> & { unlesbar?: "lassen" | "leeren"; behalten?: Behalten }): Promise<void> {
    const schritte = r.schritte.map((s, j) => (j === i ? ({ ...s, ...teil } as Rezeptschritt) : s));
    await this.ablegen({ ...r, schritte });
  }

  async schrittVerschieben(r: Rezept, i: number, richtung: -1 | 1): Promise<void> {
    const j = i + richtung;
    if (j < 0 || j >= r.schritte.length) return;
    const schritte = [...r.schritte];
    [schritte[i], schritte[j]] = [schritte[j], schritte[i]];
    await this.ablegen({ ...r, schritte });
  }

  async schrittEntfernen(r: Rezept, i: number): Promise<void> {
    await this.ablegen({ ...r, schritte: r.schritte.filter((_, j) => j !== i) }, `Schritt "${schrittTitel(r.schritte[i])}" entfernt`);
  }

  /** Endgültig entfernen; die Meldung bietet Rückgängig (legt es wieder ab) */
  async entfernen(r: Rezept): Promise<void> {
    const ok = await mitMeldung(() => arbeitsplatz.ablage.rezeptEntfernen(r.kennung));
    if (!ok) return;
    this.liste = this.liste.filter((x) => x.kennung !== r.kennung);
    if (this.gewaehlt === r.kennung) this.gewaehlt = null;
    meldungen.zeigen({ text: `Rezept ${r.name} entfernt`, art: "erfolg", aktion: { titel: "Rückgängig", ausfuehren: () => void this.ablegen(r).then(() => (this.gewaehlt = r.kennung)) } });
  }

  /** Vorgänge im Verlauf des Blatts (nur angewendete), die einen Rezeptschritt mitbringen */
  verlaufsschritte(blatt: Arbeitsblatt): Verlaufsschritt[] {
    const v = blatt.verlauf;
    return v.eintraege.slice(0, v.zeiger).flatMap((e, i) => {
      const s = REZEPTSCHRITT.safeParse(e.aufruf.rezeptschritt);
      return e.aufruf.rezeptschritt !== undefined && s.success ? [{ nr: i + 1, titel: e.aufruf.titel, schritt: s.data }] : [];
    });
  }

  /** Neues Rezept aus gewählten Vorgängen des Verlaufs; die Spalten des Dokuments gelten als erwartet */
  async ausVerlauf(blatt: Arbeitsblatt, schritte: readonly Verlaufsschritt[], name: string): Promise<boolean> {
    const n = name.trim();
    if (!n || !schritte.length) return false;
    const index = blatt.analyse?.index;
    const t = index ? rezeptTabelle(index, blatt.analyseText) : null;
    const zeit = jetzt();
    const rezept: Rezept = {
      kennung: neueKennung(), name: n.slice(0, 120), schritte: schritte.map((s) => s.schritt),
      spalten: t ? t.spalten.map((s) => s.name) : [], quelle: blatt.name, angelegt: zeit, geaendert: zeit, zuletzt: [],
    };
    const ok = await this.ablegen(rezept, `Rezept ${rezept.name} mit ${schritte.length} ${schritte.length === 1 ? "Schritt" : "Schritten"} gespeichert`);
    if (ok) {
      this.gewaehlt = rezept.kennung;
      this.modus = "ansehen";
    }
    return ok;
  }

  /** Einen berechneten Lauf übernehmen: als neues Dokument (das Original bleibt) oder als ein Vorgang im Dokument */
  async uebernehmen(blatt: Arbeitsblatt, r: Rezept, lauf: Lauf, ziel: "neu" | "dokument", name: string): Promise<void> {
    let ergebnis: string;
    if (ziel === "neu") {
      const neu = await arbeitsplatz.neu(name.trim() || blatt.name, lauf.text, blatt.ordner);
      neu.zeigen({ art: "ansicht", kennung: "tabelle" });
      ergebnis = `als neues Dokument ${neu.name}`;
      meldungen.zeigen({ text: `Rezept ${r.name} angewendet: neues Dokument ${neu.name}`, art: "erfolg" });
    } else {
      const e = await blatt.ausfuehrenMitMeldung("text.ersetzen", { text: lauf.text, titel: `Rezept ${r.name} angewendet` }, { ort: "Rezepte" });
      if (!e.ok) return;
      ergebnis = "ins Dokument";
      this.modus = "ansehen";
    }
    const zuletzt = [{ zeit: jetzt(), dokument: blatt.name, ergebnis }, ...r.zuletzt].slice(0, ZULETZT);
    await this.ablegen({ ...r, zuletzt });
  }
}

export const rezepte = new Rezepte();
