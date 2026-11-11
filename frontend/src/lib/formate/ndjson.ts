// Format NDJSON (JSON Lines): ein JSON-Wert je Zeile, Leerzeilen erlaubt. Die Wurzel ist die Liste der Zeilen.
// Eine kaputte Zeile ergibt eine Diagnose und bleibt als Eintrag (Text mit ihrem Rohtext) sichtbar; die übrigen Zeilen
// werden normal gelesen. Jede Zeile wird erst geprüft und nur fehlerfrei in den Index gebaut, weil der IndexBauer
// keine halb gebauten Knoten zurücknehmen kann.

import { IndexBauer, KEIN, KnotenArt } from "../kern/strukturindex";
import { Formatfehler, type Diagnose, type Format, type Leseergebnis } from "./vertrag";
import { JsonLeser } from "./json/leser";
import { jsonWertSchreiben } from "./json/schreiben";
import { mitTrennern, zeilenweise } from "./entfernen";
import { mitgliederEntfernen } from "./spalten";

/** Für die Erkennung werden höchstens so viele nichtleere Zeilen geprüft. */
const ERKENNEN_ZEILEN = 50;
const OPTIONEN = { jsonc: false } as const;

interface Zeile {
  readonly nummer: number; // ab 1
  readonly von: number; // erstes Zeichen, das kein Leerraum ist
  readonly bis: number; // hinter dem letzten Zeichen, das kein Leerraum ist
}

const istLeer = (c: number): boolean => c === 32 || c === 9 || c === 13 || c === 0xfeff;

/** Nichtleere Zeilen in Textreihenfolge, ohne Leerraum am Rand. */
function* zeilen(text: string): Generator<Zeile> {
  let anfang = 0;
  let nummer = 1;
  while (anfang <= text.length) {
    const umbruch = text.indexOf("\n", anfang);
    const ende = umbruch === -1 ? text.length : umbruch;
    let von = anfang;
    let bis = ende;
    while (von < bis && istLeer(text.charCodeAt(von))) von++;
    while (bis > von && istLeer(text.charCodeAt(bis - 1))) bis--;
    if (von < bis) yield { nummer, von, bis };
    if (umbruch === -1) break;
    anfang = umbruch + 1;
    nummer++;
  }
}

/** Prüft eine Zeile als genau einen JSON-Wert; Fehler landen in `pruefer.diagnosen`. */
function zeilePruefen(pruefer: JsonLeser, z: Zeile): boolean {
  pruefer.diagnosen = [];
  pruefer.praefix = `Zeile ${z.nummer}: `;
  pruefer.neu(z.von, z.bis);
  pruefer.wert(KEIN);
  if (pruefer.fehler) return false;
  if (pruefer.pos < z.bis) {
    pruefer.diagnosen.push({ schwere: "fehler", meldung: `Zeile ${z.nummer}: Nach dem Wert folgt noch Text`, von: pruefer.pos, bis: z.bis });
    return false;
  }
  return true;
}

function lesen(text: string): Leseergebnis {
  const diagnosen: Diagnose[] = [];
  const bauer = new IndexBauer();
  const pruefer = new JsonLeser(text, null, [], OPTIONEN);
  const leser = new JsonLeser(text, bauer, diagnosen, OPTIONEN);
  const wurzel = bauer.knoten(KnotenArt.liste, KEIN, 0);
  let kaputt = 0;
  for (const z of zeilen(text)) {
    if (zeilePruefen(pruefer, z)) {
      leser.praefix = pruefer.praefix;
      leser.neu(z.von, z.bis);
      leser.wert(wurzel);
    } else {
      kaputt++;
      diagnosen.push(...pruefer.diagnosen);
      bauer.blatt(KnotenArt.text, wurzel, z.von, z.bis);
    }
  }
  bauer.schliessen(wurzel, text.length);
  return { index: bauer.fertig(), diagnosen, merkmale: { kaputteZeilen: kaputt } };
}

/** Mindestens zwei Zeilen, die je für sich ein JSON-Wert sind; nur einfache Werte (etwa eine Zahlenspalte) zählen weniger. */
function erkennen(text: string): number {
  const pruefer = new JsonLeser(text, null, [], OPTIONEN);
  let geprueft = 0;
  let gueltig = 0;
  let behaelter = false;
  for (const z of zeilen(text)) {
    if (geprueft === ERKENNEN_ZEILEN) break;
    geprueft++;
    if (!zeilePruefen(pruefer, z)) continue;
    gueltig++;
    const c = text.charCodeAt(z.von);
    if (c === 123 || c === 91) behaelter = true;
  }
  if (gueltig < 2) return 0;
  return (behaelter ? 0.95 : 0.5) * (gueltig / geprueft);
}

export const NDJSON_FORMAT: Format = {
  kennung: "ndjson",
  name: "NDJSON",
  endungen: ["ndjson", "jsonl"],
  sprache: "json",
  faehigkeiten: { kommentare: false, tabellarisch: true, typen: true },
  leseoptionen: [],
  erkennen,
  lesen,
  jsonText: () => "folge",
  // Die Zeilen selbst zeilenweise, Listen in einer Zeile wie in JSON
  eintraegeEntfernen: (text, index, liste, stellen) => (liste === 0 ? zeilenweise(text, index, liste, stellen) : mitTrennern(index, liste, stellen)),
  spalteEntfernen: (text, index, liste, spalte) => mitgliederEntfernen(text, index, liste, spalte),
  wertSchreiben: (_text, index, k, neu) => {
    if (k === 0) throw new Formatfehler("Die Wurzel ist die Liste der Zeilen und wird nicht ersetzt");
    return jsonWertSchreiben(index, k, neu);
  },
};
