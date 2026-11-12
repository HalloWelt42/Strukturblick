// XML Schema aus XML-Daten ableiten, Teil 2: Schreiben. Je Namensraum eine Datei; die Datei der Wurzel importiert die
// übrigen (und jede, was sie selbst braucht). Lokale Elemente stehen verschachtelt an ihrer Stelle (wie im Dokument),
// Elemente und Attribute anderer Namensräume als Verweis. Steht im Dokument ein Typ (xsi:type), wird er benannt erklärt
// und das Element bleibt dafür offen; ein Vorkommen mit xsi:nil macht es nillable. Reihenfolge aus den Daten; wechselt
// sie, eine Auswahl in beliebiger Reihenfolge. Pflicht (einmal) ist, was in jedem Vorkommen da ist; was mehrfach
// vorkommt, darf beliebig oft.

import type { Ableitung, Attributsammlung, Deklaration, Kindsammlung } from "./ableiten";
import { XML_NS } from "./ableiten";
import { zerlegen } from "./modell";

export interface Schemaausgabe {
  readonly ns: string;
  readonly name: string;
  readonly haupt: boolean;
  readonly text: string;
}

export interface Ausgabeangaben {
  /** Name des Dokuments, aus dem abgeleitet wurde (für den Kopfkommentar) */
  readonly quelle: string;
  /** Dateiname je Namensraum; `praefix` ist leer ohne Namensraum */
  readonly dateiname: (ns: string, praefix: string, haupt: boolean) => string;
}

const EIN = "  ";
const maskieren = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/** Kinder in einer Reihenfolge, die zu allen beobachteten "a vor b" passt; bei Gleichstand wie zuerst gesehen */
function geordnet(d: Deklaration): Kindsammlung[] {
  const kinder = [...d.kinder.values()];
  const rest = new Set(kinder.map((k) => k.schluessel));
  const aus: Kindsammlung[] = [];
  while (rest.size) {
    const frei = kinder.find((k) => rest.has(k.schluessel) && ![...rest].some((v) => v !== k.schluessel && d.vorher.has(`${v}\u0000${k.schluessel}`)));
    const k = frei ?? kinder.find((x) => rest.has(x.schluessel))!;
    aus.push(k);
    rest.delete(k.schluessel);
  }
  return aus;
}

const vielfalt = (min: number, max: number): string =>
  `${min !== 1 ? ` minOccurs="${min}"` : ""}${max !== 1 ? ` maxOccurs="${max > 1 ? "unbounded" : max}"` : ""}`;

