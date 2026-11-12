// Zustand des Werkzeugs Testdaten je Blatt (entwuerfe/testdaten.html): Spezifikation (aus der Vorlage abgeleitet oder
// selbst geändert; ist das Dokument ein abgelegter Auftrag, gilt dessen), Anzahl, Startwert, Zielformat, gewähltes
// Feld und der Lauf. Erzeugt wird in Blöcken mit einer Pause dazwischen, damit die Anzeige mitläuft und Anhalten
// greift; angehalten lässt sich fortsetzen. Jede Änderung an Spezifikation oder Einstellungen verwirft den Lauf.

import type { Analyse } from "../../../kern";
import { KEIN } from "../../../kern/strukturindex";
import { listeFinden } from "../../../analyse/tabelle";
import { statistik, type Feld } from "../../../analyse/statistik";
import { ableiten, type Ableitung } from "../../../analyse/testdaten/ableiten";
import { ausgeben, ausText, TRENNZEICHEN, ZIELFORMATE, type Auftrag, type Zielformat } from "../../../analyse/testdaten/auftrag";
import { erzeuger, type Einstellungen, type Json } from "../../../analyse/testdaten/erzeuger";
import { elternVon, Erzeugung, type Feldspec, type Spezifikation } from "../../../analyse/testdaten/spezifikation";
import type { Trennzeichen } from "../../../analyse/konvertieren/tabellieren";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
import type { Adressierbar, Werte } from "../../../zustand/adresse";

const VORGABE_ANZAHL = 100;
const VORGABE_STARTWERT = 4711;
/** Höchstens so viele Datensätze auf einmal (darüber wird der Speicher des Browsers knapp) */
export const ANZAHL_HOECHSTENS = 1_000_000;
/** Blöcke: mindestens so groß, sonst so viele, dass es etwa zehn werden */
const BLOCK_MINDESTENS = 100;
const BLOCKE_ETWA = 10;
export const VORSCHAU_ZEILEN = 5;

export interface Lauf {
  readonly gesamt: number;
  readonly blockGroesse: number;
  erzeugt: number;
  laeuft: boolean;
  /** Vergangene Zeit in ms, für die Schätzung der Restzeit */
  dauer: number;
}

/** Wo die Vorlage herkommt: abgeleitet aus einer Liste der Daten oder ein abgelegter Auftrag */
export type Vorlage = { readonly art: "daten"; readonly ableitung: Ableitung; readonly felder: number } | { readonly art: "auftrag"; readonly auftrag: Auftrag };

export class TestdatenZustand implements Adressierbar {
  /** Eigene Spezifikation, sobald etwas geändert wurde; null: die der Vorlage */
  eigen = $state.raw<Spezifikation | null>(null);
  anzahl = $state(VORGABE_ANZAHL);
  startwert = $state(VORGABE_STARTWERT);
  ziel = $state<Zielformat>("json");
  trennzeichen = $state<Trennzeichen>(";");
  /** Name des Ergebnisses; leer: aus dem Dokumentnamen */
  name = $state("");
  /** Pfad des gewählten Felds */
  gewaehlt = $state<string | null>(null);
  lauf = $state<Lauf | null>(null);
  /** Die ersten Datensätze des Laufs (oder einer Probe) für die Vorschau */
  vorschau = $state.raw<readonly Json[]>([]);

  private daten: Json[] = [];
  private erzeugung: Erzeugung | null = null;
  private anhalten = false;
  private merk: { analyse: Analyse; vorlage: Vorlage | null } | null = null;
  private profilMerk: { analyse: Analyse; felder: ReadonlyMap<string, Feld> } | null = null;
  private zielUebernommen = false;

  /** Vorlage zum Lesestand: ein Auftragsdokument oder die Liste der Daten */
  vorlage(blatt: Arbeitsblatt): Vorlage | null {
    const a = blatt.analyse;
    if (!a?.index) return null;
    if (this.merk?.analyse === a) return this.merk.vorlage;
    const auftrag = ausText(blatt.analyseText);
    let vorlage: Vorlage | null = null;
    if (auftrag) vorlage = { art: "auftrag", auftrag };
    else {
      const basis = listeFinden(a.index, KEIN, KEIN);
      const ableitung = ableiten(a.index, blatt.analyseText, basis === KEIN ? 0 : basis);
      vorlage = { art: "daten", ableitung, felder: ableitung.spezifikation.felder.filter((f) => erzeuger(f.erzeuger).art === "wert").length };
    }
    this.merk = { analyse: a, vorlage };
    return vorlage;
  }

