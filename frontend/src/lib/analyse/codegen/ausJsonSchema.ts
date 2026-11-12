// JSON Schema in ein Klassenmodell übersetzen: Objekte werden Klassen ($defs mit ihrem Namen, eingebettete nach dem
// Feld, bei Listen in der Einzahl), "type" mit "null" macht ein Feld null-fähig, enum wird Aufzählung, anyOf und oneOf
// Vereinigung, format date und date-time Datum und Zeitpunkt. Grenzen (Längen, Muster, Bereiche, Anzahl) stehen als
// Regeln am Feld. Verweise nur innerhalb des Schemas (#/$defs/..., #/definitions/...).

import { einzahl } from "../schema";
import { klassenname, type Feld, type Feldtyp, type Klasse, type Klassenmodell, type Regeln } from "./modell";

type Json = Record<string, unknown>;
const istObjekt = (x: unknown): x is Json => typeof x === "object" && x !== null && !Array.isArray(x);
const zahl = (x: unknown): number | null => (typeof x === "number" ? x : null);

/** Grenzen eines Teilschemas; spätere (etwa am Feld neben einem Verweis) ergänzen frühere */
function regeln(s: Json): Regeln {
  const r: { -readonly [K in keyof Regeln]: Regeln[K] } = {};
  const setzen = <K extends keyof Regeln>(k: K, w: Regeln[K] | null) => { if (w !== null && w !== undefined) r[k] = w; };
  setzen("minLaenge", zahl(s.minLength));
  setzen("maxLaenge", zahl(s.maxLength));
  setzen("muster", typeof s.pattern === "string" ? s.pattern : null);
  setzen("min", zahl(s.minimum));
  setzen("max", zahl(s.maximum));
  // Draft 4: exclusiveMinimum als Wahrheitswert neben minimum
  if (s.exclusiveMinimum === true && r.min !== undefined) { r.minExklusiv = r.min; delete r.min; } else setzen("minExklusiv", zahl(s.exclusiveMinimum));
  if (s.exclusiveMaximum === true && r.max !== undefined) { r.maxExklusiv = r.max; delete r.max; } else setzen("maxExklusiv", zahl(s.exclusiveMaximum));
  setzen("vielfaches", zahl(s.multipleOf));
  setzen("minAnzahl", zahl(s.minItems));
  setzen("maxAnzahl", zahl(s.maxItems));
  if (s.uniqueItems === true) r.ohneDoppel = true;
  return r;
}

