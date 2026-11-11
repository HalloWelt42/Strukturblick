// Zustand der Abfrage (Stufe 4): Konsole offen oder zu, Sprache, Ausdruck je Sprache, das letzte Ergebnis und das letzte
// gültige. Gerechnet wird kurz nach dem Tippen und neu, sobald sich ein Dokument ändert. Jedes Ergebnis trägt Dokument
// und Revision, aus denen es stammt; Treffer gelten nur für genau diesen Stand (Leitgedanke 3).

import { ABFRAGE_GRENZEN, sprache as spracheVon, type Abfrageausgang, type SprachKennung } from "../kern/abfrage";
import type { Suchoptionen } from "../analyse/abfrage/textsuche";
import { VORGABE_SUCHE } from "../analyse/abfrage/textsuche";
import { AUSGABEFORMATE, type Ausgabeformat } from "../analyse/ausgabe";
import { Abfragedienst, type Abfrageauftrag, type Dokumentstand } from "../dienste/abfrage/abfragedienst";
import type { Arbeitsblatt } from "./arbeitsblatt.svelte";
import { arbeitsplatz } from "./arbeitsplatz.svelte";
import { abfrageverlauf } from "./abfrageverlauf.svelte";
import { meldungen } from "./meldungen.svelte";

// Für die Oberfläche (Regel A1)
export { SPRACHEN, ABFRAGE_GRENZEN, type SprachKennung, type Werteergebnis, type Tabellenergebnis, type Tabellenuebersicht, type Zellwert } from "../kern/abfrage";
export type { Suchoptionen } from "../analyse/abfrage/textsuche";
export { abfrageverlauf, type Gemerkt } from "./abfrageverlauf.svelte";

export interface Bezug {
  readonly kennung: string;
  readonly revision: number;
}

export interface Abfragestand {
  readonly sprache: SprachKennung;
  readonly ausdruck: string;
  /** Dokument und Revision bei Sprachen über ein Dokument; null bei SQL */
  readonly ziel: Bezug | null;
  readonly ausgang: Abfrageausgang;
}

const LEER: Record<SprachKennung, string> = { jq: "", sql: "", jsonpath: "", suche: "" };

function stand(b: Arbeitsblatt): Dokumentstand | null {
  const a = b.analyse;
  if (!a?.index) return null;
  return { kennung: b.kennung, name: b.name, revision: a.revision, format: a.format.kennung, merkmale: a.merkmale, text: b.analyseText, index: a.index };
}

class Abfrage {
  offen = $state(false);
  sprache = $state<SprachKennung>("jq");
  ausdruecke = $state<Record<SprachKennung, string>>({ ...LEER });
  suche = $state<Suchoptionen>({ ...VORGABE_SUCHE });
  /** Letztes Ergebnis (auch ein Fehler) und letztes gültiges */
  letztes = $state.raw<Abfragestand | null>(null);
  gueltig = $state.raw<Abfragestand | null>(null);
  rechnet = $state(false);
  /** SQL-Ergebnis belegt die Ansicht */
  ergebnisZeigen = $state(false);
  /** Höhe der aufgeklappten Konsole in Pixeln (Ziehgriff); null: halbe Höhe wie im Entwurf */
  hoehe = $state<number | null>(null);

  private readonly dienst = new Abfragedienst();
  private zeit: ReturnType<typeof setTimeout> | null = null;

  get ausdruck(): string {
    return this.ausdruecke[this.sprache];
  }

  set ausdruck(a: string) {
    this.ausdruecke = { ...this.ausdruecke, [this.sprache]: a };
  }

  oeffnen(s: SprachKennung = this.sprache): void {
    this.sprache = s;
    this.offen = true;
  }

  schliessen(): void {
    this.offen = false;
    this.ergebnisZeigen = false;
  }

  /** Nach einer Änderung (Tippen, Sprache, Dokument): kurz warten, dann rechnen */
  planen(): void {
    if (this.zeit) clearTimeout(this.zeit);
    this.zeit = setTimeout(() => void this.rechnen(null), ABFRAGE_GRENZEN.tippenMs);
  }

  /** Treffer im Baum für dieses Blatt, nur wenn sie aus seinem gelesenen Stand stammen. Ist der Ausdruck gerade
   *  ungültig, bleiben die des letzten gültigen stehen (wie dessen Ergebnis). */
  trefferFuer(b: Arbeitsblatt): readonly string[] | null {
    const s = this.letztes?.ausgang.ok === false && this.gueltig?.sprache === this.letztes.sprache ? this.gueltig : this.letztes;
    if (!s || !s.ausgang.ok || s.ausgang.ergebnis.art !== "werte" || !s.ausdruck.trim()) return null;
    if (s.ziel?.kennung !== b.kennung || s.ziel.revision !== b.analyse?.revision) return null;
    return s.ausgang.ergebnis.treffer;
  }

