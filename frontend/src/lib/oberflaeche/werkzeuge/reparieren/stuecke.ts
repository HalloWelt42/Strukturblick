// Darstellung einer Zeile vor und nach ihren Eingriffen: Stücke mit Markierung (falsch im alten, neu im neuen Text).
// Lange Zeilen (JSON Lines mit großen Datensätzen) werden auf ein Fenster um die Eingriffe gekürzt.

import { zeichenUnterschied, type Eingriff, type Zeilenbefund } from "../../../analyse/reparatur/reparatur";

export interface Stueck {
  readonly text: string;
  readonly mark: boolean;
}

/** Zeilen bis zu dieser Länge werden ganz gezeigt */
const GANZ = 600;
/** Rand um die Eingriffe bei längeren Zeilen */
const RAND = 100;

function fenster(b: Zeilenbefund): { von: number; bis: number } {
  if (b.bis - b.von <= GANZ) return { von: b.von, bis: b.bis };
  const stellen = [...b.eingriffe.flatMap((e) => [e.von, e.bis]), ...(b.ungeloest ? [b.ungeloest.von] : [])];
  if (!stellen.length) return { von: b.von, bis: b.von + GANZ };
  return { von: Math.max(b.von, Math.min(...stellen) - RAND), bis: Math.min(b.bis, Math.max(...stellen) + RAND) };
}

function rahmen(b: Zeilenbefund, f: { von: number; bis: number }, stuecke: Stueck[]): Stueck[] {
  if (f.von > b.von) stuecke.unshift({ text: "...", mark: false });
  if (f.bis < b.bis) stuecke.push({ text: "...", mark: false });
  return stuecke.filter((s) => s.text !== "");
}

/** Alte Zeile: was entfernt wird oder wo etwas fehlt, ist markiert. */
export function vorher(text: string, b: Zeilenbefund): Stueck[] {
  const f = fenster(b);
  const aus: Stueck[] = [];
  let pos = f.von;
  b.eingriffe.forEach((e, i) => {
    if (e.von < pos) return;
    aus.push({ text: text.slice(pos, e.von), mark: false });
    pos = e.von;
    if (e.bis === e.von) {
      // reines Einfügen: das Zeichen an der Stelle zeigt, wo etwas fehlt (sofern dort kein weiterer Eingriff beginnt)
      const naechstes = Math.min(e.von + 1, b.bis);
      const frei = (b.eingriffe[i + 1]?.von ?? Infinity) >= naechstes;
      aus.push({ text: frei ? text.slice(e.von, naechstes) || " " : " ", mark: true });
      if (frei) pos = naechstes;
      return;
    }
    for (const s of zeichenUnterschied(text.slice(e.von, e.bis), e.neu)) if (s.art !== "neu") aus.push({ text: s.text, mark: s.art === "weg" });
    pos = e.bis;
  });
  if (b.ungeloest && b.ungeloest.von >= pos) {
    aus.push({ text: text.slice(pos, b.ungeloest.von), mark: false }, { text: text.slice(b.ungeloest.von, b.ungeloest.von + 1) || " ", mark: true });
    pos = Math.min(b.ungeloest.von + 1, f.bis);
  }
  aus.push({ text: text.slice(pos, f.bis), mark: false });
  return rahmen(b, f, aus);
}

/** Neue Zeile: Eingefügtes ist markiert, Entferntes fehlt. */
export function nachher(text: string, b: Zeilenbefund, eingriffe: readonly Eingriff[] = b.eingriffe): Stueck[] {
  const f = fenster(b);
  const aus: Stueck[] = [];
  let pos = f.von;
  for (const e of eingriffe) {
    aus.push({ text: text.slice(pos, e.von), mark: false });
    for (const s of zeichenUnterschied(text.slice(e.von, e.bis), e.neu)) if (s.art !== "weg") aus.push({ text: s.text === "\n" ? "\u21b5\n" : s.text, mark: s.art === "neu" });
    pos = e.bis;
  }
  aus.push({ text: text.slice(pos, f.bis), mark: false });
  return rahmen(b, f, aus);
}

/** Spalte ab 1 einer Stelle in der Zeile */
export const spalte = (b: { von: number }, pos: number): number => pos - b.von + 1;
