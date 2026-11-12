// Gelesenes XML Schema für die Schema-Übersicht: globale Elemente, benannte Typen, Gruppen und Attributgruppen über alle
// erreichbaren Dateien (Importe, Includes), Namen aufgelöst zu qualifizierten Namen. Lokale Erklärungen hängen an ihrem
// Typ. Jede Erklärung kennt ihre Stelle (Datei und Zeichenbereich), damit die Oberfläche dorthin springen kann.

export const XSD_NS = "http://www.w3.org/2001/XMLSchema";

/** Qualifizierter Name: "{namensraum}lokal", ohne Namensraum nur "lokal" */
export type QName = string;

export const qname = (ns: string, lokal: string): QName => (ns ? `{${ns}}${lokal}` : lokal);

export function zerlegen(q: QName): { readonly ns: string; readonly lokal: string } {
  if (!q.startsWith("{")) return { ns: "", lokal: q };
  const e = q.indexOf("}");
  return { ns: q.slice(1, e), lokal: q.slice(e + 1) };
}

export interface Quelle {
  readonly datei: string;
  readonly von: number;
  readonly bis: number;
}

/** minOccurs und maxOccurs; unbounded ist Infinity */
export interface Grenzen {
  readonly min: number;
  readonly max: number;
}

export type Partikel =
  | { readonly art: "element"; readonly dekl: Elementdekl; readonly grenzen: Grenzen }
  | { readonly art: "verweis"; readonly ref: QName; readonly grenzen: Grenzen; readonly quelle: Quelle }
  | { readonly art: "folge" | "auswahl" | "alle"; readonly teile: readonly Partikel[]; readonly grenzen: Grenzen; readonly quelle: Quelle }
  | { readonly art: "gruppe"; readonly ref: QName; readonly grenzen: Grenzen; readonly quelle: Quelle }
  | { readonly art: "beliebig"; readonly namensraum: string; readonly grenzen: Grenzen; readonly quelle: Quelle };

export interface Elementdekl {
  readonly name: string;
  /** Nur bei globalen Elementen */
  readonly schluessel: QName | null;
  readonly typ: QName | null;
  readonly lokalerTyp: Typdefinition | null;
  readonly abstrakt: boolean;
  /** substitutionGroup: das Element, an dessen Stelle dieses stehen darf */
  readonly ersetzt: QName | null;
  readonly vorgabe: string | null;
  readonly fest: string | null;
  readonly nillable: boolean;
  readonly doku: string | null;
  readonly quelle: Quelle;
}

export interface Attributdekl {
  readonly name: string;
  readonly ref: QName | null;
  readonly typ: QName | null;
  readonly lokalerTyp: Typdefinition | null;
  readonly pflicht: boolean;
  readonly verboten: boolean;
  readonly vorgabe: string | null;
  readonly fest: string | null;
  readonly doku: string | null;
  readonly quelle: Quelle;
}

export type Ableitung = "erweiterung" | "einschraenkung" | "liste" | "vereinigung";

export interface Facette {
  readonly art: string;
  readonly wert: string;
}

export interface Typdefinition {
  /** null bei anonymen Typen (direkt am Element oder Attribut) */
  readonly schluessel: QName | null;
  readonly name: string;
  readonly art: "komplex" | "einfach";
  readonly ableitung: Ableitung | null;
  /** Basis bei Erweiterung und Einschränkung, Eintragstyp bei Liste */
  readonly basis: QName | null;
  /** Anonymer Basis- oder Eintragstyp (simpleType im restriction oder list) */
  readonly lokaleBasis: Typdefinition | null;
  /** Bei Vereinigung: benannte und anonyme Mitglieder */
  readonly mitglieder: readonly QName[];
  readonly lokaleMitglieder: readonly Typdefinition[];
  readonly einfacherInhalt: boolean;
  readonly gemischt: boolean;
  readonly inhalt: Partikel | null;
  readonly attribute: readonly Attributdekl[];
  readonly attributgruppen: readonly QName[];
  readonly beliebigeAttribute: boolean;
  readonly facetten: readonly Facette[];
  /** Aufzählung (enumeration) mit Erklärung je Wert */
  readonly werte: readonly { readonly wert: string; readonly doku: string | null }[];
  readonly abstrakt: boolean;
  readonly doku: string | null;
  readonly quelle: Quelle;
}

export interface Gruppe {
  readonly schluessel: QName;
  readonly partikel: Partikel | null;
  readonly quelle: Quelle;
}

export interface Attributgruppe {
  readonly schluessel: QName;
  readonly attribute: readonly Attributdekl[];
  readonly attributgruppen: readonly QName[];
  readonly quelle: Quelle;
}

export interface Bezug {
  readonly art: "import" | "include" | "redefine" | "override";
  readonly namensraum: string | null;
  readonly ort: string | null;
  /** Pfad der gefundenen Datei, sonst null */
  readonly gefunden: string | null;
}

export interface Schemateil {
  readonly pfad: string;
  readonly zielnamensraum: string;
  /** Hauptschema oder von ihm eingebunden (include, redefine), nicht importiert */
  readonly haupt: boolean;
  readonly bezuege: readonly Bezug[];
}

export interface XsdModell {
  readonly haupt: string;
  readonly teile: readonly Schemateil[];
  readonly elemente: ReadonlyMap<QName, Elementdekl>;
  readonly typen: ReadonlyMap<QName, Typdefinition>;
  readonly gruppen: ReadonlyMap<QName, Gruppe>;
  readonly attributgruppen: ReadonlyMap<QName, Attributgruppe>;
  readonly attribute: ReadonlyMap<QName, Attributdekl>;
  /** Kopf einer Ersetzungsgruppe und die Elemente, die an seiner Stelle stehen dürfen */
  readonly ersetzungen: ReadonlyMap<QName, readonly QName[]>;
  /** Namensraum zu Präfix für die Anzeige (das Hauptschema zuerst) */
  readonly praefixe: ReadonlyMap<string, string>;
  /** Eingebundene Dateien, die nicht da sind (Ort oder Namensraum) */
  readonly fehlend: readonly string[];
  /** Dateien, die sich nicht als Schema lesen ließen */
  readonly fehler: readonly { readonly datei: string; readonly meldung: string }[];
}

/** Name zum Zeigen: mit dem Präfix, das das Schema dafür nutzt ("xs:string", "hl:position") */
export function anzeigename(m: Pick<XsdModell, "praefixe">, q: QName): string {
  const { ns, lokal } = zerlegen(q);
  if (!ns) return lokal;
  const p = m.praefixe.get(ns);
  return p ? `${p}:${lokal}` : lokal;
}

export const istEingebaut = (q: QName): boolean => zerlegen(q).ns === XSD_NS;

/** "1", "0..1", "0..n", "1..n", "2..5" */
export function vielfaltText(g: Grenzen): string {
  const max = g.max === Infinity ? "n" : String(g.max);
  return g.min === g.max ? String(g.min) : `${g.min}..${max}`;
}
