// Ergänzung mit Bezug auf die echten Daten: Welche Felder gibt es an der Stelle, an der gerade getippt wird? Aus dem
// Text vor der Schreibmarke wird ein Pfad (jq: .bestellungen[].kunde., JSONPath: $.bestellungen[*].kunde.), der im
// Strukturindex aufgelöst wird; vorgeschlagen werden die Schlüssel der Objekte dort, häufigste zuerst. Ohne erkennbaren
// Pfad: alle Schlüssel des Dokuments. Rein, ohne Browser.

import { KEIN, KnotenArt, schluessel, type Strukturindex } from "../../kern/strukturindex";

export type Schritt = { readonly art: "schluessel"; readonly name: string } | { readonly art: "eintraege" };

/** Höchstens so viele Knoten werden je Schritt verfolgt (große Listen: eine Stichprobe genügt für die Schlüssel) */
const STICHPROBE = 2000;

const IDENT = String.raw`[\p{L}_][\p{L}\p{N}_]*`;
const KETTE = new RegExp(String.raw`(?:\.${IDENT}|\."(?:[^"\\]|\\.)*"|\.?\[(?:\d*|\*|\?\([^)]*\)|'[^']*'|"[^"]*")\])*`, "uy");

/** Zerlegt eine Pfadkette in Schritte; Filter und Stellen zählen als "alle Einträge" */
function schritteAus(kette: string): Schritt[] {
  const s: Schritt[] = [];
  const re = new RegExp(String.raw`\.(${IDENT})|\."((?:[^"\\]|\\.)*)"|\.?\[(?:'([^']*)'|"([^"]*)"|[^\]]*)\]`, "gu");
  for (const m of kette.matchAll(re)) {
    const name = m[1] ?? m[2] ?? m[3] ?? m[4];
    s.push(name !== undefined ? { art: "schluessel", name } : { art: "eintraege" });
  }
  return s;
}

/** Tiefe 0 der Klammern vor der Schreibmarke: Teile, getrennt an Röhren | (jq) */
function stufen(vor: string): { stufen: string[]; offen: string[] } {
  const stufen: string[] = [];
  const offen: string[] = [];         // je offener Klammer der Text davor (für map( und select()
  let anfang = 0;
  for (let i = 0; i < vor.length; i++) {
    const z = vor[i];
    if (z === '"') {
      for (i++; i < vor.length && vor[i] !== '"'; i++) if (vor[i] === "\\") i++;
    } else if (z === "(" || z === "[" || z === "{") offen.push(vor.slice(anfang, i));
    else if (z === ")" || z === "]" || z === "}") offen.pop();
    else if (z === "|" && offen.length === 0 && vor[i + 1] !== "=" && vor[i - 1] !== "|") {
      stufen.push(vor.slice(anfang, i));
      anfang = i + 1;
    }
  }
  stufen.push(vor.slice(anfang));
  return { stufen, offen };
}

/** Ist eine Stufe ein reiner Pfad (.a[].b), der den Zusammenhang weiterträgt? */
const reinerPfad = (t: string): Schritt[] | null => {
  const s = t.trim();
  if (s === ".") return [];
  KETTE.lastIndex = 0;
  const m = KETTE.exec(s);
  return m && m[0].length === s.length && s.startsWith(".") ? schritteAus(s) : null;
};

/**
 * Pfad an der Schreibmarke für jq: frühere reine Pfadstufen, dazu die Kette direkt vor der Schreibmarke ohne ihr
 * letztes, noch unfertiges Glied. In map( oder select( gilt der Zusammenhang der Stufe davor (map: ihre Einträge).
 * null, wenn kein Pfad zu erkennen ist.
 */
export function jqPfadVorSchreibmarke(vor: string): Schritt[] | null {
  const { stufen: teile } = stufen(vor);
  const aktuell = teile.pop() ?? "";
  const davor: Schritt[] = [];
  for (const t of teile) {
    const p = reinerPfad(t);
    if (p) davor.push(...p);
    else if (!/^\s*(select|sort_by|unique_by|group_by|limit|first|last)\s*\(/.test(t)) return null;
  }
  // Kette am Ende der aktuellen Stufe, bis zum letzten Punkt (das Glied danach ist das unfertige)
  const ende = /((?:\.[\p{L}_][\p{L}\p{N}_]*|\.?\[[^\]]*\])*)\.[\p{L}\p{N}_]*$/u.exec(aktuell);
  if (!ende) return null;
  const vorKette = aktuell.slice(0, ende.index);
  const schritte = schritteAus(ende[1]);
  // map(... läuft über die Einträge der Eingabe; select(... und Co. behalten sie
  if (/map\s*\(\s*$/.test(vorKette) || /map\s*\([^()]*$/.test(vorKette)) return [...davor, { art: "eintraege" }, ...schritte];
  return [...davor, ...schritte];
}

/** Pfad an der Schreibmarke für JSONPath: $ und die Kette bis zum letzten Punkt */
export function jsonpathPfadVorSchreibmarke(vor: string): Schritt[] | null {
  const m = /\$((?:\.[\p{L}_][\p{L}\p{N}_]*|\.?\[[^\]]*\]|\.\.)*)\.[\p{L}\p{N}_]*$/u.exec(vor);
  if (!m || m[1].includes("..")) return null;
  return schritteAus(m[1]);
}

/** Pfad an der Schreibmarke je Sprache; null, wenn die Sprache keine Felder ergänzt oder kein Pfad zu erkennen ist */
export function pfadVorSchreibmarke(sprache: string, vor: string): Schritt[] | null {
  if (sprache === "jq") return jqPfadVorSchreibmarke(vor);
  if (sprache === "jsonpath") return jsonpathPfadVorSchreibmarke(vor);
  return null;
}

/** Schlüssel der Objekte am Pfad, häufigste zuerst; ohne Pfad alle Schlüssel des Dokuments */
export function schluesselAm(index: Strukturindex, text: string, pfad: readonly Schritt[] | null, hoechstens = 500): string[] {
  if (index.anzahl === 0) return [];
  let knoten = [0];
  if (pfad === null) {
    // ganzer Baum, Breitensuche
    const zaehler = new Map<string, number>();
    for (let k = 1; k < index.anzahl && zaehler.size < hoechstens; k++) {
      const n = schluessel(index, text, k);
      if (n !== null) zaehler.set(n, (zaehler.get(n) ?? 0) + 1);
    }
    return [...zaehler.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  }
  for (const s of pfad) {
    const weiter: number[] = [];
    for (const k of knoten) {
      for (let c = index.erstesKind[k]; c !== KEIN && weiter.length < STICHPROBE; c = index.naechstes[c]) {
        if (s.art === "eintraege" ? index.art[k] === KnotenArt.liste : schluessel(index, text, c) === s.name) weiter.push(c);
      }
    }
    knoten = weiter;
  }
  const zaehler = new Map<string, number>();
  for (const k of knoten) {
    if (index.art[k] !== KnotenArt.objekt) continue;
    for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) {
      const n = schluessel(index, text, c);
      if (n !== null) zaehler.set(n, (zaehler.get(n) ?? 0) + 1);
    }
  }
  return [...zaehler.entries()].sort((a, b) => b[1] - a[1]).slice(0, hoechstens).map(([n]) => n);
}
