// XML Schema lesen für die Schema-Übersicht: das Hauptschema und alles, was es über import, include, redefine und
// override erreicht, mit dem eigenen XML-Leser (Textstellen bleiben erhalten). Namen werden über die Namensräume der
// jeweiligen Stelle aufgelöst. Gelesen wird, was die Übersicht braucht; Prüfen bleibt bei libxml2.

import { xmlLesen, type Element as XmlElement } from "../../formate/xml/dom";
import { aufloesen, dateiname, Dateisuche, type Schemadatei } from "./dateien";
import {
  qname, XSD_NS, zerlegen,
  type Attributdekl, type Attributgruppe, type Bezug, type Elementdekl, type Facette, type Grenzen, type Gruppe,
  type Partikel, type QName, type Schemateil, type Typdefinition, type XsdModell,
} from "./modell";

interface Kontext {
  readonly datei: string;
  readonly text: string;
  readonly tns: string;
  /** Eingebunden ohne eigenen Zielnamensraum (Chamäleon): Verweise ohne Namensraum gehören zum einbindenden Schema */
  readonly chamaeleon: string;
  /** elementFormDefault und attributeFormDefault der Datei: lokale Namen mit Namensraum? */
  readonly elementeQualifiziert: boolean;
  readonly attributeQualifiziert: boolean;
  /** Präfix zu Namensraum an dieser Stelle; "" ist der Vorgabe-Namensraum */
  readonly ns: ReadonlyMap<string, string>;
}

const DOKU_LAENGE = 600;
const FACETTEN = new Set(["pattern", "length", "minLength", "maxLength", "minInclusive", "maxInclusive", "minExclusive", "maxExclusive", "totalDigits", "fractionDigits", "whiteSpace"]);
const lokal = (name: string): string => name.slice(name.indexOf(":") + 1);
const praefix = (name: string): string => (name.includes(":") ? name.slice(0, name.indexOf(":")) : "");

function mitBereich(k: Kontext, el: XmlElement): Kontext {
  const eigene = el.attribute.filter((a) => a.name === "xmlns" || a.name.startsWith("xmlns:"));
  if (!eigene.length) return k;
  const ns = new Map(k.ns);
  for (const a of eigene) ns.set(a.name === "xmlns" ? "" : a.name.slice(6), wertVon(k, a));
  return { ...k, ns };
}

function wertVon(k: Kontext, a: XmlElement["attribute"][number]): string {
  return a.dekodiert ?? k.text.slice(a.von + 1, a.bis - 1);
}

function attr(k: Kontext, el: XmlElement, name: string): string | null {
  const a = el.attribute.find((x) => x.name === name);
  return a ? wertVon(k, a).trim() : null;
}

/** Ist das Element aus dem XSD-Namensraum (und heißt so, falls ein Name gegeben ist)? */
function istXs(k: Kontext, el: XmlElement, name?: string): boolean {
  return (name === undefined || lokal(el.name) === name) && (k.ns.get(praefix(el.name)) ?? "") === XSD_NS;
}

function kinder(k: Kontext, el: XmlElement): { el: XmlElement; k: Kontext }[] {
  const aus: { el: XmlElement; k: Kontext }[] = [];
  for (const c of el.kinder) if (c.art === "element") {
    const ck = mitBereich(k, c);
    if (istXs(ck, c)) aus.push({ el: c, k: ck });
  }
  return aus;
}

function aufloesenQ(k: Kontext, wert: string | null): QName | null {
  if (!wert) return null;
  const ns = k.ns.get(praefix(wert)) ?? "";
  return qname(ns || (praefix(wert) ? "" : k.chamaeleon), lokal(wert));
}

function grenzen(k: Kontext, el: XmlElement): Grenzen {
  const max = attr(k, el, "maxOccurs");
  return { min: Number(attr(k, el, "minOccurs") ?? 1) || 0, max: max === "unbounded" ? Infinity : Number(max ?? 1) || 0 };
}

const quelle = (k: Kontext, el: XmlElement) => ({ datei: k.datei, von: el.von, bis: el.bis });

function textVon(k: Kontext, el: XmlElement): string {
  return el.kinder.map((c) => (c.art === "text" ? (c.dekodiert ?? k.text.slice(c.von, c.bis)) : textVon(k, c))).join("");
}

function doku(k: Kontext, el: XmlElement): string | null {
  for (const a of kinder(k, el)) if (istXs(a.k, a.el, "annotation")) {
    for (const d of kinder(a.k, a.el)) if (istXs(d.k, d.el, "documentation")) {
      const t = textVon(d.k, d.el).replace(/\s+/g, " ").trim();
      if (t) return t.length > DOKU_LAENGE ? `${t.slice(0, DOKU_LAENGE - 3)}...` : t;
    }
  }
  return null;
}

