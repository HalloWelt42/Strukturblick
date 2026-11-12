// Beispieldokument aus einem gelesenen XML Schema: ein gültiges Dokument zu einem globalen Element. Umfang "pflicht"
// nimmt nur, was sein muss; "alles" jedes optionale Teil einmal. Bei einer Auswahl die erste Möglichkeit, für einen
// abstrakten Kopf das erste Element seiner Ersetzungsgruppe, für einen abstrakten Typ der erste abgeleitete (mit
// xsi:type). Optionale Rekursion endet, eine Obergrenze hält große Schemas klein. Werte liefert der Wertgeber.

import { attributeVon, inhaltVon, typVon } from "./elementbaum";
import { anzeigename, istEingebaut, zerlegen, type Elementdekl, type Partikel, type QName, type Typdefinition, type XsdModell } from "./modell";
import { einschraenkungen, MUSTERWERTE, type Wertgeber } from "./werte";

const XSI_NS = "http://www.w3.org/2001/XMLSchema-instance";
const EIN = "  ";

export interface Beispielangaben {
  readonly wurzel: QName;
  readonly umfang: "pflicht" | "alles";
  /** Dateiname des Schemas für xsi:schemaLocation */
  readonly schemaOrt: string;
  readonly wertgeber?: Wertgeber;
  /** Höchstzahl der Elemente; darüber nur noch Pflichtteile */
  readonly grenze?: number;
}

export interface Beispiel {
  readonly text: string;
  readonly elemente: number;
  readonly gekuerzt: boolean;
  readonly hinweise: readonly string[];
}

