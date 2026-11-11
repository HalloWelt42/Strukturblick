// Sprachmaschinen gegen echte Dokumente, mit jq und SQLite als WebAssembly unter Node.

import { beforeAll, describe, expect, it } from "vitest";
import { loadJq } from "jq-wasm";
import initSqlJs from "sql.js";
import { format } from "../../formate/registrierung";
import type { FormatKennung } from "../../kern/format";
import type { Tabellenergebnis, Werteergebnis } from "../../kern/abfrage";
import { VORGABE_SUCHE } from "../../analyse/abfrage/textsuche";
import { jqMaschine } from "./jq";
import { jsonpathMaschine, sucheMaschine } from "./jsonpath";
import { Abfragewurf, type Abfrageauftrag, type Maschine } from "./maschine";
import { Quellen } from "./quellen";
import { sqlMaschine } from "./sql";

const BESTELLUNGEN = `{
  "shop": "Hofladen",
  "bestellungen": [
    {"nr": "B-1", "kunde": {"name": "Ole", "stadt": "Leipzig"}, "bezahlt": false, "positionen": [{"artikel": "Honig", "menge": 3, "preis": 7.9}]},
    {"nr": "B-2", "kunde": {"name": "Karl", "stadt": "Dresden"}, "bezahlt": true, "positionen": [{"artikel": "Eier", "menge": 1, "preis": 3.8}]},
    {"nr": "B-3", "kunde": {"name": "Ines", "stadt": "Leipzig"}, "bezahlt": false, "positionen": [{"artikel": "Saft", "menge": 6, "preis": 2.5}]}
  ],
  "id": 12345678901234567890
}`;
const KUNDEN = "name;ort\nOle;LEIPZIG\nKarl;Dresden\nInes;Äbersdorf\n";

function stand(kennung: string, name: string, art: FormatKennung, text: string) {
  const f = format(art);
  const l = f.lesen(text);
  return { kennung, name, revision: 1, format: art, merkmale: l.merkmale, text, index: l.index! };
}

const quellen = new Quellen();
quellen.setzen(stand("b", "bestellungen.json", "json", BESTELLUNGEN));
quellen.setzen(stand("k", "kunden.csv", "csv", KUNDEN));

const auftrag = (sprache: Abfrageauftrag["sprache"], ausdruck: string, ziel: string | null = "b", ausgabe: Abfrageauftrag["ausgabe"] = null): Abfrageauftrag => ({ sprache, ausdruck, ziel, suche: VORGABE_SUCHE, ausgabe });

let jq: Maschine;
let sql: Maschine;
beforeAll(() => {
  jq = jqMaschine(() => loadJq());
  sql = sqlMaschine(() => initSqlJs());
});

async function fehlerVon(m: Maschine, a: Abfrageauftrag) {
  try {
    await m(a, quellen);
  } catch (f) {
    if (f instanceof Abfragewurf) return f.fehler;
    throw f;
  }
  throw new Error("kein Fehler");
}

