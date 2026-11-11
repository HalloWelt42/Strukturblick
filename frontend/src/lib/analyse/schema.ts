// Struktur (entwuerfe/struktur.html): das Schema eines Dokuments, abgeleitet aus allen Knoten. Jeder Musterpfad, an
// dem Objekte stehen, wird ein Typ mit Feldern; der Name kommt aus dem Schlüssel (Listen in der Einzahl: bestellungen
// wird Bestellung). Felder wissen, ob sie in jedem Objekt stehen, welche Werte sie tragen und ob sie eindeutig sind.
// Daraus entsteht JSON Schema (Entwurf 2020-12). Grundlage für Validieren, Code erzeugen und Testdaten. Rein.

import { KnotenArt, type Strukturindex } from "../kern/strukturindex";
import { felderSammeln, type Feld } from "./statistik";

/** Anteil, ab dem ein Textmuster (Datum, nur Ziffern) für ein Feld gilt */
const MUSTER_ANTEIL = 0.95;

/**
 * Muster eines Textfelds: "datum" und "datum-zeit" in ISO-Form (so verlangt JSON Schema sie), "datum-frei" für
 * andere Datumsformen (TT.MM.JJJJ, gemischt), "ziffern" für Nummern aus Ziffern.
 */
export type Textformat = "datum" | "datum-zeit" | "datum-frei" | "ziffern";

/** Was ein Wert sein kann; ein Feld trägt eine oder mehrere Arten */
export type Wertart =
  | { readonly art: "objekt"; readonly typ: string }
  | { readonly art: "liste"; readonly von: readonly Wertart[] }
  | { readonly art: "text"; readonly format: Textformat | null }
  | { readonly art: "zahl"; readonly ganz: boolean }
  | { readonly art: "wahrheitswert" }
  | { readonly art: "null" };

export interface Schemafeld {
  readonly name: string;
  readonly arten: readonly Wertart[];
  readonly vorkommen: number;
  /** Steht in jedem Objekt des Typs */
  readonly pflicht: boolean;
  /** In jedem Objekt und überall verschieden (taugt als Schlüssel) */
  readonly schluessel: boolean;
  /** Musterpfad des Felds (für Wahl und Anzeige) */
  readonly pfad: string;
  readonly erster: number;
}

export interface Typ {
  readonly name: string;
  /** Musterpfad, an dem die Objekte stehen ("" = Wurzel) */
  readonly pfad: string;
  readonly vorkommen: number;
  readonly erster: number;
  readonly felder: readonly Schemafeld[];
  /** Woher der Name kommt */
  readonly namensquelle: "wurzel" | "schluessel" | "liste";
}

export interface Schema {
  /** Wurzel zuerst, dann in der Reihenfolge des ersten Auftretens */
  readonly typen: readonly Typ[];
  /** Was die Wurzel ist (ein Typ, eine Liste von ...) */
  readonly wurzel: readonly Wertart[];
  readonly knoten: number;
}

/** Einzahl deutscher und englischer Listennamen, so gut es ohne Wörterbuch geht */
export function einzahl(wort: string): string {
  const regeln: [RegExp, string][] = [[/ungen$/, "ung"], [/ionen$/, "ion"], [/heiten$/, "heit"], [/keiten$/, "keit"], [/ies$/, "y"], [/(\w{3})en$/, "$1e"], [/([^s])s$/, "$1"]];
  for (const [r, ersatz] of regeln) if (r.test(wort)) return wort.replace(r, ersatz);
  return wort;
}

/** Schlüssel, wie er im Dokument steht (Musterpfade setzen Schlüssel mit Sonderzeichen in Anführungszeichen) */
const rohName = (n: string): string => (n.startsWith('"') ? (JSON.parse(n) as string) : n);

const gross = (s: string): string => s.charAt(0).toLocaleUpperCase("de") + s.slice(1);

