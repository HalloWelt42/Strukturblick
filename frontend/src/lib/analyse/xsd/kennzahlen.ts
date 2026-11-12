// Kennzahlen und Verwendungen eines XML Schemas für die Übersicht: wer welchen Typ, welches Element und welche Gruppe
// nutzt (auch für "ungenutzt"), wie oft abgeleitet wird, welche eingebauten Typen tragen und wie tief der Elementbaum
// ohne Rekursion wird.

import { kinderVon, wurzeln, type Baumknoten } from "./elementbaum";
import {
  anzeigename, istEingebaut,
  type Ableitung, type Attributdekl, type Partikel, type QName, type Quelle, type Typdefinition, type XsdModell,
} from "./modell";

export type Verwendungsart = "typ" | "basis" | "eintrag" | "mitglied" | "verweis" | "gruppe" | "attributgruppe" | "ersetzt";

export interface Verwendung {
  readonly art: Verwendungsart;
  /** Wo: globale Erklärung, bei lokalen mit Pfad ("Element lieferungen/lieferung/kunde") */
  readonly von: string;
  readonly quelle: Quelle;
}

export interface Kennzahlen {
  readonly dateien: number;
  readonly fehlend: number;
  readonly namensraeume: number;
  readonly elemente: number;
  readonly wurzeln: number;
  readonly abstrakt: number;
  readonly ersetzungsgruppen: number;
  readonly komplex: number;
  readonly einfach: number;
  readonly anonym: number;
  readonly gruppen: number;
  readonly attributgruppen: number;
  readonly ableitungen: Readonly<Record<Ableitung, number>>;
  /** Typen mit Aufzählung und alle Werte darin */
  readonly aufzaehlungen: number;
  readonly werte: number;
  readonly ungenutzt: readonly QName[];
  readonly tiefe: number;
  readonly rekursiv: boolean;
  readonly eingebaut: readonly { readonly name: string; readonly anzahl: number }[];
  readonly basen: readonly { readonly schluessel: QName; readonly anzahl: number }[];
}

/** Alle Verweise auf benannte Typen, Elemente und Gruppen; zählt nebenbei anonyme Typen und Ableitungen */
export function verwendungen(m: XsdModell): { readonly nach: ReadonlyMap<QName, readonly Verwendung[]>; readonly anonym: number; readonly ableitungen: Record<Ableitung, number>; readonly mitWerten: Typdefinition[] } {
  const nach = new Map<QName, Verwendung[]>();
  const ableitungen: Record<Ableitung, number> = { erweiterung: 0, einschraenkung: 0, liste: 0, vereinigung: 0 };
  const mitWerten: Typdefinition[] = [];
  let anonym = 0;
  const merken = (q: QName | null, art: Verwendungsart, von: string, quelle: Quelle) => {
    if (!q) return;
    const l = nach.get(q);
    if (l) l.push({ art, von, quelle });
    else nach.set(q, [{ art, von, quelle }]);
  };
  const typ = (t: Typdefinition, von: string): void => {
    if (t.ableitung) ableitungen[t.ableitung]++;
    if (t.werte.length) mitWerten.push(t);
    merken(t.basis, t.ableitung === "liste" ? "eintrag" : "basis", von, t.quelle);
    for (const q of t.mitglieder) merken(q, "mitglied", von, t.quelle);
    for (const l of [t.lokaleBasis, ...t.lokaleMitglieder]) if (l) lokal(l, von);
    if (t.inhalt) partikel(t.inhalt, von);
    for (const a of t.attribute) attribut(a, von);
    for (const q of t.attributgruppen) merken(q, "attributgruppe", von, t.quelle);
  };
  const lokal = (t: Typdefinition, von: string) => { anonym++; typ(t, von); };
  const attribut = (a: Attributdekl, von: string) => {
    const wo = `${von}/@${a.name}`;
    merken(a.typ, "typ", wo, a.quelle);
    merken(a.ref, "verweis", von, a.quelle);
    if (a.lokalerTyp) lokal(a.lokalerTyp, wo);
  };
  const partikel = (p: Partikel, von: string): void => {
    switch (p.art) {
      case "element": {
        const wo = `${von}/${p.dekl.name}`;
        merken(p.dekl.typ, "typ", wo, p.dekl.quelle);
        if (p.dekl.lokalerTyp) lokal(p.dekl.lokalerTyp, wo);
        break;
      }
      case "verweis": merken(p.ref, "verweis", von, p.quelle); break;
      case "gruppe": merken(p.ref, "gruppe", von, p.quelle); break;
      case "folge": case "auswahl": case "alle": for (const t of p.teile) partikel(t, von); break;
    }
  };

  for (const e of m.elemente.values()) {
    const von = `Element ${anzeigename(m, e.schluessel!)}`;
    merken(e.typ, "typ", von, e.quelle);
    merken(e.ersetzt, "ersetzt", von, e.quelle);
    if (e.lokalerTyp) lokal(e.lokalerTyp, von);
  }
  for (const t of m.typen.values()) typ(t, `Typ ${anzeigename(m, t.schluessel!)}`);
  for (const g of m.gruppen.values()) if (g.partikel) partikel(g.partikel, `Gruppe ${anzeigename(m, g.schluessel)}`);
  for (const g of m.attributgruppen.values()) {
    const von = `Attributgruppe ${anzeigename(m, g.schluessel)}`;
    for (const a of g.attribute) attribut(a, von);
    for (const q of g.attributgruppen) merken(q, "attributgruppe", von, g.quelle);
  }
  for (const [q, a] of m.attribute) attribut(a, `Attribut ${anzeigename(m, q)}`);
  return { nach, anonym, ableitungen, mitWerten };
}