function elementDekl(k: Kontext, el: XmlElement, global: boolean): Elementdekl {
  const name = attr(k, el, "name") ?? "";
  let lokalerTyp: Typdefinition | null = null;
  for (const c of kinder(k, el)) if (istXs(c.k, c.el, "complexType") || istXs(c.k, c.el, "simpleType")) lokalerTyp = typDef(c.k, c.el, null);
  return {
    name,
    ns: namensraum(k, el, global, k.elementeQualifiziert),
    schluessel: global ? qname(k.tns, name) : null,
    typ: aufloesenQ(k, attr(k, el, "type")),
    lokalerTyp,
    abstrakt: attr(k, el, "abstract") === "true",
    ersetzt: aufloesenQ(k, attr(k, el, "substitutionGroup")?.split(/\s+/)[0] ?? null),
    vorgabe: attr(k, el, "default"),
    fest: attr(k, el, "fixed"),
    nillable: attr(k, el, "nillable") === "true",
    doku: doku(k, el),
    quelle: quelle(k, el),
  };
}

/** Namensraum eines Namens im Dokument: global immer der Zielnamensraum, lokal nach form oder Vorgabe der Datei */
function namensraum(k: Kontext, el: XmlElement, global: boolean, vorgabe: boolean): string {
  const form = attr(k, el, "form");
  return global || (form ? form === "qualified" : vorgabe) ? k.tns : "";
}

function attributDekl(k: Kontext, el: XmlElement, global = false): Attributdekl {
  const ref = aufloesenQ(k, attr(k, el, "ref"));
  let lokalerTyp: Typdefinition | null = null;
  for (const c of kinder(k, el)) if (istXs(c.k, c.el, "simpleType")) lokalerTyp = typDef(c.k, c.el, null);
  const use = attr(k, el, "use");
  return {
    name: attr(k, el, "name") ?? (ref ? lokal(attr(k, el, "ref") ?? "") : ""),
    ns: ref ? zerlegen(ref).ns : namensraum(k, el, global, k.attributeQualifiziert),
    ref,
    typ: aufloesenQ(k, attr(k, el, "type")),
    lokalerTyp,
    pflicht: use === "required",
    verboten: use === "prohibited",
    vorgabe: attr(k, el, "default"),
    fest: attr(k, el, "fixed"),
    doku: doku(k, el),
    quelle: quelle(k, el),
  };
}

function partikel(k: Kontext, el: XmlElement): Partikel | null {
  const g = grenzen(k, el);
  switch (lokal(el.name)) {
    case "element": {
      const ref = aufloesenQ(k, attr(k, el, "ref"));
      return ref ? { art: "verweis", ref, grenzen: g, quelle: quelle(k, el) } : { art: "element", dekl: elementDekl(k, el, false), grenzen: g };
    }
    case "sequence":
    case "choice":
    case "all": {
      const art = ({ sequence: "folge", choice: "auswahl", all: "alle" } as const)[lokal(el.name) as "sequence" | "choice" | "all"];
      const teile = kinder(k, el).map((c) => partikel(c.k, c.el)).filter((p): p is Partikel => p !== null);
      return { art, teile, grenzen: g, quelle: quelle(k, el) };
    }
    case "group": {
      const ref = aufloesenQ(k, attr(k, el, "ref"));
      return ref ? { art: "gruppe", ref, grenzen: g, quelle: quelle(k, el) } : null;
    }
    case "any":
      return { art: "beliebig", namensraum: attr(k, el, "namespace") ?? "##any", grenzen: g, quelle: quelle(k, el) };
    default:
      return null;
  }
}

