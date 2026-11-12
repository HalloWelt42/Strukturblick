// Beispieldaten zum Üben (STB-19): ein erfundener Hofladen mit Bestellungen, Kunden und den Diensten seines Webshops.
// Eine Quelle für Tests, Vorführung und App: frontend/pruefdaten. Die Texte werden erst beim Öffnen nachgeladen.
// Alles ist erfunden: Namen ausgedacht, Adressen unter example.org, Telefonnummern aus dem Bereich, den die
// Bundesnetzagentur für Film und Fernsehen freihält (030 23125 ...).

export interface Beispiel {
  readonly name: string;
  readonly beschreibung: string;
  laden(): Promise<string>;
}

export const BEISPIEL_ORDNER = "Beispiele";

export const BEISPIELE: readonly Beispiel[] = [
  {
    name: "bestellungen.json",
    beschreibung: "128 Bestellungen eines Hofladens mit Kunde und Positionen; zum Ansehen als Baum und Tabelle und für Abfragen",
    laden: async () => (await import("../../../pruefdaten/bestellungen.json?raw")).default,
  },
  {
    name: "kunden.csv",
    beschreibung: "1.214 Kunden mit absichtlichen Unsauberkeiten (Ortsnamen, Datumsformen, deutsche Zahlen); passt per SQL zu den Bestellungen",
    laden: async () => (await import("../../../pruefdaten/kunden.csv?raw")).default,
  },
  {
    name: "dienste.yaml",
    beschreibung: "Dienste des Webshops in YAML mit Anker und Verweisen",
    laden: async () => (await import("../../../pruefdaten/dienste.yaml?raw")).default,
  },
  {
    name: "bestellung.schema.json",
    beschreibung: "JSON Schema eines erfundenen Lieferdienstes für die Bestellungen (höchstens drei Positionen); zum Üben im Werkzeug Validieren",
    laden: async () => (await import("../../../pruefdaten/bestellung.schema.json?raw")).default,
  },
  {
    name: "kundenimport.ndjson",
    beschreibung: "Kundenimport als JSON Lines mit vier kaputten Zeilen (abgeschnitten, einfache Anführungszeichen, zwei Datensätze in einer Zeile); zum Üben im Werkzeug Reparieren",
    laden: async () => (await import("../../../pruefdaten/kundenimport.ndjson?raw")).default,
  },
  {
    name: "webshop.toml",
    beschreibung: "Einstellungen des Webshops in TOML mit Tabellen, Tabellenliste und Kommentaren; zum Ansehen und Konvertieren",
    laden: async () => (await import("../../../pruefdaten/webshop.toml?raw")).default,
  },
];
