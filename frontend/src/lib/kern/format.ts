// Vertrag eines Formats (Leitgedanke 7). Ein Format liest Text zu einem Strukturindex und schreibt einzelne Werte als
// Textänderung an bekannter Stelle zurück; es serialisiert nie ein ganzes Dokument für eine Einzeländerung.
// Formate sind rein (kein Browser), damit sie im Worker und in Tests laufen.

import type { Strukturindex } from "./strukturindex";

export type FormatKennung = "json" | "ndjson" | "csv" | "yaml";

export type Schwere = "fehler" | "warnung" | "hinweis";

export interface Diagnose {
  readonly schwere: Schwere;
  readonly meldung: string;              // deutsch, für Menschen
  readonly von: number;                  // UTF-16 im Text
  readonly bis: number;
}

/** Was ein Format über diesen Text herausgefunden hat (Dialekt, Kopfzeile ...), als einfache Werte. */
export type Merkmale = Readonly<Record<string, string | number | boolean>>;

export interface Leseergebnis {
  /** null, wenn der Text gar nicht lesbar ist; sonst der Baum (bei Fehlern so weit wie möglich). */
  readonly index: Strukturindex | null;
  readonly diagnosen: readonly Diagnose[];
  readonly merkmale: Merkmale;
}

/** Vom Nutzer gewählte Leseweise (etwa CSV-Trennzeichen); leer heißt: selbst erkennen. */
export type Leseoptionen = Readonly<Record<string, string | number | boolean>>;

/** Neuer Wert für eine Stelle. Zahlen kommen als Rohtext, damit nichts gerundet wird. */
export type NeuerWert =
  | { readonly art: "text"; readonly wert: string }
  | { readonly art: "zahl"; readonly roh: string }
  | { readonly art: "wahrheitswert"; readonly wert: boolean }
  | { readonly art: "nichts" };

/** Eine Textänderung: ersetze [von, bis) durch `einfuegen`. */
export interface TextAenderung {
  readonly von: number;
  readonly bis: number;
  readonly einfuegen: string;
}

/** Eine Leseweise, die der Nutzer wählen kann (CSV: Trennzeichen, Kopfzeile); der aktuelle Wert steht in den Merkmalen
 *  unter derselben Kennung. Die Oberfläche baut ihre Wahl nur hieraus (Regel A4). */
export interface Leseoption {
  readonly kennung: string;
  readonly name: string;                   // "Trennzeichen", "Erste Zeile"
  readonly werte: readonly { readonly wert: string | boolean; readonly name: string }[];
}

export interface Faehigkeiten {
  readonly kommentare: boolean;          // kennt Kommentare
  readonly tabellarisch: boolean;        // ist von Natur aus eine Tabelle (Zeilen und Spalten)
  readonly typen: boolean;               // unterscheidet Zahl, Text, Wahrheitswert, nichts (CSV nicht)
}

export interface Format {
  readonly kennung: FormatKennung;
  readonly name: string;                 // für Menschen ("CSV", "YAML")
  readonly endungen: readonly string[];  // ohne Punkt, klein
  readonly sprache: string;              // Hervorhebung im Editor ("json", "yaml", "text")
  readonly faehigkeiten: Faehigkeiten;
  /** Wählbare Leseweisen (leer, wenn es nichts zu wählen gibt) */
  readonly leseoptionen: readonly Leseoption[];
  /** Wie sicher ist dieses Format für den Text? 0 nein, 1 sicher. Dateiname nur als Hinweis. */
  erkennen(text: string, dateiname?: string): number;
  lesen(text: string, optionen?: Leseoptionen): Leseergebnis;
  /** Ist dieser Text schon reines JSON, so wie er dasteht? "wert": ein JSON-Wert, "folge": ein JSON-Wert je Zeile.
   *  Abfragen (jq) lesen ihn dann unverändert; sonst bekommen sie den aus dem Index erzeugten Wert. */
  jsonText?(merkmale: Merkmale): "wert" | "folge" | null;
  /** Textänderungen, die die Einträge an den Stellen `stellen` der Liste `liste` entfernen, ohne den Rest neu zu
   *  schreiben (Formatierung und Kommentare bleiben). */
  eintraegeEntfernen(text: string, index: Strukturindex, liste: number, stellen: readonly number[]): readonly TextAenderung[];
  /** Textänderung, die den Wert des Knotens `k` ersetzt; wirft Formatfehler, wenn der Wert hier nicht geht. */
  wertSchreiben(text: string, index: Strukturindex, k: number, neu: NeuerWert, merkmale: Merkmale): TextAenderung;
}

/** Fachlicher Fehler beim Schreiben (etwa "CSV kennt keine Listen"); die Sitzung meldet ihn, statt abzustürzen. */
export class Formatfehler extends Error {}
