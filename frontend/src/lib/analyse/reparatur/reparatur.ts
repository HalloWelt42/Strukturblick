// Reparatur eines Dokuments als JSON oder JSON Lines: der Flicker liefert Eingriffe, hier werden sie je Textzeile
// gebündelt, bei JSON Lines um fehlende übliche Felder ergänzt, und die gewählten Zeilen als Textänderungen angewendet.
// Ohne Browser, damit Tests und Worker es nutzen können.

import { anwenden, type TextAenderung } from "../../kern/aenderung";
import { format } from "../../formate/registrierung";
import { flicken } from "./flicker";
import type { Eingriff, Flickergebnis, Hinweis, Leseart, Reparatur, Ungeloest, Zeilenbefund } from "./typen";

export type * from "./typen";

/** Ein Feld gilt bei JSON Lines als üblich, wenn es in so vielen der heilen Datensätze steht. */
const UEBLICH_ANTEIL = 0.9;
/** Für die üblichen Felder werden höchstens so viele heile Zeilen gelesen. */
const UEBLICH_STICHPROBE = 5000;

interface Textzeile {
  readonly nummer: number;
  readonly von: number;
  readonly bis: number;
}

/** Alle Textzeilen mit ihrer Spanne (ohne Umbruch); ein Umbruch am Ende beginnt keine weitere Zeile. */
function textzeilen(text: string): Textzeile[] {
  const zeilen: Textzeile[] = [];
  let von = 0;
  for (let nummer = 1; ; nummer++) {
    const umbruch = text.indexOf("\n", von);
    const bis = umbruch === -1 ? text.length : umbruch;
    if (umbruch === -1 && von === text.length && nummer > 1) return zeilen;
    zeilen.push({ nummer, von, bis: bis > von && text[bis - 1] === "\r" ? bis - 1 : bis });
    if (umbruch === -1) return zeilen;
    von = umbruch + 1;
  }
}

/** Index der Zeile, in der `pos` liegt (binäre Suche). */
function zeileVon(zeilen: readonly Textzeile[], pos: number): number {
  let lo = 0;
  let hi = zeilen.length - 1;
  while (lo < hi) {
    const mitte = (lo + hi + 1) >> 1;
    if (zeilen[mitte].von <= pos) lo = mitte;
    else hi = mitte - 1;
  }
  return lo;
}

/** Formate, deren Text die Reparatur lesbar machen kann */
const REPARIERBAR: readonly string[] = ["json", "ndjson"];

export const kannReparieren = (formatKennung: string | null | undefined): boolean => REPARIERBAR.includes(formatKennung ?? "");

/** Die naheliegende Leseart: aus dem Format des Dokuments, sonst am Inhalt (mehrere Zeilen, die mit { beginnen). */
export function lesartVermuten(text: string, formatKennung: string | null): { als: Leseart; grund: string } {
  if (formatKennung === "ndjson") return { als: "ndjson", grund: "Format des Dokuments" };
  if (formatKennung === "json") return { als: "json", grund: "Format des Dokuments" };
  const zeilen = text.split("\n", 200).map((z) => z.trim()).filter(Boolean);
  const mitKlammer = zeilen.filter((z) => z.startsWith("{")).length;
  return zeilen.length > 1 && mitKlammer >= zeilen.length * 0.8 ? { als: "ndjson", grund: "am Inhalt erkannt: ein Datensatz je Zeile" } : { als: "json", grund: "am Inhalt erkannt" };
}

export function reparieren(text: string, als: Leseart): Reparatur {
  const zeilen = textzeilen(text);
  const befunde = als === "json" ? jsonBefunde(text, zeilen) : zeilenBefunde(text, zeilen);
  return { als, zeilen: zeilen.length, befunde };
}