/** Größte Tiefe des Elementbaums (Elemente, nicht Auswahl- oder Folgeknoten); Rekursion zählt einmal */
function tiefeMessen(m: XsdModell): { tiefe: number; rekursiv: boolean } {
  const merk = new Map<Typdefinition, number>();
  const offen = new Set<Typdefinition>();
  let rekursiv = false;
  /** Element-Kinder eines Knotens, durch Auswahl, Folge und Ersetzung hindurch */
  const elementKinder = (k: Baumknoten, tiefe = 0): Baumknoten[] =>
    tiefe > 30 ? [] : kinderVon(m, k).flatMap((c) => (c.art === "element" ? [c] : c.art === "attribut" || c.art === "beliebig" ? [] : elementKinder(c, tiefe + 1)));
  const messen = (k: Baumknoten): number => {
    if (k.rekursiv) rekursiv = true;
    const t = k.herkunft.art === "typ" ? k.herkunft.typ : null;
    if (!t) return 1;
    if (offen.has(t)) { rekursiv = true; return 1; }
    const bekannt = merk.get(t);
    if (bekannt !== undefined) return bekannt;
    offen.add(t);
    let tiefste = 0;
    for (const c of elementKinder(k)) tiefste = Math.max(tiefste, messen(c));
    offen.delete(t);
    merk.set(t, 1 + tiefste);
    return 1 + tiefste;
  };
  let tiefe = 0;
  for (const w of wurzeln(m)) for (const e of w.art === "element" ? [w] : elementKinder(w)) tiefe = Math.max(tiefe, messen(e));
  return { tiefe, rekursiv };
}

export function kennzahlen(m: XsdModell): Kennzahlen {
  const v = verwendungen(m);
  const typen = [...m.typen.values()];
  const eingebaut = new Map<string, number>();
  const basen = new Map<QName, number>();
  for (const [q, l] of v.nach) {
    if (istEingebaut(q)) eingebaut.set(anzeigename(m, q), l.filter((x) => x.art === "typ" || x.art === "basis" || x.art === "eintrag" || x.art === "mitglied").length);
    else if (m.typen.has(q)) {
      const n = l.filter((x) => x.art === "basis").length;
      if (n) basen.set(q, n);
    }
  }
  const { tiefe, rekursiv } = tiefeMessen(m);
  return {
    dateien: m.teile.length,
    fehlend: m.fehlend.length,
    namensraeume: new Set(m.teile.map((t) => t.zielnamensraum)).size,
    elemente: m.elemente.size,
    wurzeln: wurzeln(m).length,
    abstrakt: [...m.elemente.values()].filter((e) => e.abstrakt).length + typen.filter((t) => t.abstrakt).length,
    ersetzungsgruppen: m.ersetzungen.size,
    komplex: typen.filter((t) => t.art === "komplex").length,
    einfach: typen.filter((t) => t.art === "einfach").length,
    anonym: v.anonym,
    gruppen: m.gruppen.size,
    attributgruppen: m.attributgruppen.size,
    ableitungen: v.ableitungen,
    aufzaehlungen: v.mitWerten.length,
    werte: v.mitWerten.reduce((n, t) => n + t.werte.length, 0),
    ungenutzt: [...m.typen.keys()].filter((q) => !v.nach.has(q)),
    tiefe,
    rekursiv,
    eingebaut: [...eingebaut].map(([name, anzahl]) => ({ name, anzahl })).filter((e) => e.anzahl > 0).sort((a, b) => b.anzahl - a.anzahl || a.name.localeCompare(b.name)),
    basen: [...basen].map(([schluessel, anzahl]) => ({ schluessel, anzahl })).sort((a, b) => b.anzahl - a.anzahl).slice(0, 10),
  };
}