/** Lesbarer Typname aus einem Schlüssel: Wörter getrennt durch _ oder - werden zusammengeschrieben */
function typname(schluessel: string): string {
  const teile = rohName(schluessel).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return teile.length ? teile.map(gross).join("") : "Eintrag";
}

export function schemaAbleiten(index: Strukturindex, text: string): Schema {
  if (!index.anzahl) return { typen: [], wurzel: [], knoten: 0 };
  const { felder } = felderSammeln(index, text, 0, false);
  const nachPfad = new Map(felder.map((f) => [f.pfad, f]));

  // Typnamen: aus dem Schlüssel des Felds; Listeneinträge aus dem Listennamen in der Einzahl; doppelte bekommen eine Zahl
  const namen = new Map<string, { name: string; quelle: Typ["namensquelle"] }>();
  const vergeben = new Set<string>();
  const benennen = (f: Feld): void => {
    let roh: string;
    let quelle: Typ["namensquelle"];
    if (f.pfad === "") { roh = "Wurzel"; quelle = "wurzel"; }
    else if (f.name === "[]") {
      const liste = nachPfad.get(f.vorsilbe);
      roh = liste && liste.pfad !== "" && liste.name !== "[]" ? typname(einzahl(rohName(liste.name))) : "Eintrag";
      quelle = "liste";
    }
    else { roh = typname(f.name); quelle = "schluessel"; }
    let name = roh;
    for (let i = 2; vergeben.has(name); i++) name = `${roh}${i}`;
    vergeben.add(name);
    namen.set(f.pfad, { name, quelle });
  };
  for (const f of felder) if (f.objekte > 0) benennen(f);

  const wertarten = (pfad: string): Wertart[] => {
    const f = nachPfad.get(pfad);
    if (!f) return [];
    const a: Wertart[] = [];
    if (f.objekte > 0) a.push({ art: "objekt", typ: namen.get(pfad)!.name });
    if (f.arten[KnotenArt.liste]) a.push({ art: "liste", von: wertarten(`${pfad}[]`) });
    const texte = f.arten[KnotenArt.text];
    if (texte) {
      const anteil = (n: number) => n >= texte * MUSTER_ANTEIL;
      const format: Textformat | null = anteil(f.isoDatum) ? "datum" : anteil(f.isoDatumZeit) ? "datum-zeit" : anteil(f.wieDatum) ? "datum-frei" : anteil(f.nurZiffern) ? "ziffern" : null;
      a.push({ art: "text", format });
    }
    if (f.arten[KnotenArt.zahl]) a.push({ art: "zahl", ganz: f.ganz });
    if (f.arten[KnotenArt.wahrheitswert]) a.push({ art: "wahrheitswert" });
    if (f.arten[KnotenArt.nichts]) a.push({ art: "null" });
    return a;
  };

  const typen: Typ[] = [];
  for (const f of felder) {
    if (f.objekte === 0) continue;
    const vorsilbe = f.pfad === "" ? "" : `${f.pfad}.`;
    const kinder = felder.filter((k) => k.vorsilbe === vorsilbe && k.name !== "[]" && k.pfad !== "");
    const n = namen.get(f.pfad)!;
    typen.push({
      name: n.name, pfad: f.pfad, vorkommen: f.objekte, erster: f.erster, namensquelle: n.quelle,
      felder: mitSchluessel(kinder.map((k) => {
        const einfach = k.vorkommen - k.arten[KnotenArt.objekt] - k.arten[KnotenArt.liste] - k.nichts;
        const pflicht = k.vorkommen >= f.objekte;
        const arten = wertarten(k.pfad);
        const eindeutig = pflicht && f.objekte > 1 && einfach === k.vorkommen && !k.verschiedeneMehr && k.verschiedene === k.vorkommen && k.arten[KnotenArt.wahrheitswert] === 0;
        const datum = arten.some((x) => x.art === "text" && (x.format === "datum" || x.format === "datum-zeit" || x.format === "datum-frei"));
        return { name: rohName(k.name), arten, vorkommen: k.vorkommen, pflicht, pfad: k.pfad, erster: k.erster, schluessel: eindeutig && !datum };
      })),
    });
  }
  return { typen, wurzel: wertarten(""), knoten: index.anzahl };
}