function jsonBefunde(text: string, zeilen: readonly Textzeile[]): Zeilenbefund[] {
  const g = flicken(text, 0, text.length, { jsonc: true, zeilenweise: false });
  const je = new Map<number, { eingriffe: Eingriff[]; hinweise: string[]; ungeloest: Ungeloest | null }>();
  const fach = (pos: number) => {
    const i = zeileVon(zeilen, pos);
    let f = je.get(i);
    if (!f) je.set(i, (f = { eingriffe: [], hinweise: [], ungeloest: null }));
    return f;
  };
  for (const e of g.eingriffe) fach(e.von).eingriffe.push(e);
  for (const h of g.hinweise) fach(h.von).hinweise.push(h.text);
  if (g.ungeloest) fach(g.ungeloest.von).ungeloest = g.ungeloest;
  return [...je.entries()].sort((a, b) => a[0] - b[0]).map(([i, f]) => ({ zeile: zeilen[i].nummer, von: zeilen[i].von, bis: zeilen[i].bis, ...f, felder: null }));
}

function zeilenBefunde(text: string, zeilen: readonly Textzeile[]): Zeilenbefund[] {
  const roh: { z: Textzeile; g: Flickergebnis }[] = [];
  const heile: Textzeile[] = [];
  for (const z of zeilen) {
    if (!text.slice(z.von, z.bis).trim()) continue;
    const g = flicken(text, z.von, z.bis, { jsonc: false, zeilenweise: true });
    if (g.eingriffe.length || g.hinweise.length || g.ungeloest) roh.push({ z, g });
    else if (heile.length < UEBLICH_STICHPROBE) heile.push(z);
  }
  const ueblich = ueblicheFelder(text, heile);
  return roh.map(({ z, g }) => {
    const felder = g.ungeloest ? null : felderNach(zeilentextNach(text, z, g.eingriffe), ueblich);
    const hinweise = g.hinweise.map((h: Hinweis) => h.text);
    if (felder?.fehlend.length) hinweise.push(`${felder.fehlend.join(", ")} ${felder.fehlend.length === 1 ? "fehlt" : "fehlen"}. Nichts wird erfunden: bitte von Hand ergänzen`);
    return { zeile: z.nummer, von: z.von, bis: z.bis, eingriffe: g.eingriffe, hinweise, ungeloest: g.ungeloest, felder };
  });
}

function ueblicheFelder(text: string, heile: readonly Textzeile[]): string[] {
  const zaehler = new Map<string, number>();
  let objekte = 0;
  for (const z of heile) {
    const w = sicherLesen(text.slice(z.von, z.bis));
    if (!istObjekt(w)) continue;
    objekte++;
    for (const k of Object.keys(w)) zaehler.set(k, (zaehler.get(k) ?? 0) + 1);
  }
  if (objekte < 2) return [];
  return [...zaehler].filter(([, n]) => n >= objekte * UEBLICH_ANTEIL).map(([k]) => k);
}

function felderNach(zeilentext: string, ueblich: readonly string[]): Zeilenbefund["felder"] {
  const w = sicherLesen(zeilentext.split("\n")[0]);
  if (!istObjekt(w)) return null;
  const vorhanden = Object.keys(w);
  return { vorhanden, fehlend: ueblich.filter((k) => !(k in w)) };
}

const istObjekt = (w: unknown): w is Record<string, unknown> => typeof w === "object" && w !== null && !Array.isArray(w);