  /** Beim ersten Lesen: Zielformat und Trennzeichen wie die Vorlage (CSV bleibt CSV mit ihrem Trennzeichen). Ändert
   *  Zustand, darum aus einem Effekt der Ansicht, nie aus `vorlage` (das in abgeleiteten Werten läuft). */
  vorgabenUebernehmen(blatt: Arbeitsblatt, v: Vorlage | null): void {
    if (this.zielUebernommen || !v) return;
    this.zielUebernommen = true;
    if (v.art === "auftrag") {
      this.anzahl = v.auftrag.anzahl;
      this.startwert = v.auftrag.startwert;
      this.ziel = v.auftrag.ziel;
      this.trennzeichen = v.auftrag.trennzeichen;
      return;
    }
    const a = blatt.analyse;
    const passend = ZIELFORMATE.find((z) => z.kennung === a?.format.kennung);
    if (passend) this.ziel = passend.kennung;
    const t = TRENNZEICHEN.find((x) => x.wert === a?.merkmale.trennzeichen);
    if (t) this.trennzeichen = t.wert;
  }

  spezifikation(blatt: Arbeitsblatt): Spezifikation | null {
    if (this.eigen) return this.eigen;
    const v = this.vorlage(blatt);
    return v ? (v.art === "auftrag" ? v.auftrag.spezifikation : v.ableitung.spezifikation) : null;
  }

  /** Profil eines Felds in der Vorlage (Statistik), für den Inspektor */
  profil(blatt: Arbeitsblatt, pfad: string): Feld | null {
    const a = blatt.analyse;
    if (!a?.index || this.vorlage(blatt)?.art !== "daten") return null;
    if (this.profilMerk?.analyse !== a) {
      const basis = listeFinden(a.index, KEIN, KEIN);
      this.profilMerk = { analyse: a, felder: new Map(statistik(a.index, blatt.analyseText, basis === KEIN ? 0 : basis).felder.map((f) => [f.pfad, f])) };
    }
    return this.profilMerk.felder.get(pfad) ?? null;
  }

  // ----- Spezifikation ändern -----

  private aendern(blatt: Arbeitsblatt, f: (felder: Feldspec[]) => Feldspec[]): void {
    const s = this.spezifikation(blatt);
    if (!s) return;
    this.eigen = { felder: f([...s.felder]) };
    this.verwerfen();
  }

  feldAendern(blatt: Arbeitsblatt, pfad: string, neu: Partial<Feldspec>): void {
    this.aendern(blatt, (fs) => fs.map((f) => (f.pfad === pfad ? { ...f, ...neu } : f)));
  }

  einstellungSetzen(blatt: Arbeitsblatt, pfad: string, schluessel: string, wert: Einstellungen[string]): void {
    this.aendern(blatt, (fs) => fs.map((f) => (f.pfad === pfad ? { ...f, einstellungen: { ...f.einstellungen, [schluessel]: wert } } : f)));
  }

  /** Anderer Erzeuger: Einstellungen auf seine Vorgaben */
  erzeugerWechseln(blatt: Arbeitsblatt, pfad: string, kennung: string): void {
    this.feldAendern(blatt, pfad, { erzeuger: kennung, einstellungen: {} });
  }

  /** Neues Feld oben im Datensatz, mit freiem Namen */
  feldHinzufuegen(blatt: Arbeitsblatt): void {
    const da = new Set(this.spezifikation(blatt)?.felder.map((f) => f.pfad) ?? []);
    let n = 1;
    while (da.has(`feld${n}`)) n++;
    const pfad = `feld${n}`;
    this.aendern(blatt, (fs) => [...fs, { pfad, erzeuger: "text", einstellungen: {}, leer: { anteil: 0, als: "fehlt" } }]);
    this.gewaehlt = pfad;
  }

  /** Feld samt allem darunter entfernen */
  feldEntfernen(blatt: Arbeitsblatt, pfad: string): void {
    const unter = (p: string): boolean => p === pfad || (elternVon(p) !== null && unter(elternVon(p)!));
    this.aendern(blatt, (fs) => fs.filter((f) => !unter(f.pfad)));
    if (this.gewaehlt && unter(this.gewaehlt)) this.gewaehlt = null;
  }

  /** Feld umbenennen (nur der letzte Teil; Felder darunter ziehen mit) */
  feldUmbenennen(blatt: Arbeitsblatt, pfad: string, name: string): void {
    const n = name.trim().replace(/[.[\]]/g, "_");
    const e = elternVon(pfad);
    if (!n || e === null || pfad.endsWith("[]")) return;
    const neu = e === "" ? n : `${e}.${n}`;
    if (neu === pfad || this.spezifikation(blatt)?.felder.some((f) => f.pfad === neu)) return;
    this.aendern(blatt, (fs) => fs.map((f) => (f.pfad === pfad || f.pfad.startsWith(`${pfad}.`) || f.pfad.startsWith(`${pfad}[]`) ? { ...f, pfad: neu + f.pfad.slice(pfad.length) } : f)));
    if (this.gewaehlt === pfad) this.gewaehlt = neu;
  }

