// Werte für Beispieldokumente aus XML Schema. Der Wertgeber ist austauschbar: Musterwerte (hier) nehmen den ersten
// erlaubten Wert und halten Muster, Längen, Grenzen und Stellen ein; die Testdaten (STB-8 Teil 10) können eigene
// Erzeuger (Namen, Postleitzahlen ...) einsetzen. Die Einschränkungen eines Typs sammelt einschraenkungen() über die
// ganze Ableitungskette.

import { istEingebaut, zerlegen, type QName, type Typdefinition, type XsdModell } from "./modell";
import { textZumMuster } from "./muster";

export interface Einschraenkungen {
  /** Name des eingebauten Grundtyps ("string", "date", "positiveInteger" ...) */
  readonly grundtyp: string;
  /** Liste von Werten (xs:list): ein Eintrag genügt */
  readonly liste: boolean;
  readonly werte: readonly string[];
  readonly muster: string | null;
  readonly laenge: number | null;
  readonly minLaenge: number | null;
  readonly maxLaenge: number | null;
  readonly min: { readonly wert: string; readonly inklusiv: boolean } | null;
  readonly max: { readonly wert: string; readonly inklusiv: boolean } | null;
  readonly nachkomma: number | null;
  readonly stellen: number | null;
}

export interface Werteingabe {
  readonly einschraenkungen: Einschraenkungen;
  /** Name des Elements oder Attributs, für sprechende Werte */
  readonly name: string;
  /** Laufende Nummer im Dokument (für eindeutige Kennungen) */
  readonly nummer: number;
}

export interface Wertgeber {
  wert(e: Werteingabe): string;
}

/** Kennungen bleiben Kennungen, auch wenn das gelesene Schema (das der Schemasprache selbst) ID weiter erklärt */
const KENNUNG = new Set(["ID", "IDREF", "IDREFS"]);
const nachschlagen = (m: XsdModell, q: QName | null): Typdefinition | null =>
  !q || (istEingebaut(q) && KENNUNG.has(zerlegen(q).lokal)) ? null : (m.typen.get(q) ?? null);

/** Einschränkungen eines einfachen Typs (oder des einfachen Inhalts eines komplexen) über alle Ableitungen */
export function einschraenkungen(m: XsdModell, typ: QName | null, lokal: Typdefinition | null): Einschraenkungen {
  const e = { grundtyp: "string", liste: false, werte: [] as string[], muster: null as string | null, laenge: null as number | null, minLaenge: null as number | null, maxLaenge: null as number | null, min: null as Einschraenkungen["min"], max: null as Einschraenkungen["max"], nachkomma: null as number | null, stellen: null as number | null };
  // Erst im gelesenen Schema suchen: auch das Schema der Schemasprache selbst erklärt Typen im XSD-Namensraum
  let t: Typdefinition | null = lokal ?? nachschlagen(m, typ);
  let q: QName | null = lokal ? null : typ;
  const gesehen = new Set<Typdefinition>();
  while (t && !gesehen.has(t)) {
    gesehen.add(t);
    // Das am weitesten abgeleitete gewinnt: nur setzen, was noch fehlt
    if (!e.werte.length && t.werte.length) e.werte = t.werte.map((w) => w.wert);
    for (const f of t.facetten) {
      const n = Number(f.wert);
      if (f.art === "pattern") e.muster ??= f.wert;
      else if (f.art === "length") e.laenge ??= n;
      else if (f.art === "minLength") e.minLaenge ??= n;
      else if (f.art === "maxLength") e.maxLaenge ??= n;
      else if (f.art === "minInclusive" || f.art === "minExclusive") e.min ??= { wert: f.wert, inklusiv: f.art === "minInclusive" };
      else if (f.art === "maxInclusive" || f.art === "maxExclusive") e.max ??= { wert: f.wert, inklusiv: f.art === "maxInclusive" };
      else if (f.art === "fractionDigits") e.nachkomma ??= n;
      else if (f.art === "totalDigits") e.stellen ??= n;
    }
    if (t.ableitung === "liste") e.liste = true;
    // Vereinigung: das erste Mitglied trägt den Wert
    if (t.ableitung === "vereinigung") {
      q = t.mitglieder[0] ?? null;
      t = q ? nachschlagen(m, q) : (t.lokaleMitglieder[0] ?? null);
      continue;
    }
    q = t.basis;
    t = t.lokaleBasis ?? nachschlagen(m, q);
  }
  if (q && istEingebaut(q)) e.grundtyp = zerlegen(q).lokal;
  return e;
}

