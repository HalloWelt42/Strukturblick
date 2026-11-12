// Vorschläge der KI lesen und gegen das prüfen, was Strukturblick kennt (STB-60). Ein Modell darf sich irren: Erzeuger,
// die es nicht gibt, Pfade, die nicht in der Vorlage stehen, und Einstellungen, die der Erzeuger nicht kennt, fallen
// weg und werden genannt; übernommen wird nur, was passt. Rein, ohne Browser.

import { jsonLesen, jsonText } from "../../kern/json";
import { ERZEUGER, erzeuger, type Einstellungen, type Einstellwert } from "../testdaten/erzeuger";
import { LEERARTEN, type Feldspec, type Leerart, type Spezifikation } from "../testdaten/spezifikation";

export type Gelesen<T> = { readonly ok: true; readonly wert: T; readonly hinweise: readonly string[] } | { readonly ok: false; readonly fehler: string };

const istObjekt = (w: unknown): w is Record<string, unknown> => typeof w === "object" && w !== null && !Array.isArray(w);

/** JSON aus der Antwort, auch mit Codezaun drumherum */
function jsonAus(text: string): unknown {
  const roh = text.trim().replace(/^```[a-zA-Z]*\s*\n?/, "").replace(/\n?\s*```\s*$/, "");
  return jsonLesen(roh);
}

/** Ein Ausdruck ohne Codezaun und ohne Leerzeilen am Rand */
export function ausdruckAus(text: string): string {
  return text.trim().replace(/^```[a-zA-Z]*\s*\n?/, "").replace(/\n?\s*```\s*$/, "").trim();
}

// ----- JSON Schema ------------------------------------------------------------------------------------------------------

/** Ein JSON Schema aus der Antwort, eingerückt mit zwei Leerzeichen */
export function schemaAus(text: string): Gelesen<string> {
  let wert: unknown;
  try {
    wert = jsonAus(text);
  } catch (f) {
    return { ok: false, fehler: `Das Schema ist kein gültiges JSON: ${(f as Error).message}` };
  }
  if (!istObjekt(wert)) return { ok: false, fehler: "Das Schema ist kein JSON-Objekt" };
  const hinweise = "type" in wert || "properties" in wert || "$ref" in wert ? [] : ["Das Schema nennt weder type noch properties; es lässt fast alles durch."];
  return { ok: true, wert: jsonText(wert, 2), hinweise };
}

/** Alle Namen unter properties, als Pfade ("kunde.plz"), um Vorher und Nachher zu vergleichen */
function eigenschaften(s: unknown, vor = "", aus = new Set<string>()): Set<string> {
  if (Array.isArray(s)) for (const x of s) eigenschaften(x, vor, aus);
  if (!istObjekt(s)) return aus;
  for (const [k, w] of Object.entries(s)) {
    if (k === "properties" && istObjekt(w)) {
      for (const [name, unter] of Object.entries(w)) {
        const p = vor ? `${vor}.${name}` : name;
        aus.add(p);
        eigenschaften(unter, p, aus);
      }
    } else if (k !== "description" && k !== "enum" && k !== "const" && k !== "examples" && k !== "default") eigenschaften(w, vor, aus);
  }
  return aus;
}

/** Wie viele Beschreibungen ein Schema hat */
function beschreibungen(s: unknown): number {
  if (Array.isArray(s)) return s.reduce((n: number, x) => n + beschreibungen(x), 0);
  if (!istObjekt(s)) return 0;
  return Object.entries(s).reduce((n, [k, w]) => n + (k === "description" && typeof w === "string" ? 1 : beschreibungen(w)), 0);
}

export interface Beschreibungsvergleich {
  readonly text: string;
  readonly vorher: number;
  readonly nachher: number;
  /** Eigenschaften, die das Modell dazu erfunden oder weggelassen hat */
  readonly dazu: readonly string[];
  readonly weg: readonly string[];
}

/** Schema mit Beschreibungen gegen das Schema vorher: gleiche Eigenschaften, wie viele Beschreibungen dazukamen */
export function beschreibungAus(text: string, vorher: string): Gelesen<Beschreibungsvergleich> {
  const s = schemaAus(text);
  if (!s.ok) return s;
  const neu = jsonLesen(s.wert);
  let alt: unknown = {};
  try {
    alt = jsonLesen(vorher);
  } catch {
    // Vorher war kein JSON: dann gibt es nichts zu vergleichen
  }
  const a = eigenschaften(alt);
  const n = eigenschaften(neu);
  const dazu = [...n].filter((p) => !a.has(p));
  const weg = [...a].filter((p) => !n.has(p));
  const hinweise = [...(dazu.length ? [`Dazu erfunden: ${dazu.join(", ")}`] : []), ...(weg.length ? [`Weggelassen: ${weg.join(", ")}`] : [])];
  return { ok: true, wert: { text: s.wert, vorher: beschreibungen(alt), nachher: beschreibungen(neu), dazu, weg }, hinweise };
}

// ----- Testdaten ----------------------------------------------------------------------------------------------------

