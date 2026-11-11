// Validieren (entwuerfe/validieren.html): ein Dokument gegen ein JSON Schema prüfen. Gerechnet wird mit
// @cfworker/json-schema (Entwürfe 4, 7, 2019-09, 2020-12, ohne eval). Aus dessen Ausgabe werden Befunde für Menschen:
// nur die eigentlichen Regelverstöße (nicht die Zwischenstufen properties, items, $ref), mit deutscher Meldung, Soll
// und Ist, Stelle im Dokument (Knoten, Zeile, Spalte) und im Schema. "format" ist in 2020-12 nur ein Hinweis und wird
// Warnung. Rein, ohne Browser.

import { Validator, type OutputUnit, type Schema } from "@cfworker/json-schema";
import { inhalt, istBehaelter, KEIN, KnotenArt, type Strukturindex } from "../kern/strukturindex";
import { knotenZu } from "../kern/pfade";
import { wertAus } from "./wert";

export type Befundart = "fehler" | "warnung";

export interface Befund {
  readonly art: Befundart;
  /** JSON Pointer der Stelle im Dokument ("" = Wurzel) */
  readonly zeiger: string;
  /** Knoten im Index; KEIN, wenn die Stelle fehlt */
  readonly knoten: number;
  readonly zeile: number;
  readonly spalte: number;
  readonly meldung: string;
  readonly erwartet: string;
  /** Wie der Wert im Dokument steht (bei Behältern kurz beschrieben) */
  readonly gefunden: string;
  /** Regel als Kurztext ("pattern ^[0-9]{5}$") */
  readonly regel: string;
  /** Wo die Regel im Schema steht ("#/$defs/Kunde/properties/plz") */
  readonly imSchema: string;
  /** Vorschlag zum Beheben (nur wo eindeutig, etwa fehlende führende Nullen) */
  readonly vorschlag: string | null;
}

export type Pruefung =
  | { readonly ok: true; readonly befunde: readonly Befund[]; readonly dauer: number }
  | { readonly ok: false; readonly fehler: string };

/** Zwischenstufen: sie melden nur, dass darunter etwas nicht passt */
const ZWISCHEN = new Set(["properties", "items", "prefixItems", "$ref", "$dynamicRef", "allOf", "additionalItems", "unevaluatedItems", "patternProperties", "dependentSchemas", "contains", "if", "then", "else", "false"]);

const TYP_NAME: Record<string, string> = { string: "Text", number: "Zahl", integer: "ganze Zahl", boolean: "Wahrheitswert", null: "Null", object: "Objekt", array: "Liste" };
const FORMAT_NAME: Record<string, string> = {
  date: "Datum wie 2026-11-10", "date-time": "Datum mit Zeit wie 2026-11-10T08:00:00Z", time: "Uhrzeit wie 08:00:00",
  email: "E-Mail-Adresse", uri: "vollständige Adresse (URI)", "uri-reference": "Adresse (URI)", uuid: "UUID", ipv4: "IPv4-Adresse", ipv6: "IPv6-Adresse", hostname: "Rechnername",
};

/** Welcher Entwurf: aus $schema, sonst 2020-12 */
function entwurf(schema: Record<string, unknown>): "4" | "7" | "2019-09" | "2020-12" {
  const s = String(schema.$schema ?? "");
  if (s.includes("draft-04")) return "4";
  if (s.includes("draft-06") || s.includes("draft-07")) return "7";
  if (s.includes("2019-09")) return "2019-09";
  return "2020-12";
}