  zuruecksetzen(): void {
    this.eigen = null;
    this.verwerfen();
  }

  // ----- Lauf -----

  /** Lauf und Vorschau verwerfen (nach jeder Änderung an dem, was entsteht) */
  /** Eine ganze Spezifikation übernehmen (Vorschlag der KI); Rückgängig über Zurücksetzen */
  uebernehmen(s: Spezifikation): void {
    this.eigen = s;
    this.verwerfen();
  }

  verwerfen(): void {
    this.anhalten = true;
    this.lauf = null;
    this.daten = [];
    this.erzeugung = null;
    this.vorschau = [];
  }

  /** Vorschau ohne Lauf: die ersten Datensätze mit dem Startwert */
  probe(blatt: Arbeitsblatt): readonly Json[] {
    const s = this.spezifikation(blatt);
    return s ? new Erzeugung(s, this.startwert).naechste(VORSCHAU_ZEILEN) : [];
  }

  async starten(blatt: Arbeitsblatt): Promise<void> {
    const s = this.spezifikation(blatt);
    if (!s) return;
    const gesamt = Math.max(1, Math.min(ANZAHL_HOECHSTENS, Math.floor(this.anzahl) || 1));
    this.daten = [];
    this.erzeugung = new Erzeugung(s, this.startwert);
    this.lauf = { gesamt, blockGroesse: Math.max(BLOCK_MINDESTENS, Math.ceil(gesamt / BLOCKE_ETWA)), erzeugt: 0, laeuft: false, dauer: 0 };
    await this.weiter();
  }

  /** Läuft weiter, bis alles erzeugt ist oder Anhalten greift */
  async weiter(): Promise<void> {
    const l = this.lauf;
    const e = this.erzeugung;
    if (!l || !e || l.laeuft) return;
    this.anhalten = false;
    l.laeuft = true;
    while (l.erzeugt < l.gesamt && !this.anhalten) {
      const beginn = performance.now();
      const n = Math.min(l.blockGroesse, l.gesamt - l.erzeugt);
      for (const d of e.naechste(n)) this.daten.push(d);
      l.erzeugt += n;
      l.dauer += performance.now() - beginn;
      if (this.vorschau.length < VORSCHAU_ZEILEN) this.vorschau = this.daten.slice(0, VORSCHAU_ZEILEN);
      // Pause für die Anzeige und das Anhalten
      await new Promise((fertig) => setTimeout(fertig, 0));
    }
    if (this.lauf === l) l.laeuft = false;
  }

  halten(): void {
    this.anhalten = true;
  }

  /** Ergebnis im Zielformat (bei angehaltenem Lauf das bisher Erzeugte) */
  ergebnis(): string {
    return ausgeben(this.daten, this.ziel, this.trennzeichen);
  }

  /** Name des Ergebnisses mit Endung des Zielformats */
  dateiname(blatt: Arbeitsblatt): string {
    const endung = ZIELFORMATE.find((z) => z.kennung === this.ziel)?.endung ?? "json";
    const stamm = this.name.trim() || `${blatt.name.replace(/\.testdaten\.json$/, "").replace(/\.[^.]+$/, "")}-testdaten`;
    return `${stamm.replace(/\.[a-z]+$/i, "")}.${endung}`;
  }

  /** Auftrag zum Ablegen */
  auftrag(blatt: Arbeitsblatt): Auftrag | null {
    const s = this.spezifikation(blatt);
    return s ? { spezifikation: s, anzahl: this.anzahl, startwert: this.startwert, ziel: this.ziel, trennzeichen: this.trennzeichen } : null;
  }

  adresseWerte(): Werte {
    return {
      ...(this.anzahl !== VORGABE_ANZAHL ? { anzahl: String(this.anzahl) } : {}),
      ...(this.startwert !== VORGABE_STARTWERT ? { startwert: String(this.startwert) } : {}),
      ...(this.gewaehlt !== null ? { feld: this.gewaehlt } : {}),
      ziel: this.ziel,
    };
  }

  adresseUebernehmen(w: Werte): void {
    const anzahl = Number(w.anzahl);
    const start = Number(w.startwert);
    this.anzahl = Number.isInteger(anzahl) && anzahl > 0 ? Math.min(anzahl, ANZAHL_HOECHSTENS) : VORGABE_ANZAHL;
    this.startwert = Number.isInteger(start) ? start : VORGABE_STARTWERT;
    this.gewaehlt = w.feld ?? null;
    const ziel = ZIELFORMATE.find((z) => z.kennung === w.ziel);
    if (ziel) {
      this.ziel = ziel.kennung;
      this.zielUebernommen = true;
    }
  }
}

export const testdatenZustand = (blatt: Arbeitsblatt): TestdatenZustand => blatt.zustandFuer("testdaten", () => new TestdatenZustand());
