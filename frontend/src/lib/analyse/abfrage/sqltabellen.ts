// Tabellen für SQL aus Dokumenten (Entwurf entwuerfe/abfrage-sql.html): jedes Dokument wird eine Tabelle; Listen von
// Objekten darin werden eigene Tabellen ("positionen" aus bestellungen.json), je Eintrag eine Zeile, mit einer Spalte,
// die auf die Elternzeile verweist. Verschachtelte Objekte werden zu Spalten mit Unterstrich (kunde_name), Listen
// einfacher Werte zu JSON-Text. Rein, ohne Browser und ohne SQL-Maschine: das Einspielen macht der Dienst.

export type SqlTyp = "INTEGER" | "REAL" | "TEXT";
export type { Zellwert } from "../../kern/abfrage";
import type { Zellwert } from "../../kern/abfrage";

export interface SqlSpalte {
  readonly name: string;
  readonly typ: SqlTyp;
  /** Für Menschen: "Ganzzahl", "Text", "Verweis auf bestellungen" */
  readonly art: string;
}

export interface SqlTabelle {
  readonly name: string;
  /** Dateiname des Dokuments */
  readonly quelle: string;
  /** Wie die Tabelle entstand, wenn nicht offensichtlich */
  readonly notiz: string | null;
  readonly spalten: readonly SqlSpalte[];
  readonly zeilen: readonly (readonly Zellwert[])[];
}

export interface SqlQuelle {
  readonly name: string;
  readonly wert: unknown;
  /** Kennt das Format Typen? Ohne (CSV) werden Texte, die wie Zahlen aussehen, zu Zahlen. */
  readonly typen: boolean;
}

/** So tief werden Objekte zu Spalten und Listen zu Tabellen entfaltet */
const TIEFE = 3;

const istObjekt = (w: unknown): w is Record<string, unknown> => typeof w === "object" && w !== null && !Array.isArray(w);
const istObjektliste = (w: unknown): w is unknown[] => Array.isArray(w) && w.length > 0 && w.every(istObjekt);

/** Name als SQL-Bezeichner: Buchstaben, Ziffern, Unterstrich; beginnt mit Buchstaben */
export function bezeichner(roh: string): string {
  const b = roh.toLocaleLowerCase("de").replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}_]+/gu, "_").replace(/^_+|_+$/g, "");
  return /^\p{L}/u.test(b) ? b : `t_${b || "tabelle"}`;
}

function eindeutig(name: string, vergeben: Set<string>): string {
  let n = name;
  for (let i = 2; vergeben.has(n); i++) n = `${name}_${i}`;
  vergeben.add(n);
  return n;
}

/** Hauptliste eines Dokuments: die Wurzel, wenn sie eine Liste ist, sonst die längste Liste von Objekten darunter. */
function hauptliste(wert: unknown): unknown[] {
  if (Array.isArray(wert)) return wert;
  let beste: unknown[] | null = null;
  const offen: unknown[] = [wert];
  for (let tiefe = 0; tiefe < TIEFE && offen.length; tiefe++) {
    for (const w of offen.splice(0)) {
      if (!istObjekt(w)) continue;
      for (const kind of Object.values(w)) {
        if (istObjektliste(kind) && (!beste || kind.length > beste.length)) beste = kind;
        else if (istObjekt(kind)) offen.push(kind);
      }
    }
    if (beste) return beste;
  }
  return [wert];
}

interface FlacheZeile {
  readonly werte: Map<string, unknown>;
  readonly kinder: Map<string, unknown[]>;
}

/** Ein Eintrag als flache Zeile; Objekte unter `ohne` (die Hauptliste selbst) werden nicht noch einmal entfaltet. */
function flach(eintrag: unknown, ohne: unknown): FlacheZeile {
  const werte = new Map<string, unknown>();
  const kinder = new Map<string, unknown[]>();
  const gehen = (o: Record<string, unknown>, vorne: string, tiefe: number) => {
    for (const [s, w] of Object.entries(o)) {
      const name = vorne ? `${vorne}_${s}` : s;
      if (w === ohne) continue;
      if (istObjektliste(w) && tiefe < TIEFE) kinder.set(name, w);
      else if (istObjekt(w) && tiefe < TIEFE) gehen(w, name, tiefe + 1);
      else werte.set(name, w);
    }
  };
  if (istObjekt(eintrag)) gehen(eintrag, "", 1);
  else werte.set("wert", eintrag);
  return { werte, kinder };
}

const GANZ = /^-?(0|[1-9]\d{0,14})$/;
const KOMMA = /^-?(0|[1-9]\d*)\.\d+$/;

