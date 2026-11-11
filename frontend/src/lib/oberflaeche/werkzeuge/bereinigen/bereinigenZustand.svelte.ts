// Zustand des Werkzeugs Bereinigen je Blatt: was der Nutzer gewählt hat (Reiter, Facetten, Filter, Verfahren,
// Zielwerte). Gerechnet wird in analyse/bereinigen; teure Schritte (Tabelle, Filter, Werte je Spalte) merkt sich der
// Zustand zur gerade gelesenen Analyse, damit Hauptbereich und Inspektor dasselbe Ergebnis teilen, ohne doppelt zu rechnen.

import type { Analyse } from "../../../kern";
import { KEIN, type Strukturindex } from "../../../kern/strukturindex";
import { knotenZu, zeigerAus } from "../../../kern/pfade";
import { listeFinden, tabelleBauen, type Tabelle } from "../../../analyse/tabelle";
import { vorgeschlageneFacetten, werteZaehlen, zeilenFiltern, type Auswahl, type Filter, type Filterergebnis, type Wertzaehlung } from "../../../analyse/bereinigen/facetten";
import { gruppenFinden, type Gruppe, type Verfahren } from "../../../analyse/bereinigen/aehnlich";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";

export type Reiter = "facetten" | "aehnlich" | "typen";

export const REITER: readonly { readonly kennung: Reiter; readonly titel: string; readonly symbol: string }[] = [
  { kennung: "facetten", titel: "Facetten", symbol: "fa-filter" },
  { kennung: "aehnlich", titel: "Ähnliche Werte", symbol: "fa-object-group" },
  { kennung: "typen", titel: "Typen", symbol: "fa-shapes" },
];

/** Was gerade zu sehen ist: noch nichts gelesen, nicht lesbar, keine Liste, oder die Tabelle zur Analyse */
export type Bereinigungsstand =
  | { readonly art: "liest" }
  | { readonly art: "unlesbar" }
  | { readonly art: "keine-liste" }
  | {
      readonly art: "tabelle";
      readonly analyse: Analyse;
      readonly index: Strukturindex;
      readonly text: string;
      readonly tabelle: Tabelle;
      readonly listeZeiger: string;
      /** Die Analyse gehört zur aktuellen Revision (nur dann lässt sich ändern) */
      readonly aktuell: boolean;
    };

export type Tabellenstand = Extract<Bereinigungsstand, { art: "tabelle" }>;

/** Zeilen je Seite im Ergebnis der Facetten */
export const ZEILEN_JE_SEITE = 50;

/** Schlüssel einer Gruppe ähnlicher Werte (bleibt gleich, solange dieselben Schreibweisen drin sind) */
export const gruppenSchluessel = (spalte: string, g: Gruppe): string => [spalte, ...g.varianten.map((v) => v.wert).sort()].join("\n");

export class BereinigenZustand {
  reiter = $state<Reiter>("facetten");
  /** Offene Facetten nach Spaltennamen; null, solange der Nutzer nichts gewählt hat (dann gilt der Vorschlag) */
  facetten = $state<string[] | null>(null);
  /** Filter in der Reihenfolge, in der sie dazukamen (die Zählung je Schritt folgt ihr) */
  filter = $state<Filter[]>([]);
  /** Je Facette: Werte nach Anzahl statt nach dem Alphabet */
  nachAnzahl = $state<Record<string, boolean>>({});
  /** Je Facette: alle Werte zeigen statt der ersten */
  alleWerte = $state<Record<string, boolean>>({});
  seite = $state(0);
  /** Vorschau "Nur diese Zeilen behalten" im Inspektor offen */
  behaltenVorschau = $state(false);

  verfahren = $state<Verfahren>("kern");
  spalteAehnlich = $state<string | null>(null);
  /** Zielwert je Gruppe, wenn der Nutzer einen anderen als den Vorschlag gewählt oder eingetippt hat */
  ziele = $state<Record<string, string>>({});
  /** Gruppen, die nicht zusammengeführt werden sollen */
  ohne = $state<Record<string, boolean>>({});

