// jq (echtes jq 1.8 als WebAssembly). Ablauf je Auftrag:
// 1. Übersetzen prüfen, ohne zu rechnen (`if false then (...) else empty end` an null): Fehler im Ausdruck kommen so mit
//    Zeile und Spalte, und ein Ausdruck, der endlos rechnet, rechnet hier nicht.
// 2. Werte und Treffer in einem Lauf, damit jq das Dokument nur einmal liest: `{w: [Ausdruck], p: [Pfade]}`. Die Pfade
//    kommen vom längsten vorderen Teil, der noch auswählt (siehe analyse/abfrage/jqpfad.ts).

import type { Jq } from "jq-wasm";
import { pfadAusdruck, vordereTeile, zeigerAusPfad } from "../../analyse/abfrage/jqpfad";
import type { Teil } from "../../kern/pfade";
import { werteErgebnis } from "./stuecke";
import { wurf, zielVon, type Maschine } from "./maschine";

const STELLE = /line (\d+), column (\d+)/;

/** jq-Fehlertext für Menschen; Zeilen um `versatz` verschoben (Einpacken in Schritt 1). Stößt jq erst an der
 *  schließenden Klammer der Hülle an, endet der Ausdruck zu früh. */
function fehlerVon(stderr: string, versatz: number, ausdruck: string): ReturnType<typeof wurf> {
  const erste = stderr.split("\n")[0].replace(/^jq: error(?: \(at [^)]*\))?: /, "");
  const s = STELLE.exec(stderr);
  const zeilen = ausdruck.split("\n");
  if (s && Number(s[1]) === zeilen.length + versatz + 1) return wurf("Ausdruck unvollständig", zeilen.length, zeilen.at(-1)!.length + 1);
  const zeile = s ? Math.max(1, Number(s[1]) - versatz) : null;
  const spalte = s ? Number(s[2]) : null;
  const kern = erste.replace(/ at <top-level>, line \d+, column \d+:?$/, "").replace(/ at <top-level>, line \d+:?$/, "");
  if (/unexpected end of file|unexpected INVALID_CHARACTER \(Unix shell quoting issues\?\)|unexpected \$end/.test(kern)) return wurf("Ausdruck unvollständig", zeile, spalte);
  if (kern.startsWith("syntax error")) return wurf(`Ausdruck ungültig: ${kern.replace(/^syntax error, /, "")}`, zeile, spalte);
  if (/is not defined/.test(kern)) return wurf(`Unbekannt: ${kern}`, zeile, spalte);
  return wurf(s ? `Ausdruck ungültig: ${kern}` : `Fehler beim Rechnen: ${kern}`, zeile, spalte);
}

const uebersetzbar = (jq: Jq, ausdruck: string): string | null => {
  const r = jq.raw(null, `if false then (\n${ausdruck}\n) else empty end`);
  return r.exitCode === 0 ? null : r.stderr;
};

export function jqMaschine(laden: () => Promise<Jq>): Maschine {
  let jq: Promise<Jq> | null = null;
  return async (a, q) => {
    const j = await (jq ??= laden());
    const ausdruck = a.ausdruck.trim() || ".";
    const fehler = uebersetzbar(j, ausdruck);
    if (fehler) throw fehlerVon(fehler, 1, ausdruck);

    const ein = q.jqEingabe(zielVon(a));
    const flags = ein.folge ? ["-s"] : [];
    const teile = a.ganz ? [] : vordereTeile(ausdruck).filter((t) => uebersetzbar(j, pfadAusdruck(t)) === null);
    const pfade = teile.map((t) => `(try ${pfadAusdruck(t)} catch null)`).join(", ");
    const r = j.raw(ein.text, `{w: [\n${ausdruck}\n], p: [${pfade}]}`, ["-c", ...flags]);
    if (r.exitCode !== 0) throw fehlerVon(r.stderr, 1, ausdruck);
    const { w, p } = JSON.parse(r.stdout) as { w: unknown[]; p: (Teil[][] | null)[] };

    const gefunden = p.findIndex((x) => x !== null);
    const treffer = gefunden < 0 ? null : (p[gefunden] as Teil[][]).map(zeigerAusPfad);
    // Stammen die Treffer vom ganzen Ausdruck, gehört zu jedem Wert genau ein Ort
    const orte = gefunden === 0 && teile[0] === ausdruck && treffer && treffer.length === w.length ? treffer : null;
    return werteErgebnis(w, orte, treffer, a.ganz);
  };
}
