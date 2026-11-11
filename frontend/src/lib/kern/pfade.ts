// Pfade nach RFC 6901 (JSON Pointer) und Schreibweisen zum Kopieren. "~" wird zu "~0", "/" zu "~1"; die Wurzel ist "".

import { KEIN, kinderVon, schluessel, stelle, type Strukturindex } from "./strukturindex";

export type Teil = string | number;

export const maskieren = (teil: string): string => teil.replaceAll("~", "~0").replaceAll("/", "~1");
export const demaskieren = (teil: string): string => teil.replaceAll("~1", "/").replaceAll("~0", "~");

export function zeigerAus(teile: readonly Teil[]): string {
  return teile.map((t) => "/" + maskieren(String(t))).join("");
}

export function teileAus(zeiger: string): string[] {
  if (zeiger === "") return [];
  if (!zeiger.startsWith("/")) throw new Error(`Kein JSON Pointer: ${zeiger}`);
  return zeiger.slice(1).split("/").map(demaskieren);
}

/** Teile des Pfads zu einem Knoten (Schlüssel als Text, Listeneinträge als Zahl). */
export function teileVon(index: Strukturindex, text: string, k: number): Teil[] {
  const teile: Teil[] = [];
  for (let c = k; index.eltern[c] !== KEIN; c = index.eltern[c]) {
    teile.push(schluessel(index, text, c) ?? stelle(index, c));
  }
  return teile.reverse();
}

export const zeigerVon = (index: Strukturindex, text: string, k: number): string => zeigerAus(teileVon(index, text, k));

/** Knoten zu einem Zeiger, KEIN wenn es ihn nicht gibt. */
export function knotenZu(index: Strukturindex, text: string, zeiger: string): number {
  if (index.anzahl === 0) return KEIN;
  let k = 0;
  for (const teil of teileAus(zeiger)) {
    let gefunden = KEIN;
    let i = 0;
    const stelleGesucht = /^(0|[1-9]\d*)$/.test(teil) ? Number(teil) : -1;
    for (const c of kinderVon(index, k)) {
      if (index.schluesselVon[c] === KEIN && !index.schluesselDekodiert.has(c)) {
        if (i === stelleGesucht) { gefunden = c; break; }
      } else if (schluessel(index, text, c) === teil) {
        gefunden = c;
        break;
      }
      i++;
    }
    if (gefunden === KEIN) return KEIN;
    k = gefunden;
  }
  return k;
}

// ----- Schreibweisen zum Kopieren -----------------------------------------------------------------------------------

const BEZEICHNER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const zitiert = (s: string): string => JSON.stringify(s);

export const SCHREIBWEISEN = ["jq", "jsonpath", "zeiger", "php", "python", "typescript"] as const;
export type Schreibweise = (typeof SCHREIBWEISEN)[number];

export const SCHREIBWEISE_NAME: Record<Schreibweise, string> = {
  jq: "jq",
  jsonpath: "JSONPath",
  zeiger: "Zeiger",
  php: "PHP",
  python: "Python",
  typescript: "TypeScript",
};

export function schreiben(teile: readonly Teil[], weise: Schreibweise): string {
  switch (weise) {
    case "zeiger":
      return zeigerAus(teile);
    case "jq":
      return teile.length === 0 ? "." : teile.map((t) => (typeof t === "number" ? `[${t}]` : BEZEICHNER.test(t) ? `.${t}` : `[${zitiert(t)}]`)).join("").replace(/^\[/, ".[");
    case "jsonpath":
      return "$" + teile.map((t) => (typeof t === "number" ? `[${t}]` : BEZEICHNER.test(t) ? `.${t}` : `[${zitiert(t)}]`)).join("");
    case "php":
      return "$daten" + teile.map((t) => (typeof t === "number" ? `[${t}]` : `['${t.replaceAll("\\", "\\\\").replaceAll("'", "\\'")}']`)).join("");
    case "python":
      return "daten" + teile.map((t) => (typeof t === "number" ? `[${t}]` : `[${zitiert(t)}]`)).join("");
    case "typescript":
      return "daten" + teile.map((t) => (typeof t === "number" ? `[${t}]` : BEZEICHNER.test(t) ? `.${t}` : `[${zitiert(t)}]`)).join("");
  }
}

/** Pfad aller gleichartigen Werte: Listenstellen werden zu "alle" ([] in jq). */
export function musterteile(teile: readonly Teil[]): (Teil | "*")[] {
  return teile.map((t) => (typeof t === "number" ? "*" : t));
}

export function musterJq(teile: readonly Teil[]): string {
  const m = musterteile(teile);
  return m.length === 0 ? "." : m.map((t) => (t === "*" ? "[]" : BEZEICHNER.test(String(t)) ? `.${t}` : `[${zitiert(String(t))}]`)).join("").replace(/^\[/, ".[");
}
