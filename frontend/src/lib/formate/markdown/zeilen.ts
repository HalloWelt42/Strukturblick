// Markdown-Tabellen: Zeilen finden und in Zellen zerlegen. Eine Tabelle ist eine Kopfzeile, darunter eine Trennzeile
// (|---|:--:|), darunter Datenzeilen bis zur ersten Zeile ohne senkrechten Strich. Äußere Striche sind freiwillig,
// \| ist ein Strich im Inhalt. Positionen sind String-Indizes wie im Editor.

export interface Zelle {
  /** Ganze Zelle zwischen den Strichen (ohne sie) */
  readonly von: number;
  readonly bis: number;
  /** Inhalt ohne Leerraum am Rand */
  readonly inhaltVon: number;
  readonly inhaltBis: number;
  /** Nur wenn er vom Ausschnitt abweicht (\| oder <br>) */
  readonly dekodiert?: string;
}

export interface Zeile {
  readonly von: number;
  readonly bis: number;
}

export interface Tabellenfund {
  readonly kopf: Zeile;
  readonly trenner: Zeile;
  readonly zeilen: Zeile[];
  /** Überschrift direkt vor der Tabelle (# Titel), Spanne des Titels */
  readonly titel: { von: number; bis: number } | null;
}

const TRENNZELLE = /^\s*:?-{3,}:?\s*$/;

/** Alle Zeilen des Texts mit Spanne (ohne Umbruch und ohne \r) */
export function zeilenVon(t: string): Zeile[] {
  const aus: Zeile[] = [];
  let von = 0;
  for (;;) {
    const n = t.indexOf("\n", von);
    const bis = n === -1 ? t.length : n;
    aus.push({ von, bis: bis > von && t[bis - 1] === "\r" ? bis - 1 : bis });
    if (n === -1) return aus;
    von = n + 1;
  }
}

/** Positionen der trennenden Striche einer Zeile (ohne maskierte \|) */
function striche(t: string, z: Zeile): number[] {
  const aus: number[] = [];
  for (let i = z.von; i < z.bis; i++) {
    if (t[i] === "\\") { i++; continue; }
    if (t[i] === "|") aus.push(i);
  }
  return aus;
}

/** Zellen einer Tabellenzeile; äußere Striche zählen nicht als Zellgrenze nach außen */
export function zellen(t: string, z: Zeile): Zelle[] {
  const s = striche(t, z);
  let a = z.von;
  while (a < z.bis && (t[a] === " " || t[a] === "\t")) a++;
  let e = z.bis;
  while (e > a && (t[e - 1] === " " || t[e - 1] === "\t")) e--;
  const grenzen = [s[0] === a ? a : a - 1, ...s.filter((p) => p !== a && p !== e - 1), s[s.length - 1] === e - 1 ? e - 1 : e];
  const aus: Zelle[] = [];
  for (let i = 0; i + 1 < grenzen.length; i++) {
    const von = grenzen[i] + 1;
    const bis = grenzen[i + 1];
    let iv = von;
    let ib = bis;
    while (iv < ib && /\s/.test(t[iv])) iv++;
    while (ib > iv && /\s/.test(t[ib - 1])) ib--;
    const roh = t.slice(iv, ib);
    const dek = roh.replace(/\\\|/g, "|").replace(/<br\s*\/?>/gi, "\n");
    aus.push({ von, bis, inhaltVon: iv, inhaltBis: ib, dekodiert: dek === roh ? undefined : dek });
  }
  return aus;
}

const istTrennzeile = (t: string, z: Zeile): boolean => {
  if (!t.slice(z.von, z.bis).includes("-")) return false;
  const c = zellen(t, z);
  return c.length > 0 && c.every((x) => TRENNZELLE.test(t.slice(x.von, x.bis)));
};
const hatStrich = (t: string, z: Zeile): boolean => striche(t, z).length > 0;

/** Alle Tabellen des Texts in Textreihenfolge */
export function tabellenFinden(t: string): Tabellenfund[] {
  const zeilen = zeilenVon(t);
  const aus: Tabellenfund[] = [];
  let titel: { von: number; bis: number } | null = null;
  for (let i = 0; i + 1 < zeilen.length; i++) {
    const z = zeilen[i];
    const roh = t.slice(z.von, z.bis);
    const h = /^(\s{0,3}#{1,6}\s+)(.*?)\s*#*\s*$/.exec(roh);
    if (h) { titel = { von: z.von + h[1].length, bis: z.von + h[1].length + h[2].length }; continue; }
    // Text zwischen Überschrift und Tabelle lässt den Titel stehen
    if (!hatStrich(t, z) || !istTrennzeile(t, zeilen[i + 1])) continue;
    const daten: Zeile[] = [];
    let j = i + 2;
    while (j < zeilen.length && hatStrich(t, zeilen[j]) && t.slice(zeilen[j].von, zeilen[j].bis).trim() !== "") daten.push(zeilen[j++]);
    aus.push({ kopf: z, trenner: zeilen[i + 1], zeilen: daten, titel });
    titel = null;
    i = j - 1;
  }
  return aus;
}