  /** Das ganze Ergebnis als Text (alle Werte oder Zeilen, nicht nur die gezeigten); null bei Fehler */
  async ganzerText(format: Ausgabeformat = "json"): Promise<string | null> {
    const ausgang = await this.rechnen(format);
    if (!ausgang) return null;
    if (!ausgang.ok) {
      meldungen.zeigen({ text: ausgang.fehler.meldung, art: "fehler" });
      return null;
    }
    return ausgang.ergebnis.art === "dokument" ? ausgang.ergebnis.text : null;
  }

  /** Das ganze Ergebnis als neues Dokument (⌘ Enter), im Baum oder als Tabelle */
  async alsDokument(alsTabelle = false): Promise<void> {
    const text = await this.ganzerText();
    if (text === null) return;
    const blatt = await arbeitsplatz.neu(`abfrage-${this.sprache}.json`, text);
    blatt.zeigen({ art: "ansicht", kennung: alsTabelle ? "tabelle" : "baum" });
    this.ergebnisZeigen = false;
    abfrageverlauf.merken(this.sprache, this.ausdruck);
  }

  /** Dateiname für das Herunterladen: Dokument (oder "abfrage" bei SQL), Sprache, Endung des Formats */
  dateiname(format: Ausgabeformat): string {
    const b = arbeitsplatz.aktivesBlatt;
    const stamm = spracheVon(this.sprache).ueberAlle || !b ? "abfrage" : b.name.replace(/\.[^.]+$/, "");
    return `${stamm}-${this.sprache}.${AUSGABEFORMATE.find((f) => f.kennung === format)?.endung ?? format}`;
  }

  merken(): void {
    abfrageverlauf.merken(this.sprache, this.ausdruck);
    meldungen.zeigen({ text: "In den Abfragen-Verlauf gelegt", art: "erfolg" });
  }

  private auftrag(ausgabe: Ausgabeformat | null): { auftrag: Abfrageauftrag; dokumente: Dokumentstand[] } | null {
    const s = spracheVon(this.sprache);
    // Einfache Kopie: ein reaktiver Zustand lässt sich nicht an den Worker schicken
    const suche = $state.snapshot(this.suche);
    if (s.ueberAlle) {
      const dokumente = arbeitsplatz.blaetter.map(stand).filter((d) => d !== null);
      return { auftrag: { sprache: s.kennung, ausdruck: this.ausdruck, ziel: null, suche, ausgabe }, dokumente };
    }
    const b = arbeitsplatz.aktivesBlatt;
    const d = b ? stand(b) : null;
    if (!d) return null;
    return { auftrag: { sprache: s.kennung, ausdruck: this.ausdruck, ziel: d.kennung, suche, ausgabe }, dokumente: [d] };
  }

  private async rechnen(ausgabe: Ausgabeformat | null): Promise<Abfrageausgang | null> {
    // Ohne Ausdruck gibt es nichts zu rechnen; nur SQL zeigt dann seine Tabellen
    if (!this.ausdruck.trim() && !spracheVon(this.sprache).ueberAlle) {
      if (this.letztes?.sprache === this.sprache) this.letztes = null;
      if (this.gueltig?.sprache === this.sprache) this.gueltig = null;
      return null;
    }
    const a = this.auftrag(ausgabe);
    if (!a) return null;
    const ziel = a.auftrag.ziel ? { kennung: a.auftrag.ziel, revision: a.dokumente[0].revision } : null;
    this.rechnet = ausgabe === null;
    const ausgang = await this.dienst.rechnen(a.auftrag, a.dokumente, arbeitsplatz.blaetter.map((b) => b.kennung));
    if (!ausgang) return null;
    if (ausgabe) return ausgang;
    this.rechnet = false;
    const neu: Abfragestand = { sprache: a.auftrag.sprache, ausdruck: a.auftrag.ausdruck, ziel, ausgang };
    this.letztes = neu;
    if (ausgang.ok) {
      this.gueltig = neu;
      if (ausgang.ergebnis.art === "tabelle" && a.auftrag.ausdruck.trim()) this.ergebnisZeigen = true;
    }
    return ausgang;
  }
}

export const abfrage = new Abfrage();