/** Typ einer Spalte aus ihren Werten; ohne Typen im Format zählen Texte, die eindeutig Zahlen sind */
function typVon(werte: readonly unknown[], typen: boolean): { typ: SqlTyp; art: string; umwandeln: boolean } {
  const gefuellt = werte.filter((w) => w !== null && w !== undefined && w !== "");
  if (!gefuellt.length) return { typ: "TEXT", art: "leer", umwandeln: false };
  if (gefuellt.every((w) => typeof w === "boolean")) return { typ: "INTEGER", art: "Wahrheitswert (1 oder 0)", umwandeln: false };
  if (gefuellt.every((w) => typeof w === "number")) {
    return gefuellt.every((w) => Number.isInteger(w)) ? { typ: "INTEGER", art: "Ganzzahl", umwandeln: false } : { typ: "REAL", art: "Zahl", umwandeln: false };
  }
  if (!typen && gefuellt.every((w) => typeof w === "string" && GANZ.test(w))) return { typ: "INTEGER", art: "Ganzzahl", umwandeln: true };
  if (!typen && gefuellt.every((w) => typeof w === "string" && (GANZ.test(w) || KOMMA.test(w)))) return { typ: "REAL", art: "Zahl", umwandeln: true };
  if (gefuellt.some((w) => typeof w === "object")) return { typ: "TEXT", art: "JSON", umwandeln: false };
  return { typ: "TEXT", art: gefuellt.every((w) => typeof w === "string") ? "Text" : "gemischt", umwandeln: false };
}

function zelle(w: unknown, umwandeln: boolean): Zellwert {
  if (w === undefined || w === null) return null;
  if (typeof w === "boolean") return w ? 1 : 0;
  if (typeof w === "number") return w;
  if (typeof w === "string") return umwandeln && w !== "" ? Number(w) : w;
  return JSON.stringify(w);
}

interface Verweis {
  readonly name: string;
  readonly art: string;
  readonly werte: readonly Zellwert[];
}

function bauen(name: string, quelle: string, notiz: string | null, eintraege: readonly unknown[], ohne: unknown, typen: boolean, verweis: Verweis | null, vergeben: Set<string>, tiefe: number): SqlTabelle[] {
  const flache = eintraege.map((e) => flach(e, ohne));
  const namen: string[] = [];
  for (const z of flache) for (const s of z.werte.keys()) if (!namen.includes(s)) namen.push(s);

  const spalten: SqlSpalte[] = [];
  const spaltenwerte: Zellwert[][] = [];
  if (verweis) {
    const vname = namen.includes(verweis.name) ? `${verweis.art.split(" ").pop()}_${verweis.name}` : verweis.name;
    spalten.push({ name: vname, typ: typVon(verweis.werte, true).typ, art: verweis.art });
    spaltenwerte.push([...verweis.werte]);
  }
  for (const s of namen) {
    const roh = flache.map((z) => z.werte.get(s));
    const t = typVon(roh, typen);
    spalten.push({ name: s, typ: t.typ, art: t.art });
    spaltenwerte.push(roh.map((w) => zelle(w, t.umwandeln)));
  }

  // Verweis für Kindtabellen: die erste Spalte mit lauter verschiedenen, gefüllten Werten, sonst die Zeilennummer
  let schluessel = spalten.findIndex((_, i) => !(verweis && i === 0) && new Set(spaltenwerte[i]).size === eintraege.length && !spaltenwerte[i].includes(null));
  const kindNoetig = flache.some((z) => z.kinder.size > 0);
  if (schluessel < 0 && kindNoetig) {
    spalten.push({ name: "zeile", typ: "INTEGER", art: "Zeilennummer" });
    spaltenwerte.push(eintraege.map((_, i) => i + 1));
    schluessel = spalten.length - 1;
  }

  const zeilen = eintraege.map((_, z) => spaltenwerte.map((werte) => werte[z]));
  const tabellen: SqlTabelle[] = [{ name, quelle, notiz, spalten, zeilen }];
  if (!kindNoetig || tiefe >= TIEFE) return tabellen;

  const kindNamen: string[] = [];
  for (const z of flache) for (const k of z.kinder.keys()) if (!kindNamen.includes(k)) kindNamen.push(k);
  for (const k of kindNamen) {
    const kindEintraege: unknown[] = [];
    const verweisWerte: Zellwert[] = [];
    flache.forEach((z, i) => {
      for (const e of z.kinder.get(k) ?? []) {
        kindEintraege.push(e);
        verweisWerte.push(spaltenwerte[schluessel][i]);
      }
    });
    const kname = eindeutig(bezeichner(k), vergeben);
    const v: Verweis = { name: spalten[schluessel].name, art: `Verweis auf ${name}`, werte: verweisWerte };
    tabellen.push(...bauen(kname, quelle, `Aus der Liste ${k} entfaltet, je Eintrag eine Zeile`, kindEintraege, null, typen, v, vergeben, tiefe + 1));
  }
  return tabellen;
}

/** Alle Tabellen der Dokumente, Namen über alle eindeutig */
export function sqlTabellen(quellen: readonly SqlQuelle[]): SqlTabelle[] {
  const vergeben = new Set<string>();
  return quellen.flatMap((q) => {
    const liste = hauptliste(q.wert);
    const name = eindeutig(bezeichner(q.name), vergeben);
    return bauen(name, q.name, null, liste, liste, q.typen, null, vergeben, 1);
  });
}
