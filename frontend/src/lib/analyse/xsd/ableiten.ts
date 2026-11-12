// XML Schema aus XML-Daten ableiten, Teil 1: Sammeln. Ein Lauf über den Dokumentbaum (ohne Rekursion) sammelt je
// Erklärung, was die Daten zeigen: wie oft ein Element vorkommt, welche Kinder in welcher Reihenfolge und Zahl, welche
// Attribute immer da sind und welcher Werttyp passt. Lokale Elemente gelten je Pfad (gleich benannte an anderer Stelle
// bleiben getrennt); Elemente und Attribute aus einem anderen Namensraum werden dort global erklärt und zusammengeführt.
// Das Schreiben der Dateien liegt in ausgeben.ts.

import { xmlLesen, type Element as XmlElement } from "../../formate/xml/dom";
import { qname, XSD_NS, type QName } from "./modell";
import { Wertsammler } from "./werttyp";

const XSI_NS = "http://www.w3.org/2001/XMLSchema-instance";
export const XML_NS = "http://www.w3.org/XML/1998/namespace";

export interface Kindsammlung {
  readonly schluessel: string;
  readonly name: string;
  readonly ns: string;
  readonly global: boolean;
  /** Kleinste und größte Zahl je Elternelement, unter denen, die es haben; `mit` zählt diese Eltern */
  min: number;
  max: number;
  mit: number;
}

export interface Attributsammlung {
  readonly name: string;
  readonly ns: string;
  anzahl: number;
  readonly werte: Wertsammler;
}

export interface Deklaration {
  /** Global "{ns}lokal", lokal der Pfad ab der globalen Erklärung, benannter Typ "typ:{ns}lokal" */
  readonly schluessel: string;
  /** Element oder benannter Typ (aus xsi:type im Dokument) */
  readonly art: "element" | "typ";
  readonly name: string;
  readonly ns: string;
  readonly global: boolean;
  /** Namensraum der Schemadatei, in der die Erklärung steht */
  readonly schemaNs: string;
  anzahl: number;
  /** Vorkommen mit Kind-Elementen */
  mitKindern: number;
  gemischt: boolean;
  /** Ein Kind kommt nicht am Stück vor oder die Reihenfolge wechselt: dann beliebige Reihenfolge */
  ungeordnet: boolean;
  xmlAttribute: boolean;
  /** Vorkommen mit xsi:type: das Element bleibt offen (jeder Typ), der Inhalt steht beim benannten Typ */
  xsiTypen: number;
  /** Ein Vorkommen trägt xsi:nil */
  nillable: boolean;
  readonly attribute: Map<string, Attributsammlung>;
  readonly kinder: Map<string, Kindsammlung>;
  /** Beobachtete Paare "a vor b" (mit \u0000 getrennt) */
  readonly vorher: Set<string>;
  /** Text der Vorkommen ohne Kind-Elemente */
  readonly text: Wertsammler;
}

export interface Ableitung {
  readonly wurzel: QName;
  readonly deklarationen: ReadonlyMap<string, Deklaration>;
  readonly globaleAttribute: ReadonlyMap<QName, Attributsammlung>;
  /** Namensraum zu Präfix für die Schemadateien (aus dem Dokument, sonst ns1, ns2 ...) */
  readonly praefixe: ReadonlyMap<string, string>;
  readonly elemente: number;
}

type Bereich = ReadonlyMap<string, string>;

const praefix = (name: string): string => (name.includes(":") ? name.slice(0, name.indexOf(":")) : "");
const lokal = (name: string): string => name.slice(name.indexOf(":") + 1);

function mitBereich(text: string, b: Bereich, el: XmlElement): Bereich {
  const eigene = el.attribute.filter((a) => a.name === "xmlns" || a.name.startsWith("xmlns:"));
  if (!eigene.length) return b;
  const n = new Map(b);
  for (const a of eigene) n.set(a.name === "xmlns" ? "" : a.name.slice(6), a.dekodiert ?? text.slice(a.von + 1, a.bis - 1));
  return n;
}