function einstellungenAus(roh: unknown, kennung: string, weg: string[]): Einstellungen {
  if (!istObjekt(roh)) return {};
  const bekannt = new Map(erzeuger(kennung).einstellungen.map((e) => [e.schluessel, e]));
  const aus: Record<string, Einstellwert> = {};
  for (const [k, w] of Object.entries(roh)) {
    const e = bekannt.get(k);
    const passt = e && (e.art.art === "werte"
      ? Array.isArray(w) && w.every((x) => istObjekt(x) && typeof x.wert === "string" && typeof x.gewicht === "number")
      : e.art.art === "zahl" ? typeof w === "number" && Number.isFinite(w)
      : e.art.art === "wahl" ? e.art.werte.some((x) => x.wert === w) || typeof w === "boolean"
      : typeof w === "string" || typeof w === "boolean");
    if (passt) aus[k] = w as Einstellwert;
    else weg.push(`${kennung}.${k}`);
  }
  return aus;
}

function leerAus(roh: unknown, bisher: Feldspec["leer"]): Feldspec["leer"] {
  if (!istObjekt(roh)) return bisher;
  const anteil = typeof roh.anteil === "number" && roh.anteil >= 0 && roh.anteil <= 100 ? Math.round(roh.anteil) : bisher.anteil;
  const als = LEERARTEN.some((l) => l.wert === roh.als) ? (roh.als as Leerart) : bisher.als;
  return { anteil, als };
}

export interface Testdatenvorschlag {
  readonly spezifikation: Spezifikation;
  /** Pfade, deren Erzeuger, Einstellungen oder Leeranteil sich ändern */
  readonly geaendert: readonly string[];
}

/** Spezifikation aus der Antwort: nur Pfade der bisherigen, nur bekannte Erzeuger und Einstellungen */
export function testdatenAus(text: string, bisher: Spezifikation): Gelesen<Testdatenvorschlag> {
  let wert: unknown;
  try {
    wert = jsonAus(text);
  } catch (f) {
    return { ok: false, fehler: `Die Spezifikation ist kein gültiges JSON: ${(f as Error).message}` };
  }
  const felder = istObjekt(wert) && Array.isArray(wert.felder) ? wert.felder : null;
  if (!felder) return { ok: false, fehler: "In der Antwort fehlt die Liste felder" };
  const vorschlag = new Map<string, Record<string, unknown>>();
  for (const f of felder) if (istObjekt(f) && typeof f.pfad === "string") vorschlag.set(f.pfad, f);
  const unbekannt = [...vorschlag.keys()].filter((p) => !bisher.felder.some((f) => f.pfad === p));
  const erfunden: string[] = [];
  const weg: string[] = [];
  const geaendert: string[] = [];
  const neu = bisher.felder.map((alt): Feldspec => {
    const v = vorschlag.get(alt.pfad);
    if (!v) return alt;
    const kennung = typeof v.erzeuger === "string" && ERZEUGER.some((e) => e.kennung === v.erzeuger) ? v.erzeuger : alt.erzeuger;
    if (typeof v.erzeuger === "string" && kennung !== v.erzeuger) erfunden.push(v.erzeuger);
    // Aufbau (Objekt, Liste) bleibt, wie die Vorlage ihn hat
    const art = erzeuger(alt.erzeuger).art;
    const k = art === "wert" && erzeuger(kennung).art === "wert" ? kennung : alt.erzeuger;
    const f: Feldspec = { pfad: alt.pfad, erzeuger: k, einstellungen: k === alt.erzeuger && !istObjekt(v.einstellungen) ? alt.einstellungen : einstellungenAus(v.einstellungen, k, weg), leer: leerAus(v.leer, alt.leer) };
    const gleich = f.erzeuger === alt.erzeuger && jsonText(f.einstellungen) === jsonText(alt.einstellungen) && f.leer.anteil === alt.leer.anteil && f.leer.als === alt.leer.als;
    if (!gleich) geaendert.push(alt.pfad);
    return f;
  });
  const hinweise = [
    ...(unbekannt.length ? [`Nicht in der Vorlage, darum weggelassen: ${unbekannt.join(", ")}`] : []),
    ...(erfunden.length ? [`Unbekannte Erzeuger, der bisherige bleibt: ${[...new Set(erfunden)].join(", ")}`] : []),
    ...(weg.length ? [`Unbekannte Einstellungen weggelassen: ${weg.join(", ")}`] : []),
  ];
  return { ok: true, wert: { spezifikation: { felder: neu }, geaendert }, hinweise };
}

/** Die Erzeuger mit ihren Einstellungen als Text für den Auszug (eine Wahrheit: der Katalog der Testdaten) */
export function erzeugerKatalog(): string {
  return ERZEUGER.filter((e) => e.art === "wert")
    .map((e) => {
      const einst = e.einstellungen.map((s) => {
        const art = s.art.art === "wahl" ? `eins von ${s.art.werte.map((w) => w.wert).join("|")}` : s.art.art === "werte" ? 'Liste [{"wert": "...", "gewicht": 1}]' : s.art.art;
        return `${s.schluessel} (${art}, Vorgabe ${jsonText(s.vorgabe)}): ${s.erklaerung}`;
      });
      return `- ${e.kennung} (${e.titel}): ${e.beschreibung}${einst.length ? `\n  Einstellungen: ${einst.join("; ")}` : ""}`;
    })
    .join("\n");
}

/** Die bisherige Spezifikation als Text für den Auszug */
export function spezifikationText(s: Spezifikation): string {
  return jsonText({ felder: s.felder.filter((f) => erzeuger(f.erzeuger).art === "wert") }, 2);
}
