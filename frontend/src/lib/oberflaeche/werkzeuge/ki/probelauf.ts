// Probelauf eines KI-Vorschlags (STB-60): lesen, prüfen und einmal ausprobieren, ohne etwas zu übernehmen. Eine Abfrage
// rechnet auf dem offenen Dokument (eigener Dienst, die Konsole bleibt), ein Schema prüft das Dokument, eine
// Spezifikation erzeugt fünf Datensätze. Was das Modell erfunden hat, steht in den Hinweisen.

import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
import { abfrage } from "../../../zustand/abfrage.svelte";
import type { Abfrageausgang } from "../../../kern/abfrage";
import type { KiAufgabe, KiSprache } from "../../../analyse/ki/aufgaben";
import { ausdruckAus, beschreibungAus, schemaAus, testdatenAus, type Beschreibungsvergleich, type Testdatenvorschlag } from "../../../analyse/ki/vorschlag";
import { pruefen, schemaLesen, type Pruefung } from "../../../analyse/validieren";
import { Erzeugung } from "../../../analyse/testdaten/spezifikation";
import type { Json } from "../../../analyse/testdaten/erzeuger";
import { testdatenZustand } from "../testdaten/testdatenZustand.svelte";

/** Startwert der Proben (wie die Vorgabe im Werkzeug Testdaten) */
const PROBE_STARTWERT = 4711;
const PROBE_ANZAHL = 5;

export type Probe =
  | { readonly art: "text" }
  | { readonly art: "abfrage"; readonly sprache: KiSprache; readonly ausdruck: string; readonly liestNur: boolean; readonly ausgang: Abfrageausgang | null; readonly ms: number }
  | { readonly art: "schema"; readonly text: string; readonly pruefung: Pruefung | null; readonly hinweise: readonly string[] }
  | { readonly art: "beschreibung"; readonly vergleich: Beschreibungsvergleich; readonly hinweise: readonly string[] }
  | { readonly art: "testdaten"; readonly vorschlag: Testdatenvorschlag; readonly proben: readonly Json[]; readonly hinweise: readonly string[] }
  | { readonly art: "fehler"; readonly meldung: string };

/** Liest SQL nur? (Die Probe rechnet ohnehin auf einer Kopie; das Abzeichen sagt es dem Menschen.) */
const nurLesend = (sql: string): boolean => /^\s*(select|with)\b/i.test(sql) && !/\b(insert|update|delete|create|drop|alter|attach|pragma|replace\s+into)\b/i.test(sql);

export async function probieren(blatt: Arbeitsblatt, aufgabe: KiAufgabe, sprache: KiSprache | null, ergebnis: string, schemaVorher: (b: Arbeitsblatt) => string): Promise<Probe> {
  const a = blatt.analyse;
  switch (aufgabe) {
    case "erklaeren":
      return { art: "text" };
    case "abfrage": {
      const s = sprache ?? "jq";
      const ausdruck = ausdruckAus(ergebnis);
      const beginn = performance.now();
      const ausgang = await abfrage.probe(blatt, s, ausdruck);
      return { art: "abfrage", sprache: s, ausdruck, liestNur: s !== "sql" || nurLesend(ausdruck), ausgang, ms: Math.round(performance.now() - beginn) };
    }
    case "schema": {
      const g = schemaAus(ergebnis);
      if (!g.ok) return { art: "fehler", meldung: g.fehler };
      const gelesen = schemaLesen(g.wert);
      const pruefung = a?.index && a.format.faehigkeiten.schemasprache === "json-schema" && gelesen.ok ? pruefen(a.index, blatt.analyseText, gelesen.schema) : null;
      return { art: "schema", text: g.wert, pruefung, hinweise: g.hinweise };
    }
    case "beschreibung": {
      const g = beschreibungAus(ergebnis, schemaVorher(blatt));
      return g.ok ? { art: "beschreibung", vergleich: g.wert, hinweise: g.hinweise } : { art: "fehler", meldung: g.fehler };
    }
    case "testdaten": {
      const bisher = testdatenZustand(blatt).spezifikation(blatt);
      if (!bisher) return { art: "fehler", meldung: "Das Dokument taugt nicht als Vorlage für Testdaten" };
      const g = testdatenAus(ergebnis, bisher);
      if (!g.ok) return { art: "fehler", meldung: g.fehler };
      const proben = new Erzeugung(g.wert.spezifikation, PROBE_STARTWERT).naechste(PROBE_ANZAHL);
      return { art: "testdaten", vorschlag: g.wert, proben, hinweise: g.hinweise };
    }
  }
}
