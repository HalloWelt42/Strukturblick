// Elementbaum eines XML Schemas: was in einem gültigen Dokument wo stehen darf, Ebene für Ebene erst beim Aufklappen
// gerechnet (große Schemas haben sehr viele mögliche Pfade). Folgen und Gruppen fallen in ihre Eltern, solange sie
// genau einmal stehen; Auswahl, wiederholte Folgen und Ersetzungsgruppen bleiben als eigener Knoten sichtbar.
// Erweiterung bringt Inhalt und Attribute der Basis mit. Steht ein Typ schon weiter oben, endet der Zweig (rekursiv).

import {
  anzeigename, vielfaltText,
  type Attributdekl, type Elementdekl, type Grenzen, type Partikel, type QName, type Quelle, type Typdefinition, type XsdModell,
} from "./modell";

export type Knotenart = "element" | "attribut" | "auswahl" | "folge" | "ersetzung" | "beliebig";

export interface Baumknoten {
  /** Eindeutig im Baum: Pfad der Stellen ab der Wurzel */
  readonly kennung: string;
  readonly tiefe: number;
  readonly art: Knotenart;
  readonly name: string;
  /** Typ zum Zeigen ("xs:string", "PLZ", "komplex") */
  readonly typ: string | null;
  /** Benannter Typ für den Inspektor */
  readonly typSchluessel: QName | null;
  readonly vielfalt: string;
  readonly pflicht: boolean;
  readonly rekursiv: boolean;
  readonly abstrakt: boolean;
  readonly doku: string | null;
  readonly quelle: Quelle | null;
  readonly element: Elementdekl | null;
  readonly attribut: Attributdekl | null;
  /** Woraus die Kinder entstehen (nur intern) */
  readonly herkunft: Herkunft;
}

type Herkunft =
  | { readonly art: "typ"; readonly typ: Typdefinition | null; readonly vorfahren: ReadonlySet<Typdefinition> }
  | { readonly art: "partikel"; readonly teile: readonly Partikel[]; readonly auswahl: boolean; readonly vorfahren: ReadonlySet<Typdefinition> }
  | { readonly art: "ersetzung"; readonly kopf: QName; readonly vorfahren: ReadonlySet<Typdefinition> }
  | { readonly art: "keine" };

const EINMAL: Grenzen = { min: 1, max: 1 };
const mal = (a: Grenzen, b: Grenzen): Grenzen => ({ min: a.min * b.min, max: a.max * b.max });

/** Typ eines Elements: anonym am Element oder benannt (eingebaute und fehlende Typen: null) */
export function typVon(m: XsdModell, e: Elementdekl): Typdefinition | null {
  return e.lokalerTyp ?? (e.typ ? (m.typen.get(e.typ) ?? null) : null);
}

/** Typname zum Zeigen: benannt, sonst die Art des anonymen Typs */
export function typText(m: XsdModell, typ: QName | null, lokal: Typdefinition | null): string | null {
  if (typ) return anzeigename(m, typ);
  if (!lokal) return null;
  if (lokal.art === "einfach") return lokal.basis ? `${anzeigename(m, lokal.basis)} (eingeschränkt)` : "einfach";
  return lokal.basis ? `${anzeigename(m, lokal.basis)} (erweitert)` : "komplex";
}

/** Die globalen Elemente des Hauptschemas (und seiner Includes): mögliche Wurzeln eines Dokuments */
export function wurzeln(m: XsdModell): Baumknoten[] {
  const eigene = new Set(m.teile.filter((t) => t.haupt).map((t) => t.pfad));
  return [...m.elemente.values()]
    .filter((e) => eigene.has(e.quelle.datei))
    .map((e, i) => elementKnoten(m, e, EINMAL, String(i), 0, new Set()));
}