const GANZZAHLIG = new Set(["integer", "int", "long", "short", "byte", "nonNegativeInteger", "positiveInteger", "nonPositiveInteger", "negativeInteger", "unsignedLong", "unsignedInt", "unsignedShort", "unsignedByte"]);
const ZAHL = new Set([...GANZZAHLIG, "decimal", "float", "double"]);
const FEST: Readonly<Record<string, string>> = {
  boolean: "true", date: "2026-01-15", dateTime: "2026-01-15T10:30:00", time: "10:30:00", gYear: "2026", gYearMonth: "2026-01",
  gMonthDay: "--01-15", gDay: "---15", gMonth: "--01", duration: "P1D", dayTimeDuration: "P1D", yearMonthDuration: "P1M",
  base64Binary: "QmVpc3BpZWw=", hexBinary: "0A", anyURI: "https://example.org/", language: "de", QName: "beispiel",
  NOTATION: "beispiel", Name: "beispiel", NCName: "beispiel", NMTOKEN: "beispiel", NMTOKENS: "beispiel", ENTITY: "beispiel", ENTITIES: "beispiel",
};

/** Zahl in den Grenzen und mit den erlaubten Stellen */
function zahl(e: Einschraenkungen): string {
  const ganz = GANZZAHLIG.has(e.grundtyp) || e.nachkomma === 0;
  let w = e.grundtyp === "negativeInteger" ? -1 : e.grundtyp === "nonPositiveInteger" ? 0 : ganz ? 1 : 1.5;
  const schritt = ganz ? 1 : 0.5;
  if (e.min) { const g = Number(e.min.wert); if (w < g || (!e.min.inklusiv && w <= g)) w = e.min.inklusiv ? g : g + schritt; }
  if (e.max) { const g = Number(e.max.wert); if (w > g || (!e.max.inklusiv && w >= g)) w = e.max.inklusiv ? g : g - schritt; }
  if (ganz) w = Math.round(w);
  let s = String(w);
  if (e.stellen !== null && s.replace(/[^0-9]/g, "").length > e.stellen) s = "1";
  return s;
}

/** Text mit der verlangten Länge */
function laenge(e: Einschraenkungen, s: string): string {
  const min = e.laenge ?? e.minLaenge ?? 0;
  const max = e.laenge ?? e.maxLaenge ?? Infinity;
  if (s.length < min) s = s + "x".repeat(min - s.length);
  if (s.length > max) s = s.slice(0, max);
  return s;
}

/** Passt ein Wert zum Muster? Nur prüfbar, wenn der Browser das Muster als Regex versteht (sonst: ja) */
function passtZumMuster(wert: string, muster: string): boolean {
  try {
    return new RegExp(`^(?:${muster})$`, "u").test(wert);
  } catch {
    return true;
  }
}

export const MUSTERWERTE: Wertgeber = {
  wert(eingabe) {
    const e = eingabe.einschraenkungen;
    if (e.werte.length) return e.werte[0];
    // Bei Datum, Zahl & Co. erst der übliche Wert: ein Muster allein trifft deren Wertebereich nicht immer
    const ueblich = grundwert(eingabe);
    if (e.muster === null || (e.grundtyp !== "string" && passtZumMuster(ueblich, e.muster))) return ueblich;
    return textZumMuster(e.muster) ?? ueblich;
  },
};

/** Der übliche Wert eines Grundtyps: Kennung, Zahl in den Grenzen, feste Form für Datum & Co., sonst Text */
function grundwert({ einschraenkungen: e, name, nummer }: Werteingabe): string {
  if (e.grundtyp === "ID") return `id${nummer}`;
  if (e.grundtyp === "IDREF" || e.grundtyp === "IDREFS") return "id1";
  if (ZAHL.has(e.grundtyp)) return zahl(e);
  if (e.min && FEST[e.grundtyp]) return e.min.wert;
  if (FEST[e.grundtyp]) return FEST[e.grundtyp];
  // Text: der Name als Platzhalter, in der erlaubten Länge
  return laenge(e, name ? `Beispiel ${name}`.slice(0, 40) : "Beispiel");
}
