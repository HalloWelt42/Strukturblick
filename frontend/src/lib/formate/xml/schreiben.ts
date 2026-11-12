// Schreiben in XML ohne das Dokument neu zu erzeugen (Regel A3): ein Text ersetzt genau den Inhalt seines Elements
// oder Attributs (mit maskierten Zeichen), Einträge und Felder verschwinden mit ihren Zeilen, Attribute samt Leerraum
// davor. XML kennt kein null; ein solcher Wert wird abgewiesen.

import { KEIN, KnotenArt, schluessel, type Strukturindex } from "../../kern/strukturindex";
import { Formatfehler, type NeuerWert, type TextAenderung } from "../vertrag";
import { hinterZeile, zeilenanfang } from "../entfernen";
import { ATTRIBUT } from "./lesen";

function kinder(index: Strukturindex, k: number): number[] {
  const c: number[] = [];
  for (let x = index.erstesKind[k]; x !== KEIN; x = index.naechstes[x]) c.push(x);
  return c;
}

export const textMaskieren = (s: string): string => s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
export const attributMaskieren = (s: string, q: string): string => textMaskieren(s).replaceAll(q, q === '"' ? "&quot;" : "&apos;");

function alsText(neu: NeuerWert): string {
  switch (neu.art) {
    case "text":
      return neu.wert;
    case "zahl":
      return neu.roh.trim();
    case "wahrheitswert":
      return neu.wert ? "true" : "false";
    case "nichts":
      throw new Formatfehler("XML kennt kein null; den Text leeren oder das Element entfernen");
  }
}

const istAttribut = (text: string, index: Strukturindex, k: number): boolean => schluessel(index, text, k)?.startsWith(ATTRIBUT) === true && (text[index.von[k]] === '"' || text[index.von[k]] === "'");

export function wertSchreibenXml(text: string, index: Strukturindex, k: number, neu: NeuerWert): TextAenderung {
  if (index.art[k] === KnotenArt.objekt || index.art[k] === KnotenArt.liste) throw new Formatfehler("Nur einzelne Werte lassen sich so ändern");
  const s = alsText(neu);
  if (istAttribut(text, index, k)) return { von: index.von[k] + 1, bis: index.bis[k] - 1, einfuegen: attributMaskieren(s, text[index.von[k]]) };
  const von = index.von[k];
  if (text[von] === "<" && text.startsWith("/>", index.bis[k] - 2)) {
    // <a/> wird <a>neu</a>; Attribute gibt es hier nicht (sonst wäre es ein Objekt)
    const name = /^<([^\s/>]+)/.exec(text.slice(von, von + 512))?.[1] ?? "";
    return { von, bis: index.bis[k], einfuegen: `<${name}>${textMaskieren(s)}</${name}>` };
  }
  return { von: index.inhaltVon[k], bis: index.inhaltBis[k], einfuegen: textMaskieren(s) };
}

/** Spanne samt ganzer Zeile, wenn sie allein auf ihren Zeilen steht */
function mitZeilen(text: string, von: number, bis: number): TextAenderung {
  const a = zeilenanfang(text, von);
  const n = text.indexOf("\n", bis);
  const rest = text.slice(bis, n === -1 ? text.length : n);
  if (text.slice(a, von).trim() === "" && rest.trim() === "") return { von: a, bis: hinterZeile(text, bis), einfuegen: "" };
  return { von, bis, einfuegen: "" };
}

export function eintraegeEntfernenXml(text: string, index: Strukturindex, liste: number, stellen: readonly number[]): TextAenderung[] {
  const k = kinder(index, liste);
  return stellen.map((i) => mitZeilen(text, index.von[k[i]], index.bis[k[i]]));
}

export function spalteEntfernenXml(text: string, index: Strukturindex, liste: number, spalte: string): TextAenderung[] {
  return kinder(index, liste)
    .filter((o) => index.art[o] === KnotenArt.objekt)
    .flatMap((o): TextAenderung[] => {
      const c = kinder(index, o).find((x) => schluessel(index, text, x) === spalte);
      if (c === undefined) return [];
      if (istAttribut(text, index, c)) {
        let a = index.schluesselVon[c];
        while (a > 0 && /\s/.test(text[a - 1])) a--;
        return [{ von: a, bis: index.bis[c], einfuegen: "" }];
      }
      if (index.art[c] === KnotenArt.liste) return kinder(index, c).map((e) => mitZeilen(text, index.von[e], index.bis[e]));
      return [mitZeilen(text, index.von[c], index.bis[c])];
    });
}