function sicherLesen(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/** Text einer Zeile nach ihren Eingriffen. */
export function zeilentextNach(text: string, z: { von: number; bis: number }, eingriffe: readonly Eingriff[]): string {
  let aus = "";
  let pos = z.von;
  for (const e of eingriffe) {
    aus += text.slice(pos, e.von) + e.neu;
    pos = e.bis;
  }
  return aus + text.slice(pos, z.bis);
}

/** Eingriffe als Textänderungen; reine Einfügungen an derselben Stelle werden eine Änderung. */
export function alsAenderungen(eingriffe: readonly Eingriff[]): TextAenderung[] {
  const aus: TextAenderung[] = [];
  for (const e of [...eingriffe].sort((a, b) => a.von - b.von || a.bis - b.bis)) {
    const letzte = aus[aus.length - 1];
    if (letzte && letzte.von === e.von && letzte.bis === letzte.von) aus[aus.length - 1] = { von: e.von, bis: e.bis, einfuegen: letzte.einfuegen + e.neu };
    else aus.push({ von: e.von, bis: e.bis, einfuegen: e.neu });
  }
  return aus;
}

export interface Zeichenstueck {
  readonly text: string;
  readonly art: "gleich" | "weg" | "neu";
}

/** Bis zu dieser Länge wird ein Eingriff zeichengenau verglichen; längere gelten als ganz ersetzt. */
const FEIN_BIS = 400;

/** Zeichengenauer Unterschied eines Eingriffs (längste gemeinsame Teilfolge): aus 'x' wird "x" mit zwei Tauschen. */
export function zeichenUnterschied(alt: string, neu: string): Zeichenstueck[] {
  if (!alt || !neu || alt.length > FEIN_BIS || neu.length > FEIN_BIS) return [...(alt ? [{ text: alt, art: "weg" as const }] : []), ...(neu ? [{ text: neu, art: "neu" as const }] : [])];
  const n = alt.length;
  const m = neu.length;
  const l = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) l[i][j] = alt[i] === neu[j] ? l[i + 1][j + 1] + 1 : Math.max(l[i + 1][j], l[i][j + 1]);
  const aus: Zeichenstueck[] = [];
  const hinzu = (text: string, art: Zeichenstueck["art"]) => {
    const letzte = aus[aus.length - 1];
    if (letzte?.art === art) aus[aus.length - 1] = { text: letzte.text + text, art };
    else aus.push({ text, art });
  };
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (alt[i] === neu[j]) { hinzu(alt[i], "gleich"); i++; j++; }
    else if (l[i + 1][j] >= l[i][j + 1]) hinzu(alt[i++], "weg");
    else hinzu(neu[j++], "neu");
  }
  if (i < n) hinzu(alt.slice(i), "weg");
  if (j < m) hinzu(neu.slice(j), "neu");
  return aus;
}

/** Ergänzte und gelöschte Zeichen eines Eingriffs */
export function bilanz(text: string, e: Eingriff): { ergaenzt: number; geloescht: number } {
  let ergaenzt = 0;
  let geloescht = 0;
  for (const s of zeichenUnterschied(text.slice(e.von, e.bis), e.neu)) {
    if (s.art === "neu") ergaenzt += s.text.length;
    else if (s.art === "weg") geloescht += s.text.length;
  }
  return { ergaenzt, geloescht };
}

export interface Vorhaben {
  readonly aenderungen: readonly TextAenderung[];
  readonly text: string;
  readonly ergaenzt: number;
  readonly geloescht: number;
  /** Wie viele Zeilen sich ändern */
  readonly zeilen: number;
}

/** Was das Übernehmen der gewählten Zeilen täte. */
export function vorhaben(text: string, gewaehlt: readonly Zeilenbefund[]): Vorhaben {
  const eingriffe = gewaehlt.flatMap((b) => b.eingriffe);
  const aenderungen = alsAenderungen(eingriffe);
  return {
    aenderungen,
    text: aenderungen.length ? anwenden(text, aenderungen).text : text,
    ergaenzt: eingriffe.reduce((n, e) => n + bilanz(text, e).ergaenzt, 0),
    geloescht: eingriffe.reduce((n, e) => n + bilanz(text, e).geloescht, 0),
    zeilen: gewaehlt.filter((b) => b.eingriffe.length).length,
  };
}

/** Wie gut sich der Text danach lesen lässt: Fehler insgesamt, bei JSON Lines auch die lesbaren Datensätze. */
export function nachher(text: string, als: Leseart): { fehler: number; datensaetze: number | null } {
  const ergebnis = format(als).lesen(text);
  const fehler = ergebnis.diagnosen.filter((d) => d.schwere === "fehler").length;
  if (als === "json") return { fehler, datensaetze: null };
  const zeilen = text.split("\n").filter((z) => z.trim()).length;
  return { fehler, datensaetze: zeilen - fehler };
}

/** Kurzer Steckbrief einer Zeile von JSON Lines: die ersten zwei Texte und die Zahl der Felder. */
export function zeilenSteckbrief(zeilentext: string): string {
  const w = sicherLesen(zeilentext);
  if (!istObjekt(w)) return Array.isArray(w) ? `Liste mit ${w.length} Einträgen` : "einzelner Wert";
  const texte = Object.values(w).filter((v): v is string => typeof v === "string" && v.trim() !== "").slice(0, 2);
  const n = Object.keys(w).length;
  return [...texte, `${n} ${n === 1 ? "Feld" : "Felder"}`].join(", ");
}
