// Aufgaben des Werkzeugs "Mit KI" (STB-60, entwuerfe/ki.html). Dieselben Kennungen kennt der Server
// (backend/app/ki/modelle.py); dort stehen die Anweisungen an das Modell, hier, was die Oberfläche fragt und zeigt.

export type KiAufgabe = "erklaeren" | "abfrage" | "schema" | "beschreibung" | "testdaten";
export type KiSprache = "sql" | "jq" | "jsonpath" | "xpath";

export interface Aufgabeneintrag {
  readonly kennung: KiAufgabe;
  readonly titel: string;
  readonly unterzeile: string;
  readonly symbol: string;
  /** Braucht die Aufgabe eine Frage, darf sie eine haben oder keine? */
  readonly frage: "pflicht" | "wahl";
  readonly platzhalter: string;
  /** Wie das Ergebnis aussieht: Text zum Lesen, ein Ausdruck oder JSON */
  readonly ergebnis: "markdown" | "ausdruck" | "json";
}

export const AUFGABEN: readonly Aufgabeneintrag[] = [
  {
    kennung: "erklaeren",
    titel: "Daten erklären",
    unterzeile: "Was steht in welchem Feld?",
    symbol: "fa-comment-dots",
    frage: "wahl",
    platzhalter: "Wahlweise eine Frage, etwa: Was bedeutet status?",
    ergebnis: "markdown",
  },
  {
    kennung: "abfrage",
    titel: "Frage in Abfrage übersetzen",
    unterzeile: "Frage in Worten, Antwort als SQL oder jq",
    symbol: "fa-language",
    frage: "pflicht",
    platzhalter: "Etwa: Welche Kunden aus Leipzig haben mehr als 1.000 Euro Umsatz?",
    ergebnis: "ausdruck",
  },
  {
    kennung: "schema",
    titel: "Schema aus Beschreibung",
    unterzeile: "JSON Schema aus einem Text",
    symbol: "fa-diagram-project",
    frage: "pflicht",
    platzhalter: "Etwa: Ein Kunde hat Nummer, Name, Ort und eine Postleitzahl mit fünf Ziffern",
    ergebnis: "json",
  },
  {
    kennung: "beschreibung",
    titel: "Beschreibung aus Schema",
    unterzeile: "Feldbeschreibungen zum Schema",
    symbol: "fa-tags",
    frage: "wahl",
    platzhalter: "Wahlweise ein Hinweis, etwa: kurz und für Fachleute im Versand",
    ergebnis: "json",
  },
  {
    kennung: "testdaten",
    titel: "Testdaten vorschlagen",
    unterzeile: "Spezifikation für das Werkzeug Testdaten",
    symbol: "fa-dice",
    frage: "wahl",
    platzhalter: "Wahlweise ein Wunsch, etwa: Kunden aus Sachsen, ein Drittel ohne Telefon",
    ergebnis: "json",
  },
];

export const aufgabe = (k: KiAufgabe): Aufgabeneintrag => AUFGABEN.find((a) => a.kennung === k) ?? AUFGABEN[0];

export const SPRACH_NAME: Record<KiSprache, string> = { sql: "SQL", jq: "jq", jsonpath: "JSONPath", xpath: "XPath" };