function elementKnoten(m: XsdModell, e: Elementdekl, g: Grenzen, kennung: string, tiefe: number, vorfahren: ReadonlySet<Typdefinition>): Baumknoten {
  const typ = typVon(m, e);
  const rekursiv = typ !== null && vorfahren.has(typ);
  const ersetzbar = e.schluessel ? (m.ersetzungen.get(e.schluessel) ?? []) : [];
  const basis = { kennung, tiefe, vielfalt: vielfaltText(g), pflicht: g.min > 0, doku: e.doku ?? typ?.doku ?? null, quelle: e.quelle, element: e, attribut: null };
  // Ein abstrakter Kopf steht nie selbst im Dokument: an seiner Stelle eins der Elemente seiner Ersetzungsgruppe
  if (e.abstrakt && ersetzbar.length && e.schluessel) {
    return { ...basis, art: "ersetzung", name: anzeigename(m, e.schluessel), typ: `eins von ${ersetzbar.length}`, typSchluessel: null, rekursiv: false, abstrakt: true, herkunft: { art: "ersetzung", kopf: e.schluessel, vorfahren } };
  }
  return {
    ...basis,
    art: "element",
    name: e.schluessel ? anzeigename(m, e.schluessel) : e.name,
    typ: typText(m, e.typ, e.lokalerTyp),
    typSchluessel: e.typ,
    rekursiv,
    abstrakt: e.abstrakt,
    herkunft: typ && !rekursiv && typ.art === "komplex" ? { art: "typ", typ, vorfahren: new Set([...vorfahren, typ]) } : { art: "keine" },
  };
}

/** Attribute eines Typs samt Basis und Attributgruppen; verbotene fallen weg */
export function attributeVon(m: XsdModell, t: Typdefinition, gesehen = new Set<Typdefinition>()): Attributdekl[] {
  if (gesehen.has(t)) return [];
  gesehen.add(t);
  // Attribute erbt ein Typ bei Erweiterung und bei Einschränkung (dort kann er sie verbieten)
  const basis = (t.ableitung === "erweiterung" || t.ableitung === "einschraenkung") && t.basis ? m.typen.get(t.basis) : undefined;
  const aus = basis && basis.art === "komplex" ? attributeVon(m, basis, gesehen) : [];
  const gruppen = (qs: readonly QName[], tiefe: number): Attributdekl[] =>
    tiefe > 20 ? [] : qs.flatMap((q) => { const g = m.attributgruppen.get(q); return g ? [...g.attribute, ...gruppen(g.attributgruppen, tiefe + 1)] : []; });
  for (const a of [...t.attribute, ...gruppen(t.attributgruppen, 0)]) {
    const name = a.ref ? anzeigename(m, a.ref) : a.name;
    const i = aus.findIndex((x) => (x.ref ? anzeigename(m, x.ref) : x.name) === name);
    if (i >= 0) aus.splice(i, 1);
    if (!a.verboten) aus.push(a);
  }
  return aus;
}

/** Inhaltsteile eines Typs: bei Erweiterung erst die der Basis */
export function inhaltVon(m: XsdModell, t: Typdefinition, gesehen = new Set<Typdefinition>()): Partikel[] {
  if (gesehen.has(t)) return [];
  gesehen.add(t);
  const basis = t.ableitung === "erweiterung" && t.basis ? m.typen.get(t.basis) : undefined;
  return [...(basis && basis.art === "komplex" ? inhaltVon(m, basis, gesehen) : []), ...(t.inhalt ? [t.inhalt] : [])];
}