const maskieren = (s: string, attribut: boolean): string => {
  const t = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return attribut ? t.replace(/"/g, "&quot;") : t;
};

/** Erster nicht abstrakter Typ, der (über beliebig viele Stufen) von `t` abgeleitet ist */
function konkreterTypSuchen(m: XsdModell, t: Typdefinition): { q: QName; typ: Typdefinition } | null {
  for (const [q, k] of m.typen) {
    if (k.abstrakt || k === t) continue;
    const gesehen = new Set<Typdefinition>();
    for (let b: Typdefinition | undefined = k; b && !gesehen.has(b); b = b.basis ? m.typen.get(b.basis) : undefined) {
      gesehen.add(b);
      if (b === t) return { q, typ: k };
    }
  }
  return null;
}

export function beispielErzeugen(m: XsdModell, a: Beispielangaben): Beispiel {
  const konkret = new Map<Typdefinition, { q: QName; typ: Typdefinition } | null>();
  const konkreterTyp = (_m: XsdModell, t: Typdefinition) => {
    if (!konkret.has(t)) konkret.set(t, konkreterTypSuchen(m, t));
    return konkret.get(t)!;
  };
  const wertgeber = a.wertgeber ?? MUSTERWERTE;
  const grenze = a.grenze ?? 5000;
  const zeilen: string[] = [];
  const genutzt = new Set<string>();
  const hinweise = new Set<string>();
  const praefixe = new Map(m.praefixe);
  let elemente = 0;
  let nummer = 0;
  let gekuerzt = false;

  const name = (ns: string, lokal: string): string => {
    if (!ns) return lokal;
    genutzt.add(ns);
    if (!praefixe.has(ns)) praefixe.set(ns, `ns${praefixe.size + 1}`);
    return `${praefixe.get(ns)}:${lokal}`;
  };
  const wert = (typ: QName | null, lokal: Typdefinition | null, wofuer: string): string =>
    wertgeber.wert({ einschraenkungen: einschraenkungen(m, typ, lokal), name: wofuer, nummer: ++nummer });

  /** Wie oft ein Teil vorkommt: Pflicht genau so oft wie nötig, sonst einmal (über der Grenze nur Pflicht) */
  const wieOft = (min: number, max: number): number => {
    if (a.umfang === "pflicht" || elemente >= grenze) {
      if (a.umfang === "alles" && max > 0 && min === 0) gekuerzt = true;
      return min;
    }
    return Math.min(max, Math.max(min, 1));
  };

  const element = (e: Elementdekl, ns: string, t: number, stapel: readonly Typdefinition[], wurzel = false): void => {
    elemente++;
    const e0 = EIN.repeat(t);
    const tag = name(ns, e.name);
    let typ = typVon(m, e);
    let attribute = "";
    if (wurzel) attribute += "\u0000";
    if (typ?.abstrakt) {
      const k = konkreterTyp(m, typ);
      if (k) {
        typ = k.typ;
        const { ns: tns, lokal } = zerlegen(k.q);
        attribute += ` xsi:type="${name(tns, lokal)}"`;
      } else hinweise.add(`Abstrakter Typ ohne Ableitung: ${typ.schluessel ? anzeigename(m, typ.schluessel) : "anonym"}`);
    }
    if (e.typ && !typ && !istEingebaut(e.typ)) hinweise.add(`Typ fehlt (Import?): ${anzeigename(m, e.typ)}`);
    // Einfacher Wert: eingebauter oder einfacher Typ
    if (!typ || typ.art === "einfach") {
      const text = !e.typ && !typ ? "" : (e.fest ?? wert(typ?.schluessel ?? e.typ, typ && !typ.schluessel ? typ : null, e.name));
      zeilen.push(text === "" ? `${e0}<${tag}${attribute}/>` : `${e0}<${tag}${attribute}>${maskieren(text, false)}</${tag}>`);
      return;
    }
    for (const at of attributeVon(m, typ)) {
      if (!at.pflicht && (a.umfang === "pflicht" || elemente >= grenze)) continue;
      const g = at.ref ? m.attribute.get(at.ref) : undefined;
      const fest = at.fest ?? g?.fest ?? null;
      const v = fest ?? wert(at.typ ?? g?.typ ?? null, at.lokalerTyp ?? g?.lokalerTyp ?? null, at.name);
      attribute += ` ${name(at.ns, at.name)}="${maskieren(v, true)}"`;
    }
    if (typ.einfacherInhalt) {
      const text = e.fest ?? wert(typ.schluessel, typ.schluessel ? null : typ, e.name);
      zeilen.push(`${e0}<${tag}${attribute}>${maskieren(text, false)}</${tag}>`);
      return;
    }
    const start = zeilen.length;
    const tiefer = [...stapel, typ];
    for (const p of inhaltVon(m, typ)) partikel(p, t + 1, tiefer);
    if (zeilen.length === start) zeilen.push(`${e0}<${tag}${attribute}/>`);
    else {
      zeilen.splice(start, 0, `${e0}<${tag}${attribute}>`);
      zeilen.push(`${e0}</${tag}>`);
    }
  };

  /** Optional besser weglassen: der Typ steht schon weiter oben (endlos), oder er ist abstrakt ohne Ableitung */
  const rekursiv = (e: Elementdekl, stapel: readonly Typdefinition[]): boolean => {
    const typ = typVon(m, e);
    return (typ !== null && (stapel.includes(typ) || (typ.abstrakt && !konkreterTyp(m, typ)))) || stapel.length > 40;
  };

  /** Ein erklärtes Element für xs:any: aus einem Namensraum, den es erlaubt (##other, ##local, Liste ...) */
  const beliebiges = (namensraum: string, datei: string, stapel: readonly Typdefinition[]): Elementdekl | null => {
    const tns = m.teile.find((t) => t.pfad === datei)?.zielnamensraum ?? "";
    const erlaubt = (ns: string): boolean =>
      namensraum.split(/\s+/).some((x) => x === "##any" || (x === "##other" ? ns !== tns && ns !== "" : x === "##local" ? ns === "" : x === "##targetNamespace" ? ns === tns : x === ns));
    for (const e of m.elemente.values()) if (!e.abstrakt && erlaubt(zerlegen(e.schluessel!).ns) && !rekursiv(e, stapel)) return e;
    return null;
  };

  const partikel = (p: Partikel, t: number, stapel: readonly Typdefinition[]): void => {
    switch (p.art) {
      case "element": {
        const n = rekursiv(p.dekl, stapel) ? p.grenzen.min : wieOft(p.grenzen.min, p.grenzen.max);
        for (let i = 0; i < n; i++) element(p.dekl, p.dekl.ns, t, stapel);
        break;
      }
      case "verweis": {
        let e = m.elemente.get(p.ref);
        if (!e) { if (p.grenzen.min) hinweise.add(`Element fehlt (Import?): ${anzeigename(m, p.ref)}`); break; }
        // Abstrakter Kopf: ein Element aus seiner Ersetzungsgruppe (auch über mehrere Stufen)
        if (e.abstrakt) {
          const offen = [...(m.ersetzungen.get(p.ref) ?? [])];
          let ersatz: Elementdekl | undefined;
          for (let i = 0; i < offen.length && !ersatz; i++) {
            const k = m.elemente.get(offen[i]);
            if (k && !k.abstrakt) ersatz = k;
            else offen.push(...(m.ersetzungen.get(offen[i]) ?? []));
          }
          if (!ersatz) { if (p.grenzen.min) hinweise.add(`Abstraktes Element ohne Ersatz: ${anzeigename(m, p.ref)}`); break; }
          e = ersatz;
        }
        const n = rekursiv(e, stapel) ? p.grenzen.min : wieOft(p.grenzen.min, p.grenzen.max);
        for (let i = 0; i < n; i++) element(e, zerlegen(e.schluessel!).ns, t, stapel);
        break;
      }
      case "folge":
      case "alle": {
        const n = wieOft(p.grenzen.min, p.grenzen.max);
        for (let i = 0; i < n; i++) for (const x of p.teile) partikel(x, t, stapel);
        break;
      }
      case "auswahl": {
        const n = wieOft(p.grenzen.min, p.grenzen.max);
        // Die erste Möglichkeit, die nicht in eine Rekursion führt
        const wahl = p.teile.find((x) => !(x.art === "element" && rekursiv(x.dekl, stapel)) && !(x.art === "verweis" && m.elemente.has(x.ref) && rekursiv(m.elemente.get(x.ref)!, stapel))) ?? p.teile[0];
        for (let i = 0; i < n && wahl; i++) partikel(wahl, t, stapel);
        break;
      }
      case "gruppe": {
        const g = m.gruppen.get(p.ref);
        if (!g?.partikel) { if (p.grenzen.min) hinweise.add(`Gruppe fehlt: ${anzeigename(m, p.ref)}`); break; }
        const n = wieOft(p.grenzen.min, p.grenzen.max);
        for (let i = 0; i < n; i++) partikel(g.partikel, t, stapel);
        break;
      }
      case "beliebig": {
        if (!p.grenzen.min) break;
        const e = beliebiges(p.namensraum, p.quelle.datei, stapel);
        if (!e) { hinweise.add("Beliebiges Element (xs:any) verlangt, aber keins im Schema erklärt"); break; }
        for (let i = 0; i < p.grenzen.min; i++) element(e, zerlegen(e.schluessel!).ns, t, stapel);
        break;
      }
    }
  };

  const w = m.elemente.get(a.wurzel);
  if (!w) return { text: "", elemente: 0, gekuerzt: false, hinweise: [`Kein globales Element ${anzeigename(m, a.wurzel)}`] };
  const wurzelNs = zerlegen(a.wurzel).ns;
  element(w, wurzelNs, 0, [], true);

  // Namensräume, xsi und Schemaverweis an die Wurzel
  const ns = [...genutzt].map((x) => ` xmlns:${praefixe.get(x)}="${maskieren(x, true)}"`).join("");
  const ort = wurzelNs ? ` xsi:schemaLocation="${maskieren(`${wurzelNs} ${a.schemaOrt}`, true)}"` : ` xsi:noNamespaceSchemaLocation="${maskieren(a.schemaOrt, true)}"`;
  zeilen[0] = zeilen[0].replace("\u0000", `${ns} xmlns:xsi="${XSI_NS}"${ort}`);
  const kopf = [`<?xml version="1.0" encoding="UTF-8"?>`, `<!-- Beispiel zu ${a.schemaOrt.replace(/-{2,}/g, "-")}, aus dem Schema erzeugt (${a.umfang === "pflicht" ? "nur Pflichtteile" : "jedes Teil einmal"}). Die Werte sind Platzhalter. -->`];
  return { text: [...kopf, ...zeilen, ""].join("\n"), elemente, gekuerzt, hinweise: [...hinweise].slice(0, 10) };
}
