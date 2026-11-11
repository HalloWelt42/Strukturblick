// Worker zum Lesen: erkennt das Format (wenn nicht gewählt), liest den Text und schickt den Strukturindex zurück. Die
// typisierten Felder werden übertragen, nicht kopiert.

import { erkennen, format } from "../formate/registrierung";
import type { Strukturindex } from "../kern/strukturindex";
import type { LeseAuftrag, LeseAntwort } from "./lesen-nachrichten";

function felder(i: Strukturindex): ArrayBuffer[] {
  return [i.art, i.eltern, i.erstesKind, i.naechstes, i.kinder, i.von, i.bis, i.inhaltVon, i.inhaltBis, i.schluesselVon, i.schluesselBis].map((f) => f.buffer as ArrayBuffer);
}

self.onmessage = (e: MessageEvent<LeseAuftrag>) => {
  const a = e.data;
  const beginn = performance.now();
  try {
    const f = a.format ? format(a.format) : erkennen(a.text, a.dateiname);
    const ergebnis = f.lesen(a.text, a.optionen);
    const antwort: LeseAntwort = {
      ok: true,
      auftrag: a.auftrag,
      revision: a.revision,
      format: f.kennung,
      index: ergebnis.index,
      diagnosen: ergebnis.diagnosen,
      merkmale: ergebnis.merkmale,
      dauer: performance.now() - beginn,
    };
    (self as unknown as Worker).postMessage(antwort, ergebnis.index ? felder(ergebnis.index) : []);
  } catch (f) {
    const antwort: LeseAntwort = { ok: false, auftrag: a.auftrag, revision: a.revision, fehler: f instanceof Error ? f.message : String(f) };
    (self as unknown as Worker).postMessage(antwort);
  }
};