  spalteTypen = $state<string | null>(null);
  /** Nicht lesbare Werte beim Umwandeln leer setzen statt sie stehen zu lassen */
  unlesbarLeeren = $state(false);

  private tabelleMerk: { analyse: Analyse; liste: number; tabelle: Tabelle } | null = null;
  private filterMerk: { tabelle: Tabelle; schluessel: string; ergebnis: Filterergebnis } | null = null;
  private werteMerk: { tabelle: Tabelle; je: Map<number, Wertzaehlung[]> } | null = null;
  private gruppenMerk: { tabelle: Tabelle; je: Map<string, Gruppe[]> } | null = null;

  /** Tabelle zur zuletzt gelesenen Analyse des Blatts (folgt der Wahl wie die Ansicht Tabelle) */
  stand(blatt: Arbeitsblatt): Bereinigungsstand {
    const analyse = blatt.analyse;
    if (!analyse) return { art: blatt.lesefehler ? "unlesbar" : "liest" };
    const index = analyse.index;
    if (!index) return { art: "unlesbar" };
    const text = blatt.analyseText;
    const gewaehlt = blatt.gewaehlt;
    const k = gewaehlt === null || (gewaehlt !== "" && !gewaehlt.startsWith("/")) ? KEIN : knotenZu(index, text, gewaehlt);
    const liste = listeFinden(index, k, KEIN);
    if (liste === KEIN) return { art: "keine-liste" };
    const m = this.tabelleMerk;
    const tabelle = m && m.analyse === analyse && m.liste === liste ? m.tabelle : tabelleBauen(index, text, liste);
    this.tabelleMerk = { analyse, liste, tabelle };
    return { art: "tabelle", analyse, index, text, tabelle, listeZeiger: zeigerAus(tabelle.listeTeile), aktuell: blatt.aktuell };
  }

  /** Offene Facetten: die gewählten, sonst der Vorschlag; nur Spalten, die es gibt */
  offeneFacetten(s: Tabellenstand): string[] {
    return (this.facetten ?? vorgeschlageneFacetten(s.tabelle, s.index, s.text)).filter((n) => s.tabelle.spalteNach.has(n));
  }

  /**
   * Spalte im Reiter Ähnliche Werte: die gewählte, sonst die erste offene Facette mit Gruppen gleichen Kerns, sonst die
   * erste Spalte überhaupt mit solchen Gruppen, sonst die erste offene Facette, sonst die erste Spalte.
   */
  aehnlicheSpalte(s: Tabellenstand): string {
    if (this.spalteAehnlich !== null && s.tabelle.spalteNach.has(this.spalteAehnlich)) return this.spalteAehnlich;
    const offen = this.offeneFacetten(s);
    const mitGruppen = (n: string) => this.gruppen(s, s.tabelle.spalteNach.get(n)!, "kern").length > 0;
    return offen.find(mitGruppen) ?? s.tabelle.spalten.map((x) => x.name).find(mitGruppen) ?? offen[0] ?? s.tabelle.spalten[0].name;
  }

  /** Spalte im Reiter Typen für den Inspektor: die gewählte, sonst die erste mit Vorschlag */
  typenSpalte(s: Tabellenstand, ersteMitVorschlag: string | null): string {
    return this.spalteTypen !== null && s.tabelle.spalteNach.has(this.spalteTypen) ? this.spalteTypen : (ersteMitVorschlag ?? s.tabelle.spalten[0].name);
  }

  /** Zeilen nach allen Filtern (Filter auf Spalten, die es nicht mehr gibt, zählen nicht) */
  gefiltert(s: Tabellenstand): Filterergebnis {
    const filter = this.filter.filter((f) => s.tabelle.spalteNach.has(f.spalte));
    const schluessel = JSON.stringify(filter);
    const m = this.filterMerk;
    if (m && m.tabelle === s.tabelle && m.schluessel === schluessel) return m.ergebnis;
    const ergebnis = zeilenFiltern(s.tabelle, s.index, s.text, filter);
    this.filterMerk = { tabelle: s.tabelle, schluessel, ergebnis };
    return ergebnis;
  }