function textVon(text: string, el: XmlElement): { wert: string; belegt: boolean } {
  let wert = "";
  let belegt = false;
  for (const c of el.kinder) if (c.art === "text") {
    wert += c.dekodiert ?? text.slice(c.von, c.bis);
    if (!c.leer) belegt = true;
  }
  return { wert, belegt };
}

/** Daten sammeln; null, wenn das Dokument kein lesbares XML ist */
export function xsdAbleiten(text: string): Ableitung | null {
  const dok = xmlLesen(text);
  if (!dok.wurzel || dok.diagnosen.some((d) => d.schwere === "fehler")) return null;
  const deklarationen = new Map<string, Deklaration>();
  const globaleAttribute = new Map<QName, Attributsammlung>();
  const praefixe = new Map<string, string>();
  let elemente = 0;

  const merkePraefix = (ns: string, p: string) => {
    if (ns && p && !praefixe.has(ns) && p !== "xs" && ![...praefixe.values()].includes(p)) praefixe.set(ns, p);
  };
  const deklaration = (schluessel: string, name: string, ns: string, global: boolean, schemaNs: string, art: Deklaration["art"] = "element"): Deklaration => {
    let d = deklarationen.get(schluessel);
    if (!d) {
      d = { schluessel, art, name, ns, global, schemaNs, anzahl: 0, mitKindern: 0, gemischt: false, ungeordnet: false, xmlAttribute: false, xsiTypen: 0, nillable: false, attribute: new Map(), kinder: new Map(), vorher: new Set(), text: new Wertsammler() };
      deklarationen.set(schluessel, d);
    }
    return d;
  };
  /** Wo ein Kind im Namensraum `ns` erklärt wird, wenn sein Elternteil in der Schemadatei `schemaNs` steht */
  const ort = (elternSchluessel: string, schemaNs: string, name: string, ns: string) =>
    ns === schemaNs || ns === "" ? { schluessel: `${elternSchluessel}/${qname(ns, name)}`, global: false } : { schluessel: qname(ns, name), global: true };

  const bereich0 = mitBereich(text, new Map([["xml", XML_NS]]), dok.wurzel);
  const wurzelNs = bereich0.get(praefix(dok.wurzel.name)) ?? "";
  merkePraefix(wurzelNs, praefix(dok.wurzel.name));
  const wurzel = qname(wurzelNs, lokal(dok.wurzel.name));
  const stapel: { el: XmlElement; b: Bereich; d: Deklaration }[] = [{ el: dok.wurzel, b: bereich0, d: deklaration(wurzel, lokal(dok.wurzel.name), wurzelNs, true, wurzelNs) }];

  while (stapel.length) {
    const { el, b, d: element } = stapel.pop()!;
    elemente++;
    element.anzahl++;
    for (const [p, ns] of b) merkePraefix(ns, p);
    const xsi = (name: string) => {
      const a = el.attribute.find((x) => lokal(x.name) === name && x.name.includes(":") && b.get(praefix(x.name)) === XSI_NS);
      return a ? (a.dekodiert ?? text.slice(a.von + 1, a.bis - 1)).trim() : null;
    };
    // xsi:nil verlangt nillable, gleich mit welchem Wert
    const nil = xsi("nil");
    if (nil !== null) element.nillable = true;
    // Typ im Dokument (xsi:type): der Inhalt gehört zum benannten Typ, ein eingebauter Typ lässt ihn offen
    let d = element;
    const xsiTyp = xsi("type");
    if (xsiTyp) {
      element.xsiTypen++;
      const tns = praefix(xsiTyp) ? b.get(praefix(xsiTyp)) : (b.get("") ?? "");
      if (tns === XSD_NS) continue;
      if (tns !== undefined) {
        d = deklaration(`typ:${qname(tns, lokal(xsiTyp))}`, lokal(xsiTyp), tns, true, tns, "typ");
        d.anzahl++;
      }
    }

    for (const a of el.attribute) {
      if (a.name === "xmlns" || a.name.startsWith("xmlns:")) continue;
      const p = praefix(a.name);
      const ns = p ? (b.get(p) ?? "") : "";
      if (ns === XSI_NS) continue;
      if (ns === XML_NS) { d.xmlAttribute = true; continue; }
      const schluessel = qname(ns, lokal(a.name));
      let s = d.attribute.get(schluessel);
      if (!s) d.attribute.set(schluessel, (s = { name: lokal(a.name), ns, anzahl: 0, werte: new Wertsammler() }));
      s.anzahl++;
      const wert = a.dekodiert ?? text.slice(a.von + 1, a.bis - 1);
      s.werte.hinzu(wert);
      if (ns) {
        let g = globaleAttribute.get(schluessel);
        if (!g) globaleAttribute.set(schluessel, (g = { name: lokal(a.name), ns, anzahl: 0, werte: new Wertsammler() }));
        g.anzahl++;
        g.werte.hinzu(wert);
      }
    }

    if (nil === "true" || nil === "1") continue;
    const kinder = el.kinder.filter((c): c is XmlElement => c.art === "element");
    const t = textVon(text, el);
    if (!kinder.length) {
      d.text.hinzu(t.wert);
      continue;
    }
    d.mitKindern++;
    if (t.belegt) d.gemischt = true;
    // Zahl je Kind und Folge der Läufe (gleiche Nachbarn zusammengefasst)
    const zahl = new Map<string, number>();
    const folge: string[] = [];
    const neu: { el: XmlElement; b: Bereich; d: Deklaration }[] = [];
    for (const c of kinder) {
      const cb = mitBereich(text, b, c);
      const ns = cb.get(praefix(c.name)) ?? "";
      const o = ort(d.schluessel, d.schemaNs, lokal(c.name), ns);
      zahl.set(o.schluessel, (zahl.get(o.schluessel) ?? 0) + 1);
      if (folge.at(-1) !== o.schluessel) folge.push(o.schluessel);
      let k = d.kinder.get(o.schluessel);
      if (!k) d.kinder.set(o.schluessel, (k = { schluessel: o.schluessel, name: lokal(c.name), ns, global: o.global, min: Infinity, max: 0, mit: 0 }));
      neu.push({ el: c, b: cb, d: deklaration(o.schluessel, lokal(c.name), ns, o.global, o.global ? ns : d.schemaNs) });
    }
    for (const [s, n] of zahl) {
      const k = d.kinder.get(s)!;
      k.min = Math.min(k.min, n);
      k.max = Math.max(k.max, n);
      k.mit++;
    }
    if (new Set(folge).size !== folge.length) d.ungeordnet = true;
    else for (let i = 0; i < folge.length; i++) for (let j = i + 1; j < folge.length; j++) d.vorher.add(`${folge[i]}\u0000${folge[j]}`);
    // Rückwärts auf den Stapel, damit die Kinder in Dokumentreihenfolge drankommen (erstes Vorkommen bestimmt die Folge)
    for (let i = neu.length - 1; i >= 0; i--) stapel.push(neu[i]);
  }

  // Wechselnde Reihenfolge: "a vor b" und "b vor a" gesehen
  for (const d of deklarationen.values()) {
    if (d.ungeordnet) continue;
    for (const p of d.vorher) {
      const [a, b] = p.split("\u0000");
      if (d.vorher.has(`${b}\u0000${a}`)) { d.ungeordnet = true; break; }
    }
  }
  let n = 1;
  for (const d of deklarationen.values()) for (const ns of [d.ns, ...[...d.attribute.values()].map((a) => a.ns)]) {
    while (ns && !praefixe.has(ns)) {
      const p = `ns${n++}`;
      if (![...praefixe.values()].includes(p)) praefixe.set(ns, p);
    }
  }
  return { wurzel, deklarationen, globaleAttribute, praefixe, elemente };
}
