// Format JSON, mit JSONC (Kommentare und abschließende Kommas werden gelesen und als Hinweis gemeldet).
// Eigener Leser mit Spannen statt JSON.parse; Zahlen bleiben Rohtext.

import { IndexBauer, KEIN } from "../kern/strukturindex";
import type { Diagnose, Format, Leseergebnis } from "./vertrag";
import { JsonLeser } from "./json/leser";
import { jsonWertSchreiben } from "./json/schreiben";
import { mitTrennern } from "./entfernen";
import { mitgliederEntfernen } from "./spalten";

/** Für die Erkennung wird höchstens dieser Anfang geprüft; ein dort abgeschnittener Text gilt als lesbar. */
const ERKENNEN_HOECHSTENS = 1 << 20;

function lesen(text: string): Leseergebnis {
  const diagnosen: Diagnose[] = [];
  const bauer = new IndexBauer();
  const leser = new JsonLeser(text, bauer, diagnosen, { jsonc: true });
  leser.neu(0, text.length);
  const merkmale = () => ({ kommentare: leser.kommentare, abschliessendeKommas: leser.abschliessendeKommas });

  if (leser.leerraum() && leser.pos >= text.length) {
    diagnosen.push({ schwere: "fehler", meldung: "Das Dokument ist leer", von: 0, bis: text.length });
  }
  if (leser.fehler || leser.pos >= text.length) return { index: null, diagnosen, merkmale: merkmale() };

  const wurzel = leser.wert(KEIN);
  if (!leser.fehler && leser.leerraum() && leser.pos < text.length) {
    const zeile = text.indexOf("\n", leser.pos);
    diagnosen.push({ schwere: "fehler", meldung: "Nach dem Ende des Dokuments folgt noch Text", von: leser.pos, bis: zeile === -1 ? text.length : zeile });
  }
  return { index: wurzel === KEIN ? null : bauer.fertig(), diagnosen, merkmale: merkmale() };
}

/** Beginnt mit { oder [ (nach Leerraum und Kommentaren) und lässt sich lesen. */
function erkennen(text: string): number {
  const ende = Math.min(text.length, ERKENNEN_HOECHSTENS);
  const leser = new JsonLeser(text, null, [], { jsonc: true });
  leser.neu(0, ende);
  if (!leser.leerraum()) return 0;
  const c = text.charCodeAt(leser.pos);
  if (c !== 123 && c !== 91) return 0;
  leser.wert(KEIN);
  const abgeschnitten = leser.fehler && leser.zuFrueh && ende < text.length;
  if (leser.fehler && !abgeschnitten) return 0.4;
  if (!abgeschnitten && leser.leerraum() && leser.pos < ende) return 0.4;
  return 0.9;
}

export const JSON_FORMAT: Format = {
  kennung: "json",
  name: "JSON",
  endungen: ["json", "jsonc", "geojson"],
  sprache: "json",
  faehigkeiten: { kommentare: true, tabellarisch: false, typen: true },
  leseoptionen: [],
  erkennen,
  lesen,
  // Mit Kommentaren oder abschließenden Kommas ist es JSONC, das reines JSON nicht liest
  jsonText: (m) => (m.kommentare || m.abschliessendeKommas ? null : "wert"),
  eintraegeEntfernen: (_text, index, liste, stellen) => mitTrennern(index, liste, stellen),
  spalteEntfernen: (text, index, liste, spalte) => mitgliederEntfernen(text, index, liste, spalte),
  wertSchreiben: (_text, index, k, neu) => jsonWertSchreiben(index, k, neu),
};
