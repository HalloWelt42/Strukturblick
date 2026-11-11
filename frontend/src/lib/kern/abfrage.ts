// Vertrag der Abfrage (Stufe 4): welche Sprachen es gibt, was eine Abfrage zurückgibt und welche Grenzen gelten. Die
// Oberfläche baut ihre Sprachwahl nur aus SPRACHEN; gerechnet wird im Abfrage-Worker (dienste/abfrage).

export type SprachKennung = "jq" | "sql" | "jsonpath" | "suche";

export interface Sprache {
  readonly kennung: SprachKennung;
  readonly name: string;
  /** Rechnet über alle geöffneten Dokumente statt nur über das gewählte */
  readonly ueberAlle: boolean;
  /** Platzhalter im leeren Feld */
  readonly beispiel: string;
  /** Sprache der Hervorhebung im Feld */
  readonly hervorhebung: "jq" | "sql" | "text";
  /** Was das Feld vorschlägt: Felder des Dokuments an der Schreibmarke, Tabellen und Spalten, oder nichts */
  readonly ergaenzung: "felder" | "sql" | null;
}

export const SPRACHEN: readonly Sprache[] = [
  { kennung: "jq", name: "jq", ueberAlle: false, beispiel: ".bestellungen[] | select(.bezahlt | not) | .nr", hervorhebung: "jq", ergaenzung: "felder" },
  { kennung: "sql", name: "SQL", ueberAlle: true, beispiel: "SELECT * FROM tabelle LIMIT 20", hervorhebung: "sql", ergaenzung: "sql" },
  { kennung: "jsonpath", name: "JSONPath", ueberAlle: false, beispiel: "$.bestellungen[?(@.bezahlt == false)].nr", hervorhebung: "text", ergaenzung: "felder" },
  { kennung: "suche", name: "Suche", ueberAlle: false, beispiel: "Text in Schlüsseln und Werten", hervorhebung: "text", ergaenzung: null },
];

export const sprache = (k: SprachKennung): Sprache => SPRACHEN.find((s) => s.kennung === k) ?? SPRACHEN[0];

/** Grenzen der Abfrage an einer Stelle */
export const ABFRAGE_GRENZEN = {
  /** So viele Werte zeigt das Ergebnis (gezählt werden alle) */
  stuecke: 200,
  /** So viele Zeichen zeigt ein einzelner Wert; länger wird gekürzt (ganz mit "Als neues Dokument") */
  zeichenJeStueck: 20_000,
  /** So viele Zeilen zeigt ein SQL-Ergebnis (gezählt werden alle) */
  zeilen: 2000,
  /** Länger darf eine Abfrage nicht rechnen; danach wird der Worker beendet (Regex, Endlosschleifen in jq) */
  zeitMs: 10_000,
  /** So lange nach dem letzten Tastendruck wird gerechnet */
  tippenMs: 250,
} as const;

export type Zellwert = string | number | null;

export interface Wertstueck {
  /** Der Wert als eingerücktes JSON */
  readonly text: string;
  /** Woher er stammt (JSON Pointer), wenn bekannt; Sprungziel im Dokument */
  readonly ort: string | null;
  /** Der Text ist gekürzt (ABFRAGE_GRENZEN.zeichenJeStueck) */
  readonly gekuerzt: boolean;
}

export interface Werteergebnis {
  readonly art: "werte";
  readonly stuecke: readonly Wertstueck[];
  readonly anzahl: number;
  /** Getroffene Stellen im Dokument (JSON Pointer), null wenn die Abfrage keine Stellen hat */
  readonly treffer: readonly string[] | null;
}

export interface Tabellenuebersicht {
  readonly name: string;
  readonly quelle: string;
  readonly notiz: string | null;
  readonly anzahl: number;
  readonly spalten: readonly { readonly name: string; readonly art: string }[];
}

export interface Tabellenergebnis {
  readonly art: "tabelle";
  readonly spalten: readonly { readonly name: string; readonly art: string }[];
  readonly zeilen: readonly (readonly Zellwert[])[];
  readonly anzahl: number;
  /** Die Tabellen, über die SQL gerechnet hat */
  readonly tabellen: readonly Tabellenuebersicht[];
}

/** Das ganze Ergebnis als Text für ein neues Dokument */
export interface Dokumentergebnis {
  readonly art: "dokument";
  readonly text: string;
}

export type Abfrageergebnis = Werteergebnis | Tabellenergebnis | Dokumentergebnis;

export interface Abfragefehler {
  readonly meldung: string;
  /** Stelle im Ausdruck (ab 1), wenn die Sprache sie nennt */
  readonly zeile: number | null;
  readonly spalte: number | null;
}

export type Abfrageausgang =
  | { readonly ok: true; readonly ergebnis: Abfrageergebnis; readonly dauer: number }
  | { readonly ok: false; readonly fehler: Abfragefehler };