/** Typdefinition aus complexType oder simpleType; `name` null für anonyme */
function typDef(k: Kontext, el: XmlElement, name: string | null): Typdefinition {
  const komplex = lokal(el.name) === "complexType";
  const t = {
    schluessel: name === null ? null : qname(k.tns, name),
    name: name ?? "",
    art: komplex ? "komplex" : "einfach",
    ableitung: null as Typdefinition["ableitung"],
    basis: null as QName | null,
    lokaleBasis: null as Typdefinition | null,
    mitglieder: [] as QName[],
    lokaleMitglieder: [] as Typdefinition[],
    einfacherInhalt: false as boolean,
    gemischt: attr(k, el, "mixed") === "true",
    inhalt: null as Partikel | null,
    attribute: [] as Attributdekl[],
    attributgruppen: [] as QName[],
    beliebigeAttribute: false as boolean,
    facetten: [] as Facette[],
    werte: [] as { wert: string; doku: string | null }[],
    abstrakt: attr(k, el, "abstract") === "true",
    doku: doku(k, el),
    quelle: quelle(k, el),
  } satisfies Typdefinition;

  /** Inhalt eines complexType, einer extension oder restriction: Partikel, Attribute, Facetten */
  const inhaltLesen = (ik: Kontext, iel: XmlElement): void => {
    for (const c of kinder(ik, iel)) {
      const n = lokal(c.el.name);
      if (n === "attribute") t.attribute.push(attributDekl(c.k, c.el));
      else if (n === "attributeGroup") { const r = aufloesenQ(c.k, attr(c.k, c.el, "ref")); if (r) t.attributgruppen.push(r); }
      else if (n === "anyAttribute") t.beliebigeAttribute = true;
      else if (n === "enumeration") t.werte.push({ wert: attr(c.k, c.el, "value") ?? "", doku: doku(c.k, c.el) });
      else if (FACETTEN.has(n)) t.facetten.push({ art: n, wert: attr(c.k, c.el, "value") ?? "" });
      else if (n === "simpleType") t.lokaleBasis = typDef(c.k, c.el, null);
      else if (n === "simpleContent" || n === "complexContent") {
        t.einfacherInhalt = n === "simpleContent";
        if (attr(c.k, c.el, "mixed") === "true") t.gemischt = true;
        for (const a of kinder(c.k, c.el)) {
          const an = lokal(a.el.name);
          if (an !== "extension" && an !== "restriction") continue;
          t.ableitung = an === "extension" ? "erweiterung" : "einschraenkung";
          t.basis = aufloesenQ(a.k, attr(a.k, a.el, "base"));
          inhaltLesen(a.k, a.el);
        }
      } else if (n !== "annotation") t.inhalt = partikel(c.k, c.el) ?? t.inhalt;
    }
  };

  if (komplex) inhaltLesen(k, el);
  else for (const c of kinder(k, el)) {
    const n = lokal(c.el.name);
    if (n === "restriction") {
      t.ableitung = "einschraenkung";
      t.basis = aufloesenQ(c.k, attr(c.k, c.el, "base"));
      inhaltLesen(c.k, c.el);
    } else if (n === "list") {
      t.ableitung = "liste";
      t.basis = aufloesenQ(c.k, attr(c.k, c.el, "itemType"));
      for (const s of kinder(c.k, c.el)) if (istXs(s.k, s.el, "simpleType")) t.lokaleBasis = typDef(s.k, s.el, null);
    } else if (n === "union") {
      t.ableitung = "vereinigung";
      t.mitglieder = (attr(c.k, c.el, "memberTypes") ?? "").split(/\s+/).filter(Boolean).map((m) => aufloesenQ(c.k, m)!);
      for (const s of kinder(c.k, c.el)) if (istXs(s.k, s.el, "simpleType")) t.lokaleMitglieder.push(typDef(s.k, s.el, null));
    }
  }
  return t;
}

