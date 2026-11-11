// Einträge einer Liste entfernen, ohne das Dokument neu zu schreiben (Leitgedanke 1, Regel A3): nur die Textstellen der
// entfernten Einträge verschwinden, alles andere (Formatierung, Kommentare, Dialekt) bleibt. Zwei Verfahren, die Formate
// wählen je Liste: mit Trennzeichen (JSON, YAML in Klammern) oder zeilenweise (NDJSON, CSV, YAML als Block).

import { KEIN, type Strukturindex } from "../kern/strukturindex";
import type { TextAenderung } from "../kern/format";

function kinder(index: Strukturindex, liste: number): number[] {
  const k: number[] = [];
  for (let c = index.erstesKind[liste]; c !== KEIN; c = index.naechstes[c]) k.push(c);
  return k;
}

/** Läufe aufeinanderfolgender entfernter Einträge als Stellen [erste, letzte] */
function laeufe(anzahl: number, weg: ReadonlySet<number>): [number, number][] {
  const l: [number, number][] = [];
  for (let i = 0; i < anzahl; i++) {
    if (!weg.has(i)) continue;
    const anfang = i;
    while (i + 1 < anzahl && weg.has(i + 1)) i++;
    l.push([anfang, i]);
  }
  return l;
}

/**
 * Mit Trennzeichen: ein Lauf hinter einem bleibenden Eintrag fällt samt Komma davor weg (", b, c"), ein Lauf am Anfang
 * samt Komma danach ("a, b, " vor dem ersten bleibenden), fällt alles weg, bleiben die Klammern.
 */
export function mitTrennern(index: Strukturindex, liste: number, stellen: readonly number[]): TextAenderung[] {
  const k = kinder(index, liste);
  return laeufe(k.length, new Set(stellen)).map(([a, b]) => {
    if (a > 0) return { von: index.bis[k[a - 1]], bis: index.bis[k[b]], einfuegen: "" };
    if (b + 1 < k.length) return { von: index.von[k[a]], bis: index.von[k[b + 1]], einfuegen: "" };
    return { von: index.von[k[a]], bis: index.bis[k[b]], einfuegen: "" };
  });
}

/** Zeilenanfang vor einer Stelle */
const zeilenanfang = (text: string, pos: number): number => text.lastIndexOf("\n", pos - 1) + 1;

/** Hinter dem Zeilenende eines Eintrags (der Eintrag kann schon mit dem Umbruch enden, etwa in YAML) */
function hinterZeile(text: string, bis: number): number {
  if (bis > 0 && text[bis - 1] === "\n") return bis;
  const n = text.indexOf("\n", bis);
  return n < 0 ? text.length : n + 1;
}

/** Zeilenweise: jeder entfernte Eintrag nimmt seine ganzen Zeilen mit (vom Zeilenanfang bis hinter den Umbruch). */
export function zeilenweise(text: string, index: Strukturindex, liste: number, stellen: readonly number[]): TextAenderung[] {
  const k = kinder(index, liste);
  return laeufe(k.length, new Set(stellen)).map(([a, b]) => ({ von: zeilenanfang(text, index.von[k[a]]), bis: hinterZeile(text, index.bis[k[b]]), einfuegen: "" }));
}