export function xsdSchreiben(a: Ableitung, angaben: Ausgabeangaben): Schemaausgabe[] {
  const wurzelNs = zerlegen(a.wurzel).ns;
  const namensraeume = [wurzelNs];
  const nsDazu = (ns: string) => { if (!namensraeume.includes(ns)) namensraeume.push(ns); };
  for (const d of a.deklarationen.values()) if (d.global) nsDazu(d.ns);
  for (const g of a.globaleAttribute.values()) nsDazu(g.ns);
  const praefix = (ns: string): string => a.praefixe.get(ns) ?? "";
  const dateiname = (ns: string) => angaben.dateiname(ns, praefix(ns), ns === wurzelNs);

  return namensraeume.map((ns) => {
    const verwiesen = new Set<string>();
    const zeilen: string[] = [];
    const ref = (kns: string, name: string): string => {
      verwiesen.add(kns);
      return kns ? `${praefix(kns)}:${name}` : name;
    };

    const attributZeile = (s: Attributsammlung, elementAnzahl: number, tiefe: number): string => {
      const use = s.anzahl >= elementAnzahl ? ` use="required"` : "";
      return s.ns
        ? `${EIN.repeat(tiefe)}<xs:attribute ref="${ref(s.ns, s.name)}"${use}/>`
        : `${EIN.repeat(tiefe)}<xs:attribute name="${s.name}" type="xs:${s.werte.typ()}"${use}/>`;
    };

    const texttyp = (d: Deklaration): string => `xs:${d.text.belegt ? d.text.typ() : "string"}`;
    const einfach = (d: Deklaration): boolean => !d.kinder.size && !d.attribute.size && !d.xmlAttribute;

    /** Ein Element ab Tiefe `t`: mit xsi:type im Dokument offen (jeder Typ), einfach mit Typ, sonst mit komplexem Typ */
    const element = (d: Deklaration, kopf: string, occ: string, t: number): void => {
      const e = EIN.repeat(t);
      const nil = d.nillable ? ' nillable="true"' : "";
      if (d.xsiTypen) zeilen.push(`${e}${kopf}${nil}${occ}/>`);
      else if (einfach(d)) zeilen.push(`${e}${kopf} type="${texttyp(d)}"${nil}${occ}/>`);
      else {
        zeilen.push(`${e}${kopf}${nil}${occ}>`);
        komplex(d, "", t + 1);
        zeilen.push(`${e}</xs:element>`);
      }
    };

    /** complexType (anonym oder benannt) mit Kindern, Text und Attributen ab Tiefe `t` */
    const komplex = (d: Deklaration, name: string, t: number): void => {
      const e = EIN.repeat(t);
      const kinder = geordnet(d);
      const gemischt = d.gemischt || (kinder.length > 0 && d.text.belegt > 0);
      zeilen.push(`${e}<xs:complexType${name}${gemischt ? ' mixed="true"' : ""}>`);
      const attributeSchreiben = (tiefe: number) => {
        for (const s of d.attribute.values()) zeilen.push(attributZeile(s, d.anzahl, tiefe));
        if (d.xmlAttribute) zeilen.push(`${EIN.repeat(tiefe)}<xs:anyAttribute namespace="${XML_NS}" processContents="skip"/>`);
      };
      // Text neben Attributen (auch nur Leerraum): einfacher Inhalt, sonst wäre das Element streng leer
      if (!kinder.length && d.text.zeichen) {
        zeilen.push(`${e}${EIN}<xs:simpleContent>`, `${e}${EIN.repeat(2)}<xs:extension base="${texttyp(d)}">`);
        attributeSchreiben(t + 3);
        zeilen.push(`${e}${EIN.repeat(2)}</xs:extension>`, `${e}${EIN}</xs:simpleContent>`);
      } else {
        if (kinder.length) {
          const kein = d.mitKindern < d.anzahl;
          zeilen.push(d.ungeordnet ? `${e}${EIN}<xs:choice minOccurs="0" maxOccurs="unbounded">` : `${e}${EIN}<xs:sequence>`);
          for (const k of kinder) {
            // Mehr als einmal Pflicht wäre Zufall der Daten: höchstens 1
            const min = d.ungeordnet ? 1 : k.mit < d.anzahl || kein ? 0 : Math.min(1, k.min);
            const max = d.ungeordnet ? 1 : k.max;
            const occ = vielfalt(min, max);
            if (k.global) zeilen.push(`${e}${EIN.repeat(2)}<xs:element ref="${ref(k.ns, k.name)}"${occ}/>`);
            else {
              const form = ns && !k.ns ? ' form="unqualified"' : "";
              element(a.deklarationen.get(k.schluessel)!, `<xs:element name="${k.name}"${form}`, occ, t + 2);
            }
          }
          zeilen.push(d.ungeordnet ? `${e}${EIN}</xs:choice>` : `${e}${EIN}</xs:sequence>`);
        }
        attributeSchreiben(t + 1);
      }
      zeilen.push(`${e}</xs:complexType>`);
    };

    // Globale Elemente dieses Namensraums (die Wurzel zuerst), benannte Typen aus xsi:type, globale Attribute
    for (const d of a.deklarationen.values()) if (d.global && d.art === "element" && d.ns === ns) element(d, `<xs:element name="${d.name}"`, "", 1);
    for (const d of a.deklarationen.values()) {
      if (d.art !== "typ" || d.ns !== ns) continue;
      if (einfach(d)) zeilen.push(`${EIN}<xs:simpleType name="${d.name}">`, `${EIN.repeat(2)}<xs:restriction base="${texttyp(d)}"/>`, `${EIN}</xs:simpleType>`);
      else komplex(d, ` name="${d.name}"`, 1);
    }
    for (const g of a.globaleAttribute.values()) if (g.ns === ns) zeilen.push(`${EIN}<xs:attribute name="${g.name}" type="xs:${g.werte.typ()}"/>`);

    // Die Hauptdatei lädt alle übrigen: Typen aus xsi:type braucht der Prüfer, auch ohne Verweis darauf
    if (ns === wurzelNs) for (const x of namensraeume) verwiesen.add(x);
    verwiesen.delete(ns);
    const nsAngaben = [...new Set([ns, ...verwiesen])].filter(Boolean).map((x) => ` xmlns:${praefix(x)}="${maskieren(x)}"`).join("");
    const kopf = [
      `<?xml version="1.0" encoding="UTF-8"?>`,
      `<!-- Aus ${angaben.quelle.replace(/-{2,}/g, "-")} abgeleitet: so streng, wie die Daten es zeigen (${a.elemente.toLocaleString("de-DE")} Elemente gelesen). Vor dem Einsatz prüfen und wo nötig lockern. -->`,
      `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"${nsAngaben}${ns ? ` targetNamespace="${maskieren(ns)}" elementFormDefault="qualified"` : ""}>`,
      ...[...verwiesen].map((v) => `${EIN}<xs:import${v ? ` namespace="${maskieren(v)}"` : ""} schemaLocation="${maskieren(dateiname(v))}"/>`),
    ];
    return { ns, name: dateiname(ns), haupt: ns === wurzelNs, text: [...kopf, ...zeilen, `</xs:schema>`, ""].join("\n") };
  });
}

/** Zahlen zur Ableitung für die Meldung: Elemente, Erklärungen, beliebige Reihenfolge */
export function ableitungZahlen(a: Ableitung): { readonly erklaerungen: number; readonly ungeordnet: number; readonly namensraeume: number } {
  const d = [...a.deklarationen.values()];
  return { erklaerungen: d.length, ungeordnet: d.filter((x) => x.ungeordnet).length, namensraeume: new Set(d.map((x) => (x.global ? x.ns : x.schemaNs))).size };
}