/** Knoten im Schema zu einem keywordLocation, $ref wird dabei aufgelöst (nur lokale Verweise #/...) */
function schemaKnoten(schema: unknown, ort: string): unknown {
  let k: unknown = schema;
  for (const teil of ort.replace(/^#\/?/, "").split("/").filter(Boolean).map((t) => decodeURIComponent(t).replaceAll("~1", "/").replaceAll("~0", "~"))) {
    if (teil === "$ref" && k && typeof k === "object" && typeof (k as Record<string, unknown>).$ref === "string") {
      k = schemaKnoten(schema, (k as Record<string, string>).$ref);
      continue;
    }
    k = k && typeof k === "object" ? (k as Record<string, unknown>)[teil] : undefined;
  }
  return k;
}

/** Ort im Schema für Menschen: $ref-Sprünge durch ihr Ziel ersetzt, ohne das Schlüsselwort am Ende */
function schemaOrt(schema: unknown, ort: string): string {
  const teile = ort.replace(/^#\/?/, "").split("/");
  teile.pop();
  let lesbar = "#";
  let k: unknown = schema;
  for (const t of teile) {
    if (t === "$ref" && k && typeof k === "object" && typeof (k as Record<string, unknown>).$ref === "string") {
      lesbar = (k as Record<string, string>).$ref;
      k = schemaKnoten(schema, lesbar);
      continue;
    }
    lesbar += `/${t}`;
    k = k && typeof k === "object" ? (k as Record<string, unknown>)[decodeURIComponent(t)] : undefined;
  }
  return lesbar;
}

const zeigerAusOrt = (ort: string): string => {
  const roh = ort.replace(/^#/, "");
  try {
    return decodeURIComponent(roh);
  } catch {
    return roh;
  }
};

function zeileSpalte(text: string, pos: number): { zeile: number; spalte: number } {
  let zeile = 1;
  let anfang = 0;
  for (let i = text.indexOf("\n"); i !== -1 && i < pos; i = text.indexOf("\n", i + 1)) {
    zeile++;
    anfang = i + 1;
  }
  return { zeile, spalte: pos - anfang + 1 };
}

function gefundenText(index: Strukturindex, text: string, k: number): string {
  if (k === KEIN) return "fehlt";
  const art = index.art[k];
  if (art === KnotenArt.objekt) return `Objekt mit ${index.kinder[k]} Feldern`;
  if (art === KnotenArt.liste) return `Liste mit ${index.kinder[k]} Einträgen`;
  if (art === KnotenArt.nichts) return "null";
  const s = inhalt(index, text, k);
  return art === KnotenArt.text ? JSON.stringify(s) : s;
}

const typText = (t: unknown): string => (Array.isArray(t) ? t.map((x) => TYP_NAME[x] ?? x).join(" oder ") : (TYP_NAME[String(t)] ?? String(t)));
const anzahlZeichen = (s: string): number => [...s].length;

/** Meldung, Soll, Regel und Vorschlag zu einem Regelverstoß */
function beschreiben(e: OutputUnit, regelWert: unknown, index: Strukturindex, text: string, k: number): { meldung: string; erwartet: string; regel: string; vorschlag: string | null } {
  const roh = k !== KEIN && !istBehaelter(index.art[k]) ? inhalt(index, text, k) : "";
  const r = (w: unknown) => `${e.keyword} ${typeof w === "string" ? w : JSON.stringify(w)}`;
  switch (e.keyword) {
    case "type": return { meldung: `${k === KEIN ? "Wert" : gefundenText(index, text, k)} hat den falschen Typ`, erwartet: typText(regelWert), regel: r(regelWert), vorschlag: null };
    case "required": {
      const feld = /property "(.*)"/.exec(e.error)?.[1] ?? "?";
      return { meldung: `Pflichtfeld ${feld} fehlt`, erwartet: `Feld ${feld}`, regel: `required ${feld}`, vorschlag: null };
    }
    case "pattern": {
      const p = String(regelWert);
      const ziffern = /^\^\[0-9\]\{(\d+)\}\$$|^\^\\d\{(\d+)\}\$$/.exec(p);
      const n = ziffern ? Number(ziffern[1] ?? ziffern[2]) : 0;
      if (n && /^\d+$/.test(roh) && roh.length < n) {
        return { meldung: `Hat ${roh.length} statt ${n} Ziffern`, erwartet: `Text aus ${n} Ziffern`, regel: r(p), vorschlag: roh.padStart(n, "0") };
      }
      return { meldung: "Passt nicht zum Muster", erwartet: `Text nach dem Muster ${p}`, regel: r(p), vorschlag: null };
    }
    case "minimum": return { meldung: `${roh} ist kleiner als das Minimum ${regelWert}`, erwartet: `Zahl ab ${regelWert}`, regel: r(regelWert), vorschlag: null };
    case "maximum": return { meldung: `${roh} ist größer als das Maximum ${regelWert}`, erwartet: `Zahl bis ${regelWert}`, regel: r(regelWert), vorschlag: null };
    case "exclusiveMinimum": return { meldung: `${roh} ist nicht größer als ${regelWert}`, erwartet: `Zahl über ${regelWert}`, regel: r(regelWert), vorschlag: null };
    case "exclusiveMaximum": return { meldung: `${roh} ist nicht kleiner als ${regelWert}`, erwartet: `Zahl unter ${regelWert}`, regel: r(regelWert), vorschlag: null };
    case "multipleOf": return { meldung: `${roh} ist kein Vielfaches von ${regelWert}`, erwartet: `Vielfaches von ${regelWert}`, regel: r(regelWert), vorschlag: null };
    case "minLength": return { meldung: `Text hat ${anzahlZeichen(roh)} Zeichen, verlangt sind mindestens ${regelWert}`, erwartet: `mindestens ${regelWert} Zeichen`, regel: r(regelWert), vorschlag: null };
    case "maxLength": return { meldung: `Text hat ${anzahlZeichen(roh)} Zeichen, erlaubt sind höchstens ${regelWert}`, erwartet: `höchstens ${regelWert} Zeichen`, regel: r(regelWert), vorschlag: null };
    case "minItems": return { meldung: `Liste hat ${k === KEIN ? 0 : index.kinder[k]} Einträge, verlangt sind mindestens ${regelWert}`, erwartet: `mindestens ${regelWert} Einträge`, regel: r(regelWert), vorschlag: null };
    case "maxItems": return { meldung: `Liste hat ${k === KEIN ? 0 : index.kinder[k]} Einträge, erlaubt sind höchstens ${regelWert}`, erwartet: `höchstens ${regelWert} Einträge`, regel: r(regelWert), vorschlag: null };
    case "uniqueItems": return { meldung: "Liste enthält doppelte Einträge", erwartet: "lauter verschiedene Einträge", regel: "uniqueItems", vorschlag: null };
    case "enum": {
      const werte = Array.isArray(regelWert) ? regelWert : [];
      return { meldung: "Wert ist nicht erlaubt", erwartet: `einer von ${werte.slice(0, 8).map((w) => JSON.stringify(w)).join(", ")}${werte.length > 8 ? ` und ${werte.length - 8} weitere` : ""}`, regel: "enum", vorschlag: null };
    }
    case "const": return { meldung: "Wert ist nicht der verlangte", erwartet: JSON.stringify(regelWert), regel: r(regelWert), vorschlag: null };
    case "format": return { meldung: `Kein gültiges Format ${regelWert}`, erwartet: FORMAT_NAME[String(regelWert)] ?? `Format ${regelWert}`, regel: r(regelWert), vorschlag: null };
    case "additionalProperties": {
      const feld = /Property "(.*)"/.exec(e.error)?.[1] ?? "?";
      return { meldung: `Feld ${feld} ist im Schema nicht vorgesehen`, erwartet: "nur die im Schema genannten Felder", regel: "additionalProperties false", vorschlag: null };
    }
    case "minProperties": return { meldung: `Objekt hat zu wenige Felder`, erwartet: `mindestens ${regelWert} Felder`, regel: r(regelWert), vorschlag: null };
    case "maxProperties": return { meldung: `Objekt hat zu viele Felder`, erwartet: `höchstens ${regelWert} Felder`, regel: r(regelWert), vorschlag: null };
    case "anyOf": return { meldung: "Passt zu keiner der erlaubten Formen", erwartet: "eine der Formen unter anyOf", regel: "anyOf", vorschlag: null };
    case "oneOf": return { meldung: "Passt nicht zu genau einer der erlaubten Formen", erwartet: "genau eine der Formen unter oneOf", regel: "oneOf", vorschlag: null };
    case "not": return { meldung: "Passt zu einer ausgeschlossenen Form", erwartet: "nicht die Form unter not", regel: "not", vorschlag: null };
    case "dependentRequired": return { meldung: "Ein abhängiges Pflichtfeld fehlt", erwartet: "die unter dependentRequired genannten Felder", regel: "dependentRequired", vorschlag: null };
    default: return { meldung: `Regel ${e.keyword} verletzt`, erwartet: e.keyword, regel: e.keyword, vorschlag: null };
  }
}

/** Schema aus Text lesen; null mit Grund, wenn es kein Schema ist */
export function schemaLesen(text: string): { ok: true; schema: Record<string, unknown> } | { ok: false; fehler: string } {
  let s: unknown;
  try {
    s = JSON.parse(text);
  } catch (f) {
    return { ok: false, fehler: `Das Schema ist kein gültiges JSON: ${(f as Error).message}` };
  }
  if (!s || typeof s !== "object" || Array.isArray(s)) return { ok: false, fehler: "Ein JSON Schema ist ein Objekt (etwa mit type und properties)" };
  return { ok: true, schema: s as Record<string, unknown> };
}

export function pruefen(index: Strukturindex, text: string, schema: Record<string, unknown>): Pruefung {
  const beginn = Date.now();
  let ausgabe: { valid: boolean; errors: OutputUnit[] };
  try {
    ausgabe = new Validator(schema as Schema, entwurf(schema), false).validate(wertAus(index, text));
  } catch (f) {
    return { ok: false, fehler: `Das Schema lässt sich nicht anwenden: ${(f as Error).message}` };
  }
  // Unter anyOf, oneOf und not gemeldete Zweigfehler wiederholen nur, warum keine Form passt
  const zweige = ausgabe.errors.filter((e) => e.keyword === "anyOf" || e.keyword === "oneOf" || e.keyword === "not").map((e) => e.keywordLocation + "/");
  const befunde: Befund[] = [];
  const gesehen = new Set<string>();
  for (const e of ausgabe.errors) {
    if (ZWISCHEN.has(e.keyword) || zweige.some((z) => e.keywordLocation.startsWith(z))) continue;
    const schluessel = `${e.instanceLocation}|${e.keywordLocation}|${e.error}`;
    if (gesehen.has(schluessel)) continue;
    gesehen.add(schluessel);
    let zeiger = zeigerAusOrt(e.instanceLocation);
    // additionalProperties zeigt auf das Objekt; die Stelle ist das überzählige Feld
    if (e.keyword === "additionalProperties") {
      const feld = /Property "(.*)"/.exec(e.error)?.[1];
      if (feld !== undefined) zeiger = `${zeiger}/${feld.replaceAll("~", "~0").replaceAll("/", "~1")}`;
    }
    const k = zeiger === "" ? (index.anzahl ? 0 : KEIN) : knotenZu(index, text, zeiger);
    const pos = k === KEIN ? 0 : index.von[k];
    const { zeile, spalte } = zeileSpalte(text, pos);
    const regelWert = schemaKnoten(schema, e.keywordLocation);
    const b = beschreiben(e, regelWert, index, text, k);
    befunde.push({
      art: e.keyword === "format" ? "warnung" : "fehler", zeiger, knoten: k, zeile, spalte,
      gefunden: e.keyword === "required" ? "fehlt" : gefundenText(index, text, k),
      imSchema: schemaOrt(schema, e.keywordLocation), ...b,
    });
  }
  befunde.sort((a, b) => (a.knoten === KEIN ? 0 : index.von[a.knoten]) - (b.knoten === KEIN ? 0 : index.von[b.knoten]));
  return { ok: true, befunde, dauer: Date.now() - beginn };
}

/**
 * Für Menschen: woran man den Eintrag erkennt, in dem ein Befund liegt (die ersten zwei Texte des nächsten
 * Listeneintrags, etwa "B-24054, Henrik Lange").
 */
export function eintragKennung(index: Strukturindex, text: string, k: number): string {
  let e = k;
  while (e !== KEIN && index.eltern[e] !== KEIN && index.art[index.eltern[e]] !== KnotenArt.liste) e = index.eltern[e];
  if (e === KEIN || index.eltern[e] === KEIN || index.art[e] !== KnotenArt.objekt) return "";
  const texte: string[] = [];
  const sammeln = (o: number) => {
    for (let c = index.erstesKind[o]; c !== KEIN && texte.length < 2; c = index.naechstes[c]) {
      if (index.art[c] === KnotenArt.text) texte.push(inhalt(index, text, c));
      else if (index.art[c] === KnotenArt.objekt) sammeln(c);
    }
  };
  sammeln(e);
  return texte.join(", ");
}
