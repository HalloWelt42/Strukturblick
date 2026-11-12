// XPath über XML-Dokumente (STB-51), gerechnet von libxml2 (dieselbe Bibliothek wie die Prüfung gegen XML Schema, als
// WebAssembly, erst beim ersten Gebrauch geladen). Getroffene Knoten werden in Zeiger der Lesart von Strukturblick
// übersetzt (formate/xml/lesen.ts): Wurzel ist ein Objekt mit dem Wurzelelement als Feld, Attribute heißen "@name",
// Text neben Kind-Elementen "#text", gleichnamige Geschwister werden eine Liste, ein Element nur mit Text ist Text.
// So sind XPath-Treffer Sprungziele wie bei jq und JSONPath. Präfixe der Namensräume gelten wie im Dokument deklariert.

import type { XmlElement, XmlNode } from "libxml2-wasm";
import { zeigerAus, type Teil } from "../../kern/pfade";
import { ATTRIBUT, TEXT } from "../../formate/xml/lesen";

type Bibliothek = typeof import("libxml2-wasm");
let bibliothek: Promise<Bibliothek> | null = null;
const laden = (): Promise<Bibliothek> => (bibliothek ??= import("libxml2-wasm"));

export type XpathErgebnis =
  | { readonly art: "knoten"; readonly zeiger: readonly (string | null)[]; readonly texte: readonly string[] }
  | { readonly art: "wert"; readonly wert: string | number | boolean };

export class XpathFehler extends Error {}

const qname = (n: { name: string; prefix: string }): string => (n.prefix ? `${n.prefix}:${n.name}` : n.name);

/** Alle im Dokument deklarierten Präfixe (für Ausdrücke wie //xs:element); ein Präfix gilt mit seiner ersten Bedeutung */
function namensraeume(lx: Bibliothek, wurzel: XmlElement): Record<string, string> {
  const ns: Record<string, string> = {};
  const besuchen = (el: XmlElement): void => {
    for (const [p, uri] of Object.entries(el.namespaces)) if (p && !(p in ns)) ns[p] = uri;
    for (let c = el.firstChild; c; c = c.next) if (c instanceof lx.XmlElement) besuchen(c);
  };
  besuchen(wurzel);
  return ns;
}

/** Kind-Elemente in Dokumentreihenfolge */
function elementKinder(lx: Bibliothek, el: XmlElement): XmlElement[] {
  const aus: XmlElement[] = [];
  for (let c = el.firstChild; c; c = c.next) if (c instanceof lx.XmlElement) aus.push(c);
  return aus;
}

/** Text, der in der Lesart zählt (nicht nur Leerraum) */
const traegtText = (lx: Bibliothek, n: XmlNode): boolean => (n instanceof lx.XmlText || n instanceof lx.XmlCData) && n.content.trim() !== "";

/** Element nur mit Text (oder leer) und ohne Attribute: in der Lesart selbst ein Textwert */
const nurText = (lx: Bibliothek, el: XmlElement): boolean => el.attrs.length === 0 && elementKinder(lx, el).length === 0;

function elementTeile(lx: Bibliothek, el: XmlElement): Teil[] {
  const kette: XmlElement[] = [];
  for (let e: XmlElement | null = el; e; e = e.parent) kette.unshift(e);
  const teile: Teil[] = [qname(kette[0])];
  for (let i = 1; i < kette.length; i++) {
    const e = kette[i];
    const name = qname(e);
    const gleich = elementKinder(lx, kette[i - 1]).filter((c) => qname(c) === name);
    teile.push(name);
    if (gleich.length > 1) {
      let stelle = 0;
      for (let p = e.prev; p; p = p.prev) if (p instanceof lx.XmlElement && qname(p) === name) stelle++;
      teile.push(stelle);
    }
  }
  return teile;
}

/** Zeiger eines getroffenen Knotens in der Lesart von Strukturblick; null bei Knoten, die dort nicht vorkommen */
function zeigerVon(lx: Bibliothek, n: XmlNode): string | null {
  if (n instanceof lx.XmlElement) return zeigerAus(elementTeile(lx, n));
  if (n instanceof lx.XmlAttribute) {
    const el = n.parent;
    return el ? zeigerAus([...elementTeile(lx, el), ATTRIBUT + qname(n)]) : null;
  }
  if (n instanceof lx.XmlText || n instanceof lx.XmlCData) {
    const el = n.parent;
    if (!el || !traegtText(lx, n)) return null;
    if (nurText(lx, el)) return zeigerAus(elementTeile(lx, el));
    const texte: XmlNode[] = [];
    for (let c = el.firstChild; c; c = c.next) if (traegtText(lx, c)) texte.push(c);
    let stelle = 0;
    for (let p = n.prev; p; p = p.prev) if (traegtText(lx, p)) stelle++;
    return zeigerAus([...elementTeile(lx, el), TEXT, ...(texte.length > 1 ? [stelle] : [])]);
  }
  return null;
}

export async function xpathAuswerten(text: string, ausdruck: string): Promise<XpathErgebnis> {
  const lx = await laden();
  let doc;
  try {
    doc = lx.XmlDocument.fromString(text);
  } catch (f) {
    throw new XpathFehler(`Das Dokument ist kein wohlgeformtes XML: ${(f as Error).message}`);
  }
  try {
    let r: XmlNode[] | string | number | boolean;
    try {
      r = doc.eval(ausdruck, namensraeume(lx, doc.root));
    } catch (f) {
      throw new XpathFehler(`XPath ungültig: ${(f as Error).message}`);
    }
    if (!Array.isArray(r)) return { art: "wert", wert: r };
    return { art: "knoten", zeiger: r.map((n) => zeigerVon(lx, n)), texte: r.map((n) => n.content) };
  } finally {
    doc.dispose();
  }
}
