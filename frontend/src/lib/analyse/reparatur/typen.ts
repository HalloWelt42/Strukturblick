// Begriffe der Reparatur: ein Eingriff ersetzt eine Spanne des Ausgangstexts nach einer festen Regel. Werte werden
// nie geraten; wo keine Regel greift, bleibt die Stelle als ungelöst stehen und der Mensch entscheidet.

/** Die festen Regeln; jede hat genau eine Wirkung und eine Meldung. */
export type Regel =
  | "komma-fehlt"
  | "komma-zuviel"
  | "doppelpunkt-fehlt"
  | "wert-fehlt"
  | "text-schliessen"
  | "abgeschnitten"
  | "klammer-fehlt"
  | "klammer-zuviel"
  | "anfuehrung-einfach"
  | "schluessel-ohne-anfuehrung"
  | "wort-ohne-anfuehrung"
  | "fremdes-wort"
  | "zahl-form"
  | "rueckstrich"
  | "steuerzeichen"
  | "kommentar"
  | "zeile-teilen";

/** Ersetzt [von, bis) des Ausgangstexts durch `neu`; von == bis ist ein reines Einfügen. */
export interface Eingriff {
  readonly von: number;
  readonly bis: number;
  readonly neu: string;
  readonly regel: Regel;
  /** Was nicht stimmt, etwa: Komma fehlt nach "K-10472" */
  readonly meldung: string;
  /** Was die Reparatur tut, etwa: Komma einfügen */
  readonly vorschlag: string;
}

/** Etwas, das nach der Reparatur ein Mensch ansehen sollte (abgeschnittener Wert, eingesetztes null ...). */
export interface Hinweis {
  readonly von: number;
  readonly text: string;
}

/** Stelle, an der keine feste Regel greift; ab hier bleibt der Text, wie er ist. */
export interface Ungeloest {
  readonly von: number;
  readonly meldung: string;
}

export interface Flickergebnis {
  readonly eingriffe: readonly Eingriff[];
  readonly hinweise: readonly Hinweis[];
  readonly ungeloest: Ungeloest | null;
}

/** Wie der Text gelesen wird: als ein JSON-Dokument oder als JSON Lines (ein Wert je Zeile). */
export type Leseart = "json" | "ndjson";

/** Alles, was die Reparatur zu einer Textzeile weiß. */
export interface Zeilenbefund {
  /** Textzeile ab 1 */
  readonly zeile: number;
  /** Spanne der Zeile im Text, ohne Zeilenumbruch */
  readonly von: number;
  readonly bis: number;
  readonly eingriffe: readonly Eingriff[];
  readonly hinweise: readonly string[];
  readonly ungeloest: Ungeloest | null;
  /** Nur bei JSON Lines: Felder des Datensatzes nach der Reparatur und die üblichen, die ihm fehlen */
  readonly felder: { readonly vorhanden: readonly string[]; readonly fehlend: readonly string[] } | null;
}

export interface Reparatur {
  readonly als: Leseart;
  /** Textzeilen insgesamt */
  readonly zeilen: number;
  /** Nur Zeilen mit Eingriff, Hinweis oder ungelöster Stelle, in Textreihenfolge */
  readonly befunde: readonly Zeilenbefund[];
}