export function ausJsonSchema(schema: unknown, wurzelname: string): Klassenmodell {
  const wurzel = istObjekt(schema) ? schema : {};
  const defs: Json = { ...(istObjekt(wurzel.definitions) ? wurzel.definitions : {}), ...(istObjekt(wurzel.$defs) ? wurzel.$defs : {}) };
  const klassen = new Map<string, Klasse>();
  const vonDef = new Map<string, string>();
  const hinweise = new Set<string>();

  const freierName = (wunsch: string): string => {
    let n = klassenname(wunsch);
    for (let i = 2; klassen.has(n); i++) n = `${klassenname(wunsch)}${i}`;
    return n;
  };

  /** Objekt-Schema als Klasse anlegen (einmal je $defs-Eintrag) und ihren Namen liefern */
  const klasse = (s: Json, wunsch: string, def?: string): string => {
    if (def && vonDef.has(def)) return vonDef.get(def)!;
    const name = freierName(wunsch);
    if (def) vonDef.set(def, name);
    // Platz zuerst belegen: so stehen Klassen in der Reihenfolge des ersten Bezugs (Eltern vor Kindern)
    klassen.set(name, { name, beschreibung: null, felder: [] });
    const pflicht = new Set(Array.isArray(s.required) ? s.required.filter((x): x is string => typeof x === "string") : []);
    const props = istObjekt(s.properties) ? s.properties : {};
    const felder: Feld[] = Object.entries(props).map(([n, p]) => {
      const t = typ(istObjekt(p) ? p : {}, n);
      return { name: n, typ: t.typ, pflicht: pflicht.has(n), nullbar: t.nullbar, beschreibung: istObjekt(p) && typeof p.description === "string" ? p.description : null, regeln: { ...t.regeln, ...(istObjekt(p) ? regeln(p) : {}) } };
    });
    klassen.set(name, { name, beschreibung: typeof s.description === "string" ? s.description : null, felder });
    return name;
  };

  /** Typ eines Teilschemas; `name` ist der Feldname (für eingebettete Klassen) */
  const typ = (s: Json, name: string, tiefe = 0): { typ: Feldtyp; nullbar: boolean; regeln: Regeln } => {
    if (tiefe > 30) return { typ: { art: "beliebig" }, nullbar: false, regeln: {} };
    if (typeof s.$ref === "string") {
      const m = /^#\/(?:\$defs|definitions)\/(.+)$/.exec(s.$ref);
      const ziel = m ? defs[decodeURIComponent(m[1]).replace(/~1/g, "/").replace(/~0/g, "~")] : undefined;
      if (!m || !istObjekt(ziel)) { hinweise.add(`Verweis ${s.$ref} nicht aufgelöst`); return { typ: { art: "beliebig" }, nullbar: false, regeln: {} }; }
      if (istObjektSchema(ziel)) return { typ: { art: "klasse", name: klasse(ziel, m[1], m[1]) }, nullbar: false, regeln: {} };
      const t = typ(ziel, name, tiefe + 1);
      return { ...t, regeln: { ...t.regeln, ...regeln(ziel) } };
    }
    if (Array.isArray(s.enum)) {
      const werte = s.enum.filter((w): w is string | number | boolean | null => w === null || ["string", "number", "boolean"].includes(typeof w));
      return { typ: { art: "aufzaehlung", werte: werte.filter((w) => w !== null) }, nullbar: werte.includes(null), regeln: {} };
    }
    if (s.const !== undefined) return { typ: { art: "aufzaehlung", werte: [s.const as string] }, nullbar: false, regeln: {} };
    const varianten = Array.isArray(s.anyOf) ? s.anyOf : Array.isArray(s.oneOf) ? s.oneOf : null;
    if (varianten) {
      const teile = varianten.filter(istObjekt).map((v) => typ(v, name, tiefe + 1));
      const nullbar = teile.some((t) => t.typ.art === "null" || t.nullbar);
      const echte = teile.filter((t) => t.typ.art !== "null").map((t) => t.typ);
      return { typ: echte.length === 1 ? echte[0] : echte.length ? { art: "vereinigung", teile: echte } : { art: "null" }, nullbar, regeln: {} };
    }
    const arten = (Array.isArray(s.type) ? s.type : typeof s.type === "string" ? [s.type] : []).filter((x): x is string => typeof x === "string");
    const nullbar = arten.includes("null");
    const ohneNull = arten.filter((a) => a !== "null");
    if (!ohneNull.length && istObjektSchema(s)) ohneNull.push("object");
    if (!ohneNull.length && s.items !== undefined) ohneNull.push("array");
    const einzeln = (art: string): Feldtyp => {
      switch (art) {
        case "string": return s.format === "date" ? { art: "datum" } : s.format === "date-time" ? { art: "zeitpunkt" } : { art: "text" };
        case "integer": return { art: "ganz" };
        case "number": return { art: "zahl" };
        case "boolean": return { art: "wahrheit" };
        case "array": {
          const items = istObjekt(s.items) ? s.items : {};
          // Einträge heißen in der Einzahl; gibt es keine, mit Zusatz (sonst gleicher Name wie die Liste)
          const eintrag = klassenname(einzahl(name)) === klassenname(name) ? `${name} Eintrag` : einzahl(name);
          return { art: "liste", von: Object.keys(items).length ? typ(items, eintrag, tiefe + 1).typ : { art: "beliebig" } };
        }
        case "object":
          if (istObjekt(s.properties) && Object.keys(s.properties).length) return { art: "klasse", name: klasse(s, name) };
          hinweise.add(`${name}: Objekt ohne feste Felder, im Code als freie Zuordnung`);
          return { art: "beliebig" };
        default: return { art: "beliebig" };
      }
    };
    if (!ohneNull.length) return { typ: nullbar ? { art: "null" } : { art: "beliebig" }, nullbar: false, regeln: {} };
    const teile = ohneNull.map(einzeln);
    return { typ: teile.length === 1 ? teile[0] : { art: "vereinigung", teile }, nullbar, regeln: {} };
  };

  const w = typ(wurzel, wurzelname);
  return { klassen: [...klassen.values()], wurzel: w.typ, hinweise: [...hinweise] };
}

function istObjektSchema(s: Json): boolean {
  return s.type === "object" || (Array.isArray(s.type) && s.type.includes("object")) || (s.type === undefined && istObjekt(s.properties));
}