  /** Werte einer Spalte mit Anzahl (je Tabelle gemerkt) */
  werte(s: Tabellenstand, spalte: number): Wertzaehlung[] {
    if (this.werteMerk?.tabelle !== s.tabelle) this.werteMerk = { tabelle: s.tabelle, je: new Map() };
    const je = this.werteMerk.je;
    if (!je.has(spalte)) je.set(spalte, werteZaehlen(s.tabelle, s.index, s.text, spalte));
    return je.get(spalte)!;
  }

  /** Gruppen ähnlicher Werte einer Spalte nach einem Verfahren (je Tabelle gemerkt) */
  gruppen(s: Tabellenstand, spalte: number, verfahren: Verfahren): Gruppe[] {
    if (this.gruppenMerk?.tabelle !== s.tabelle) this.gruppenMerk = { tabelle: s.tabelle, je: new Map() };
    const je = this.gruppenMerk.je;
    const schluessel = `${spalte}:${verfahren}`;
    if (!je.has(schluessel)) je.set(schluessel, gruppenFinden(this.werte(s, spalte), verfahren));
    return je.get(schluessel)!;
  }

  /** Zielwert einer Gruppe: vom Nutzer gewählt oder der Vorschlag */
  zielVon(spalte: string, g: Gruppe): string {
    return this.ziele[gruppenSchluessel(spalte, g)] ?? g.ziel;
  }

  /** Was die eingeschalteten Gruppen ersetzen: Schreibweise -> Zielwert */
  ersetzungsKarte(spalte: string, gruppen: readonly Gruppe[]): Map<string, string> {
    const karte = new Map<string, string>();
    for (const g of gruppen) {
      if (this.ohne[gruppenSchluessel(spalte, g)]) continue;
      const ziel = this.zielVon(spalte, g);
      for (const v of g.varianten) if (v.wert !== ziel) karte.set(v.wert, ziel);
    }
    return karte;
  }

  auswahl(spalte: string): Auswahl | null {
    return this.filter.find((f) => f.spalte === spalte)?.auswahl ?? null;
  }

  /** Auswahl einer Facette setzen; null nimmt den Filter weg. Ein bestehender Filter behält seinen Platz. */
  auswahlSetzen(spalte: string, auswahl: Auswahl | null): void {
    const i = this.filter.findIndex((f) => f.spalte === spalte);
    if (auswahl === null) {
      if (i >= 0) this.filter.splice(i, 1);
    } else if (i >= 0) {
      this.filter[i] = { spalte, auswahl };
    } else {
      this.filter.push({ spalte, auswahl });
    }
    this.seite = 0;
    this.behaltenVorschau = false;
  }

  filterLeeren(): void {
    this.filter = [];
    this.seite = 0;
    this.behaltenVorschau = false;
  }

  facetteOeffnen(offen: readonly string[], spalte: string): void {
    if (!offen.includes(spalte)) this.facetten = [...offen, spalte];
  }

  facetteSchliessen(offen: readonly string[], spalte: string): void {
    this.facetten = offen.filter((s) => s !== spalte);
    this.auswahlSetzen(spalte, null);
  }

  /** Zu einer Spalte im Reiter Ähnliche Werte springen */
  aehnlicheZeigen(spalte: string): void {
    this.spalteAehnlich = spalte;
    this.reiter = "aehnlich";
  }

  typenZeigen(spalte: string): void {
    this.spalteTypen = spalte;
    this.reiter = "typen";
  }
}

/** Zustand zum Blatt (entsteht beim ersten Zugriff, lebt so lange wie das Blatt) */
export const bereinigenZustand = (blatt: Arbeitsblatt): BereinigenZustand => blatt.zustandFuer("bereinigen", () => new BereinigenZustand());
