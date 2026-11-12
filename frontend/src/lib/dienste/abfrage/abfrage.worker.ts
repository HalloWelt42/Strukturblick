// Abfrage-Worker: hält die Dokumente (Quellen) und rechnet mit der Maschine der gewählten Sprache. jq und SQLite werden
// erst geladen, wenn ihre Sprache das erste Mal gebraucht wird; ihre WebAssembly-Dateien liegen bei der App, nichts kommt
// aus dem Netz. Endlos rechnende Aufträge beendet der Dienst, indem er den Worker beendet.

import jqWasm from "jq-wasm/jq.wasm?url";
import sqlWasm from "sql.js/dist/sql-wasm-browser.wasm?url";
import type { SprachKennung } from "../../kern/abfrage";
import { jsonpathMaschine, sucheMaschine } from "./jsonpath";
import { jqMaschine } from "./jq";
import { Abfragewurf, type Maschine } from "./maschine";
import { istStand, type AbfrageAntwort, type AbfrageNachricht } from "./nachrichten";
import { Quellen } from "./quellen";
import { sqlMaschine } from "./sql";
import { xpathMaschine } from "./xpath";

const MASCHINEN: Record<SprachKennung, Maschine> = {
  jq: jqMaschine(async () => (await import("jq-wasm")).loadJq({ wasmURL: new URL(jqWasm, self.location.href) })),
  sql: sqlMaschine(async () => (await import("sql.js")).default({ locateFile: () => sqlWasm })),
  jsonpath: jsonpathMaschine,
  xpath: xpathMaschine,
  suche: sucheMaschine,
};

const quellen = new Quellen();
const antworten = (a: AbfrageAntwort) => (self as unknown as Worker).postMessage(a);

self.onmessage = async (e: MessageEvent<AbfrageNachricht>) => {
  const { nummer, auftrag, dokumente, offen } = e.data;
  const beginn = performance.now();
  try {
    for (const d of dokumente) if (istStand(d)) quellen.setzen(d);
    quellen.behalten(offen);
    const ergebnis = await MASCHINEN[auftrag.sprache](auftrag, quellen);
    antworten({ nummer, ausgang: { ok: true, ergebnis, dauer: performance.now() - beginn } });
  } catch (f) {
    const fehler = f instanceof Abfragewurf ? f.fehler : { meldung: `Die Abfrage ist abgebrochen: ${(f as Error).message}`, zeile: null, spalte: null };
    antworten({ nummer, ausgang: { ok: false, fehler } });
  }
};