/** Höchstens ein Schlüssel je Typ: das erste eindeutige Feld (meist die Nummer vorn) */
function mitSchluessel(felder: Schemafeld[]): Schemafeld[] {
  const erster = felder.findIndex((f) => f.schluessel);
  return felder.map((f, i) => (f.schluessel && i !== erster ? { ...f, schluessel: false } : f));
}

/** Wertarten für Menschen ("Liste von Bestellung", "Text oder Null") */
export function beschreiben(arten: readonly Wertart[]): string {
  const eins = (a: Wertart): string => {
    switch (a.art) {
      case "objekt": return a.typ;
      case "liste": return a.von.length ? `Liste von ${beschreiben(a.von)}` : "Liste, immer leer";
      case "text": return a.format === "datum" ? "Datum" : a.format === "datum-zeit" ? "Datum und Zeit" : a.format === "datum-frei" ? "Datum, verschiedene Formen" : a.format === "ziffern" ? "Text, nur Ziffern" : "Text";
      case "zahl": return a.ganz ? "Zahl, ganz" : "Zahl";
      case "wahrheitswert": return "Wahrheitswert";
      case "null": return "Null";
    }
  };
  return arten.map(eins).join(" oder ") || "nichts";
}

/** Kante zum Kindtyp: genau eines, keins oder eines, beliebig viele */
export function vielfalt(f: Schemafeld): string {
  return f.arten.some((a) => a.art === "liste") ? "0..n" : f.pflicht && !f.arten.some((a) => a.art === "null") ? "1" : "0..1";
}

// ----- JSON Schema --------------------------------------------------------------------------------------------------

type Json = { [k: string]: unknown };

function jsonArten(arten: readonly Wertart[]): Json {
  const teile: Json[] = arten.map((a) => {
    switch (a.art) {
      case "objekt": return { $ref: `#/$defs/${a.typ}` };
      case "liste": return a.von.length ? { type: "array", items: jsonArten(a.von) } : { type: "array" };
      case "text": return a.format === "datum" ? { type: "string", format: "date" } : a.format === "datum-zeit" ? { type: "string", format: "date-time" } : a.format === "ziffern" ? { type: "string", pattern: "^[0-9]+$" } : { type: "string" };
      case "zahl": return { type: a.ganz ? "integer" : "number" };
      case "wahrheitswert": return { type: "boolean" };
      case "null": return { type: "null" };
    }
  });
  if (teile.length === 0) return {};
  if (teile.length === 1) return teile[0];
  // Nur einfache Typen ohne weitere Angaben lassen sich als Liste von Typen zusammenfassen
  if (teile.every((t) => Object.keys(t).length === 1 && typeof t.type === "string")) return { type: teile.map((t) => t.type) };
  return { anyOf: teile };
}

export function typAlsJsonSchema(t: Typ): Json {
  const pflicht = t.felder.filter((f) => f.pflicht).map((f) => f.name);
  return {
    type: "object",
    ...(pflicht.length ? { required: pflicht } : {}),
    properties: Object.fromEntries(t.felder.map((f) => [f.name, jsonArten(f.arten)])),
  };
}

export function alsJsonSchema(s: Schema, titel: string): Json {
  const wurzelTyp = s.typen.find((t) => t.pfad === "");
  const defs = Object.fromEntries(s.typen.filter((t) => t !== wurzelTyp).map((t) => [t.name, typAlsJsonSchema(t)]));
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: titel,
    ...(wurzelTyp ? typAlsJsonSchema(wurzelTyp) : jsonArten(s.wurzel)),
    ...(Object.keys(defs).length ? { $defs: defs } : {}),
  };
}
