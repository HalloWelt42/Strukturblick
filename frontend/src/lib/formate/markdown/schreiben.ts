// Schreiben in Markdown-Tabellen ohne das Dokument neu zu erzeugen (Regel A3): ein Wert ersetzt den Inhalt seiner Zelle
// (| und Zeilenumbrüche maskiert), Zeilen fallen ganz weg, eine Spalte verschwindet aus Kopf-, Trenn- und Datenzeilen
// samt ihrem Strich.

import { KEIN, KnotenArt, schluessel, type Strukturindex } from "../../kern/strukturindex";
import { Formatfehler, type NeuerWert, type TextAenderung } from "../vertrag";
import { zeilenweise } from "../entfernen";
import { zeilenVon, zellen } from "./zeilen";

export const zelleMaskieren = (s: string): string => s.replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");

export function wertSchreibenMarkdown(index: Strukturindex, k: number, neu: NeuerWert): TextAenderung {
  if (index.art[k] === KnotenArt.objekt || index.art[k] === KnotenArt.liste) throw new Formatfehler("Nur einzelne Werte lassen sich so ändern");
  const s = neu.art === "text" ? neu.wert : neu.art === "zahl" ? neu.roh.trim() : neu.art === "wahrheitswert" ? String(neu.wert) : "";
  return { von: index.inhaltVon[k], bis: index.inhaltBis[k], einfuegen: zelleMaskieren(s) };
}

export function eintraegeEntfernenMarkdown(text: string, index: Strukturindex, liste: number, stellen: readonly number[]): TextAenderung[] {
  return zeilenweise(text, index, liste, stellen);
}

export function spalteEntfernenMarkdown(text: string, index: Strukturindex, liste: number, spalte: string): TextAenderung[] {
  // Stelle der Spalte nach den Schlüsseln der ersten Zeile, die sie hat
  let j = -1;
  for (let o = index.erstesKind[liste]; o !== KEIN && j < 0; o = index.naechstes[o]) {
    let i = 0;
    for (let c = index.erstesKind[o]; c !== KEIN; c = index.naechstes[c], i++) if (schluessel(index, text, c) === spalte) { j = i; break; }
  }
  if (j < 0) return [];
  const aenderungen: TextAenderung[] = [];
  for (const z of zeilenVon(text).filter((x) => x.von >= index.von[liste] && x.bis <= index.bis[liste])) {
    const c = zellen(text, z);
    if (j >= c.length) continue;
    if (c.length < 2) throw new Formatfehler("Die letzte Spalte einer Tabelle bleibt");
    // Zelle samt dem Strich davor; die erste samt dem Strich danach
    aenderungen.push(j > 0 ? { von: c[j - 1].bis, bis: c[j].bis, einfuegen: "" } : { von: c[0].von, bis: c[1].von, einfuegen: "" });
  }
  return aenderungen;
}