/** Kinder eines Knotens (eine Ebene) */
export function kinderVon(m: XsdModell, k: Baumknoten): Baumknoten[] {
  const h = k.herkunft;
  if (h.art === "keine") return [];
  const aus: Baumknoten[] = [];
  const neu = (teil: Omit<Baumknoten, "kennung" | "tiefe">) => aus.push({ ...teil, kennung: `${k.kennung}/${aus.length}`, tiefe: k.tiefe + 1 });

  if (h.art === "ersetzung") {
    for (const q of m.ersetzungen.get(h.kopf) ?? []) {
      const e = m.elemente.get(q);
      if (e) neu(elementKnoten(m, e, EINMAL, "", 0, h.vorfahren));
    }
    return aus;
  }
  if (h.art === "typ" && h.typ) {
    for (const a of attributeVon(m, h.typ)) {
      const g = a.ref ? m.attribute.get(a.ref) : undefined;
      neu({
        art: "attribut", name: `@${a.ref ? anzeigename(m, a.ref) : a.name}`, typ: typText(m, a.typ ?? g?.typ ?? null, a.lokalerTyp ?? g?.lokalerTyp ?? null),
        typSchluessel: a.typ ?? g?.typ ?? null, vielfalt: a.pflicht ? "1" : "0..1", pflicht: a.pflicht, rekursiv: false, abstrakt: false,
        doku: a.doku ?? g?.doku ?? null, quelle: a.quelle, element: null, attribut: a, herkunft: { art: "keine" },
      });
    }
  }
  const teile = h.art === "typ" ? (h.typ ? inhaltVon(m, h.typ) : []) : h.teile;
  const flach = (p: Partikel, g: Grenzen, tiefe: number): void => {
    if (tiefe > 40) return;
    switch (p.art) {
      case "element":
        neu(elementKnoten(m, p.dekl, mal(g, p.grenzen), "", 0, h.vorfahren));
        break;
      case "verweis": {
        const e = m.elemente.get(p.ref);
        const vielfalt = vielfaltText(mal(g, p.grenzen));
        if (e) neu(elementKnoten(m, e, mal(g, p.grenzen), "", 0, h.vorfahren));
        else neu({ art: "element", name: anzeigename(m, p.ref), typ: "fehlt (nicht im Schema)", typSchluessel: null, vielfalt, pflicht: p.grenzen.min > 0, rekursiv: false, abstrakt: false, doku: null, quelle: p.quelle, element: null, attribut: null, herkunft: { art: "keine" } });
        break;
      }
      case "gruppe": {
        const gr = m.gruppen.get(p.ref);
        if (gr?.partikel) flach({ ...gr.partikel, grenzen: mal(p.grenzen, gr.partikel.grenzen) }, g, tiefe + 1);
        break;
      }
      case "folge":
      case "alle":
        if (p.grenzen.min === 1 && p.grenzen.max === 1) for (const t of p.teile) flach(t, g, tiefe + 1);
        else neu(gruppenKnoten(m, "folge", p, mal(g, p.grenzen), h.vorfahren));
        break;
      case "auswahl":
        neu(gruppenKnoten(m, "auswahl", p, mal(g, p.grenzen), h.vorfahren));
        break;
      case "beliebig":
        neu({ art: "beliebig", name: "beliebiges Element", typ: p.namensraum === "##any" ? "aus jedem Namensraum" : p.namensraum, typSchluessel: null, vielfalt: vielfaltText(mal(g, p.grenzen)), pflicht: p.grenzen.min > 0, rekursiv: false, abstrakt: false, doku: null, quelle: p.quelle, element: null, attribut: null, herkunft: { art: "keine" } });
        break;
    }
  };
  for (const p of teile) {
    // In einer Auswahl bleibt eine Folge zusammen: sie ist eine der Möglichkeiten
    if (h.art === "partikel" && h.auswahl && (p.art === "folge" || p.art === "alle") && p.teile.length > 1) neu(gruppenKnoten(m, "folge", p, p.grenzen, h.vorfahren));
    else flach(p, EINMAL, 0);
  }
  return aus;
}

function gruppenKnoten(m: XsdModell, art: "auswahl" | "folge", p: Extract<Partikel, { teile: readonly Partikel[] }>, g: Grenzen, vorfahren: ReadonlySet<Typdefinition>): Omit<Baumknoten, "kennung" | "tiefe"> {
  return {
    art, name: art === "auswahl" ? "Auswahl" : "Folge", typ: art === "auswahl" ? `eins von ${p.teile.length}` : `${p.teile.length} Teile${g.max > 1 ? ", wiederholt" : ""}`,
    typSchluessel: null, vielfalt: vielfaltText(g), pflicht: g.min > 0, rekursiv: false, abstrakt: false, doku: null, quelle: p.quelle, element: null, attribut: null,
    herkunft: { art: "partikel", teile: art === "auswahl" ? p.teile : [{ ...p, art: "folge", grenzen: EINMAL }], auswahl: art === "auswahl", vorfahren },
  };
}