/** Hauptschema und alle erreichbaren Dateien lesen; `dateien` sind die Kandidaten für Importe (Ordner oder Paket) */
export function xsdLesen(haupt: Schemadatei, dateien: readonly Schemadatei[]): XsdModell {
  const suche = new Dateisuche<Schemadatei>(dateien.map((d) => [d.pfad, d] as const));
  const elemente = new Map<QName, Elementdekl>();
  const typen = new Map<QName, Typdefinition>();
  const gruppen = new Map<QName, Gruppe>();
  const attributgruppen = new Map<QName, Attributgruppe>();
  const attribute = new Map<QName, Attributdekl>();
  const praefixe = new Map<string, string>();
  const teile: Schemateil[] = [];
  const fehler: { datei: string; meldung: string }[] = [];
  const fehlendeOrte = new Set<string>();
  const fehlendeNs = new Set<string>();
  const gelesen = new Set<string>();
  // Erste Erklärung gewinnt: so gilt eine Neudefinition (redefine) vor dem Original, das erst danach gelesen wird. Das
  // Original bleibt unter eigenem Schlüssel erhalten, denn die Neudefinition baut darauf auf (Basis gleichen Namens).
  const neuDefiniert = new Set<QName>();
  const original = (q: QName): QName => `${q} (Original)`;
  const merken = <T>(m: Map<QName, T>, q: QName, w: T) => {
    if (!m.has(q)) m.set(q, w);
    else if (neuDefiniert.has(q) && !m.has(original(q))) m.set(original(q), { ...w, schluessel: original(q) });
  };
  const umlenken = (p: Partikel | null, q: QName): Partikel | null => {
    if (!p) return p;
    if (p.art === "gruppe" && p.ref === q) return { ...p, ref: original(q) };
    if (p.art === "folge" || p.art === "auswahl" || p.art === "alle") return { ...p, teile: p.teile.map((x) => umlenken(x, q)!) };
    return p;
  };

  const schlange: { datei: Schemadatei; haupt: boolean; tns: string | null }[] = [{ datei: haupt, haupt: true, tns: null }];
  while (schlange.length) {
    const { datei, haupt: istHaupt, tns: vorgabe } = schlange.shift()!;
    const schluessel = `${datei.pfad}|${vorgabe ?? ""}`;
    if (gelesen.has(schluessel)) continue;
    gelesen.add(schluessel);
    const dok = xmlLesen(datei.text);
    const w = dok.wurzel;
    const leer: Kontext = { datei: datei.pfad, text: datei.text, tns: "", chamaeleon: "", elementeQualifiziert: false, attributeQualifiziert: false, ns: new Map([["xml", "http://www.w3.org/XML/1998/namespace"]]) };
    const wk = w ? mitBereich(leer, w) : leer;
    if (!w || !istXs(wk, w, "schema")) {
      fehler.push({ datei: datei.pfad, meldung: w ? "kein XML Schema (Wurzel ist nicht xs:schema)" : "kein lesbares XML" });
      continue;
    }
    const eigener = attr(wk, w, "targetNamespace");
    const k: Kontext = {
      ...wk,
      tns: eigener ?? vorgabe ?? "",
      chamaeleon: eigener === null ? (vorgabe ?? "") : "",
      elementeQualifiziert: attr(wk, w, "elementFormDefault") === "qualified",
      attributeQualifiziert: attr(wk, w, "attributeFormDefault") === "qualified",
    };
    for (const [p, ns] of k.ns) if (p && !praefixe.has(ns)) praefixe.set(ns, p);
    const bezuege: Bezug[] = [];
    for (const c of kinder(k, w)) {
      const n = lokal(c.el.name);
      if (n === "import" || n === "include" || n === "redefine" || n === "override") {
        const ort = attr(c.k, c.el, "schemaLocation");
        const namensraum = attr(c.k, c.el, "namespace");
        const ziel = ort ? suche.finden(aufloesen(ort, datei.pfad)) : undefined;
        bezuege.push({ art: n, namensraum, ort, gefunden: ziel?.pfad ?? null });
        if (ziel) schlange.push({ datei: ziel, haupt: istHaupt && n !== "import", tns: n === "import" ? null : k.tns });
        else if (ort) fehlendeOrte.add(dateiname(ort));
        else if (namensraum) fehlendeNs.add(namensraum);
        // Neu definierte Typen und Gruppen gelten vor dem Original
        if (n === "redefine" || n === "override") for (const r of kinder(c.k, c.el)) globalLesen(r.k, r.el, true);
      } else globalLesen(c.k, c.el);
    }
    teile.push({ pfad: datei.pfad, zielnamensraum: k.tns, haupt: istHaupt, bezuege });
  }

  /** Globale Erklärung lesen; `neu` bei Neudefinition (redefine): Bezüge auf den eigenen Namen meinen das Original */
  function globalLesen(k: Kontext, el: XmlElement, neu = false): void {
    const name = attr(k, el, "name");
    if (!name) return;
    const q = qname(k.tns, name);
    if (neu) neuDefiniert.add(q);
    switch (lokal(el.name)) {
      case "element": merken(elemente, q, elementDekl(k, el, true)); break;
      case "complexType":
      case "simpleType": {
        const t = typDef(k, el, name);
        merken(typen, q, neu && t.basis === q ? { ...t, basis: original(q) } : t);
        break;
      }
      case "attribute": merken(attribute, q, attributDekl(k, el, true)); break;
      case "group": {
        const p = kinder(k, el).map((c) => partikel(c.k, c.el)).find((x) => x !== null) ?? null;
        merken(gruppen, q, { schluessel: q, partikel: neu ? umlenken(p, q) : p, quelle: quelle(k, el) });
        break;
      }
      case "attributeGroup": {
        const t = typDef(k, { ...el, name: "complexType" }, null);
        const gruppenRefs = neu ? t.attributgruppen.map((x) => (x === q ? original(q) : x)) : t.attributgruppen;
        merken(attributgruppen, q, { schluessel: q, attribute: t.attribute, attributgruppen: gruppenRefs, quelle: quelle(k, el) });
        break;
      }
    }
  }

  const ersetzungen = new Map<QName, QName[]>();
  for (const e of elemente.values()) if (e.ersetzt && e.schluessel) ersetzungen.set(e.ersetzt, [...(ersetzungen.get(e.ersetzt) ?? []), e.schluessel]);
  if (!praefixe.has(XSD_NS)) praefixe.set(XSD_NS, "xs");
  const vorhanden = new Set(teile.map((t) => t.zielnamensraum));
  return {
    haupt: haupt.pfad,
    teile,
    elemente, typen, gruppen, attributgruppen, attribute, ersetzungen, praefixe,
    fehlend: [...fehlendeOrte, ...[...fehlendeNs].filter((n) => !vorhanden.has(n))],
    fehler,
  };
}
