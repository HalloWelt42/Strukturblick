// SQL über alle geöffneten Dokumente mit SQLite im Browser (sql.js). Die Tabellen entstehen aus den Dokumenten
// (analyse/abfrage/sqltabellen.ts) und werden nur neu gebaut, wenn sich ein Dokument geändert hat. Dazu Funktionen, die
// SQLite fehlen oder nur für ASCII kann: lower und upper mit Umlauten, REGEXP.

import type { Database, SqlJsStatic } from "sql.js";
import { ABFRAGE_GRENZEN, type Tabellenuebersicht, type Zellwert } from "../../kern/abfrage";
import { format } from "../../formate/registrierung";
import { sqlTabellen, type SqlTabelle } from "../../analyse/abfrage/sqltabellen";
import { zeilenAusgeben } from "../../analyse/ausgabe";
import { wurf, type Maschine } from "./maschine";
import type { Quellen } from "./quellen";

const sql = (name: string): string => `"${name.replaceAll('"', '""')}"`;

function einspielen(db: Database, t: SqlTabelle): void {
  db.run(`CREATE TABLE ${sql(t.name)} (${t.spalten.map((s) => `${sql(s.name)} ${s.typ}`).join(", ")})`);
  if (!t.zeilen.length) return;
  const st = db.prepare(`INSERT INTO ${sql(t.name)} VALUES (${t.spalten.map(() => "?").join(", ")})`);
  try {
    for (const z of t.zeilen) st.run(z as Zellwert[]);
  } finally {
    st.free();
  }
}

function funktionen(db: Database): void {
  db.create_function("lower", (s: unknown) => (typeof s === "string" ? s.toLocaleLowerCase("de") : s));
  db.create_function("upper", (s: unknown) => (typeof s === "string" ? s.toLocaleUpperCase("de") : s));
  const muster = new Map<string, RegExp>();
  // x REGEXP y ruft regexp(y, x)
  db.create_function("regexp", (m: unknown, s: unknown) => {
    if (typeof m !== "string" || s === null) return 0;
    let r = muster.get(m);
    if (!r) muster.set(m, (r = new RegExp(m, "u")));
    return r.test(String(s)) ? 1 : 0;
  });
}

/** Deutsch statt der häufigsten SQLite-Meldungen */
function meldung(roh: string): string {
  const m = /^no such table: (.+)$/.exec(roh) ?? /^no such column: (.+)$/.exec(roh);
  if (m) return roh.startsWith("no such table") ? `Tabelle ${m[1]} gibt es nicht` : `Spalte ${m[1]} gibt es nicht`;
  const nah = /^near "(.*)": syntax error$/.exec(roh);
  if (nah) return `SQL ungültig bei "${nah[1]}"`;
  if (/^incomplete input$/.test(roh)) return "SQL unvollständig";
  return `SQL: ${roh}`;
}

function artVon(werte: readonly Zellwert[]): string {
  const g = werte.filter((w) => w !== null);
  if (!g.length) return "leer";
  if (g.every((w) => typeof w === "number")) return g.every((w) => Number.isInteger(w)) ? "Ganzzahl" : "Zahl";
  return g.every((w) => typeof w === "string") ? "Text" : "gemischt";
}

export function sqlMaschine(laden: () => Promise<SqlJsStatic>): Maschine {
  let maschine: Promise<SqlJsStatic> | null = null;
  let stand: { lage: string; db: Database; tabellen: Tabellenuebersicht[] } | null = null;

  async function datenbank(q: Quellen) {
    const lage = q.lage();
    if (stand?.lage === lage) return stand;
    const SQL = await (maschine ??= laden());
    stand?.db.close();
    stand = null;
    const db = new SQL.Database();
    funktionen(db);
    const tabellen = sqlTabellen(q.alle().map((s) => ({ name: s.name, wert: q.wert(s.kennung), typen: format(s.format).faehigkeiten.typen })));
    db.run("BEGIN");
    for (const t of tabellen) einspielen(db, t);
    db.run("COMMIT");
    const uebersicht = tabellen.map((t) => ({ name: t.name, quelle: t.quelle, notiz: t.notiz, anzahl: t.zeilen.length, spalten: t.spalten.map((s) => ({ name: s.name, art: s.art })) }));
    stand = { lage, db, tabellen: uebersicht };
    return stand;
  }

  return async (a, q) => {
    const { db, tabellen } = await datenbank(q);
    if (!a.ausdruck.trim()) return { art: "tabelle", spalten: [], zeilen: [], anzahl: 0, tabellen };
    let ergebnisse;
    try {
      ergebnisse = db.exec(a.ausdruck);
    } catch (f) {
      throw wurf(meldung((f as Error).message));
    }
    const letztes = ergebnisse.at(-1);
    const namen = letztes?.columns ?? [];
    const alle = (letztes?.values ?? []) as Zellwert[][];
    if (a.ausgabe) return { art: "dokument", text: zeilenAusgeben(namen, alle, a.ausgabe) };
    const spalten = namen.map((name, i) => ({ name, art: artVon(alle.map((z) => z[i])) }));
    return { art: "tabelle", spalten, zeilen: alle.slice(0, ABFRAGE_GRENZEN.zeilen), anzahl: alle.length, tabellen };
  };
}