describe("jq", () => {
  it("liefert Werte und Treffer vom längsten auswählenden Teil", async () => {
    const e = (await jq(auftrag("jq", ".bestellungen[] | select(.bezahlt | not) | {nr, kunde: .kunde.name}"), quellen)) as Werteergebnis;
    expect(e.anzahl).toBe(2);
    expect(JSON.parse(e.stuecke[0].text)).toEqual({ nr: "B-1", kunde: "Ole" });
    expect(e.treffer).toEqual(["/bestellungen/0", "/bestellungen/2"]);
    expect(e.stuecke[0].ort).toBeNull();
  });

  it("gibt bei reinen Auswahlen jedem Wert seinen Ort und liest große Zahlen aus dem Rohtext", async () => {
    const e = (await jq(auftrag("jq", ".bestellungen[].nr"), quellen)) as Werteergebnis;
    expect(e.stuecke.map((s) => s.ort)).toEqual(["/bestellungen/0/nr", "/bestellungen/1/nr", "/bestellungen/2/nr"]);
    const id = (await jq(auftrag("jq", ".id | tostring"), quellen)) as Werteergebnis;
    expect(JSON.parse(id.stuecke[0].text)).toBe("12345678901234567890");
  });

  it("rechnet auch über CSV (aus dem Index erzeugter Wert)", async () => {
    const e = (await jq(auftrag("jq", "map(.ort)", "k"), quellen)) as Werteergebnis;
    expect(JSON.parse(e.stuecke[0].text)).toEqual(["LEIPZIG", "Dresden", "Äbersdorf"]);
  });

  it("meldet Fehler im Ausdruck mit Stelle und unvollständige als solche", async () => {
    expect(await fehlerVon(jq, auftrag("jq", ".bestellungen[] |"))).toMatchObject({ meldung: "Ausdruck unvollständig", zeile: 1 });
    const f = await fehlerVon(jq, auftrag("jq", ".a |\n gibtsnicht"));
    expect(f.meldung).toContain("gibtsnicht");
    expect(f.zeile).toBe(2);
    expect((await fehlerVon(jq, auftrag("jq", ".shop | .[0]"))).meldung).toMatch(/^Fehler beim Rechnen/);
  });

  it("liefert das ganze Ergebnis als Dokument", async () => {
    const e = await jq(auftrag("jq", ".bestellungen[].nr", "b", "json"), quellen);
    expect(e).toEqual({ art: "dokument", text: JSON.stringify(["B-1", "B-2", "B-3"], null, 2) });
  });
});

describe("JSONPath und Suche", () => {
  it("findet mit Filter und Ort", async () => {
    const e = (await jsonpathMaschine(auftrag("jsonpath", "$.bestellungen[?(@.bezahlt == false)].nr"), quellen)) as Werteergebnis;
    expect(e.treffer).toEqual(["/bestellungen/0/nr", "/bestellungen/2/nr"]);
    expect((await fehlerVon(jsonpathMaschine, auftrag("jsonpath", "$.bestellungen[?(@."))).meldung).toMatch(/^JSONPath ungültig/);
  });

  it("sucht Text und regulären Ausdruck", async () => {
    const e = (await sucheMaschine(auftrag("suche", "leipzig"), quellen)) as Werteergebnis;
    expect(e.treffer).toEqual(["/bestellungen/0/kunde/stadt", "/bestellungen/2/kunde/stadt"]);
    const r = (await sucheMaschine({ ...auftrag("suche", "^B-[13]$"), suche: { regex: true, grossKlein: true } }, quellen)) as Werteergebnis;
    expect(r.anzahl).toBe(2);
  });
});

describe("SQL", () => {
  it("rechnet über alle Dokumente mit Join auf entfaltete Listen", async () => {
    const e = (await sql(auftrag("sql", "SELECT b.kunde_stadt AS ort, count(*) AS n, round(sum(p.menge * p.preis), 2) AS umsatz FROM bestellungen b JOIN positionen p ON p.nr = b.nr GROUP BY 1 ORDER BY umsatz DESC", null), quellen)) as Tabellenergebnis;
    expect(e.spalten.map((s) => `${s.name}:${s.art}`)).toEqual(["ort:Text", "n:Ganzzahl", "umsatz:Zahl"]);
    expect(e.zeilen).toEqual([["Leipzig", 2, 38.7], ["Dresden", 1, 3.8]]);
    expect(e.tabellen.map((t) => t.name)).toEqual(["bestellungen", "positionen", "kunden"]);
  });

  it("kennt Umlaute in lower und upper und kann REGEXP", async () => {
    const e = (await sql(auftrag("sql", "SELECT lower(ort) FROM kunden WHERE ort REGEXP '^[ÄD]'", null), quellen)) as Tabellenergebnis;
    expect(e.zeilen).toEqual([["dresden"], ["äbersdorf"]]);
  });

  it("meldet Fehler auf Deutsch", async () => {
    expect((await fehlerVon(sql, auftrag("sql", "SELECT * FROM gibtsnicht", null))).meldung).toBe("Tabelle gibtsnicht gibt es nicht");
    expect((await fehlerVon(sql, auftrag("sql", "SELEC 1", null))).meldung).toBe('SQL ungültig bei "SELEC"');
  });
});
