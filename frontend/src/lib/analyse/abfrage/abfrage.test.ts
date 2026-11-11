// Reine Bausteine der Abfrage: Wert aus dem Index, Treffer für jq, Tabellen für SQL, Textsuche.

import { describe, expect, it } from "vitest";
import { format } from "../../formate/registrierung";
import { zeigerVon } from "../../kern/pfade";
import { wertAus } from "../wert";
import { roehren, vordereTeile } from "./jqpfad";
import { bezeichner, sqlTabellen } from "./sqltabellen";
import { Suchfehler, textsuche } from "./textsuche";

const lesen = (kennung: "json" | "csv" | "yaml" | "ndjson", text: string) => format(kennung).lesen(text).index!;

describe("wertAus", () => {
  it("folgt dem Index in jedem Format", () => {
    const json = '{"a": [1, 2.5, "x", true, null], "b": {"c": "ü\\n"}}';
    expect(wertAus(lesen("json", json), json)).toEqual(JSON.parse(json));
    const csv = "nr;plz\n1;04109\n2;01067\n";
    expect(wertAus(lesen("csv", csv), csv)).toEqual([{ nr: "1", plz: "04109" }, { nr: "2", plz: "01067" }]);
    const yaml = "name: Laden\nzahl: 3\nan: true\nliste:\n  - a\n  - b\n";
    expect(wertAus(lesen("yaml", yaml), yaml)).toEqual({ name: "Laden", zahl: 3, an: true, liste: ["a", "b"] });
    const nd = '{"a":1}\n{"a":2}\n';
    expect(wertAus(lesen("ndjson", nd), nd)).toEqual([{ a: 1 }, { a: 2 }]);
  });
});

describe("jq: vordere Teile", () => {
  it("trennt nur an Röhren der obersten Ebene", () => {
    const a = '.b[] | select(.x | not) | {nr, s: (.p | add)} | "a|b"';
    expect(roehren(a).map((i) => a[i])).toEqual(["|", "|", "|"]);
    expect(vordereTeile(".b[] | select(.x | not) | {nr}")).toEqual([".b[] | select(.x | not) | {nr}", ".b[] | select(.x | not)", ".b[]"]);
  });

  it("lässt |= und // in Ruhe", () => {
    expect(roehren(".a |= 1 | .b // 2")).toHaveLength(1);
  });
});

describe("sqlTabellen", () => {
  const bestellungen = {
    shop: "Hofladen",
    bestellungen: [
      { nr: "B-1", kunde: { name: "Ole", plz: "04315" }, bezahlt: false, tags: ["eilig"], positionen: [{ artikel: "Honig", menge: 3, preis: 7.9 }] },
      { nr: "B-2", kunde: { name: "Karl", plz: "04109" }, bezahlt: true, tags: [], positionen: [{ artikel: "Eier", menge: 1, preis: 3.8 }, { artikel: "Saft", menge: 6, preis: 2.59 }] },
    ],
  };

  it("entfaltet Listen zu eigenen Tabellen mit Verweis", () => {
    const [b, p] = sqlTabellen([{ name: "bestellungen.json", wert: bestellungen, typen: true }]);
    expect(b.name).toBe("bestellungen");
    expect(b.spalten.map((s) => `${s.name}:${s.typ}`)).toEqual(["nr:TEXT", "kunde_name:TEXT", "kunde_plz:TEXT", "bezahlt:INTEGER", "tags:TEXT"]);
    expect(b.zeilen[0]).toEqual(["B-1", "Ole", "04315", 0, '["eilig"]']);
    expect(p.name).toBe("positionen");
    expect(p.spalten[0]).toMatchObject({ name: "nr", art: "Verweis auf bestellungen" });
    expect(p.zeilen).toEqual([["B-1", "Honig", 3, 7.9], ["B-2", "Eier", 1, 3.8], ["B-2", "Saft", 6, 2.59]]);
    expect(p.spalten.find((s) => s.name === "preis")?.typ).toBe("REAL");
  });

  it("macht ohne Typen im Format aus eindeutigen Zahlen Zahlen, Postleitzahlen bleiben Text", () => {
    const [k] = sqlTabellen([{ name: "kunden.csv", wert: [{ nr: "1", plz: "04109", umsatz: "12.5" }, { nr: "2", plz: "01067", umsatz: "3" }], typen: false }]);
    expect(k.spalten.map((s) => s.typ)).toEqual(["INTEGER", "TEXT", "REAL"]);
    expect(k.zeilen[0]).toEqual([1, "04109", 12.5]);
  });

  it("vergibt eindeutige Namen und gültige Bezeichner", () => {
    const t = sqlTabellen([{ name: "a.json", wert: [{ x: 1 }], typen: true }, { name: "a.csv", wert: [{ x: "1" }], typen: false }]);
    expect(t.map((x) => x.name)).toEqual(["a", "a_2"]);
    expect(bezeichner("2026 Umsätze-Nord.csv")).toBe("t_2026_umsätze_nord");
  });

  it("nimmt ohne eindeutige Spalte die Zeilennummer als Verweis", () => {
    const [eltern, kind] = sqlTabellen([{ name: "x.json", wert: [{ a: 1, l: [{ b: 1 }] }, { a: 1, l: [{ b: 2 }] }], typen: true }]);
    expect(eltern.spalten.at(-1)?.name).toBe("zeile");
    expect(kind.zeilen).toEqual([[1, 1], [2, 2]]);
  });
});

describe("textsuche", () => {
  const json = '{"stadt": "Leipzig", "orte": ["leipzig", "Halle"], "Leiter": 1}';
  const index = lesen("json", json);
  const zeiger = (o: Parameters<typeof textsuche>[3], a: string) => textsuche(index, json, a, o).map((k) => zeigerVon(index, json, k));

  it("findet Schlüssel und Werte, wahlweise mit Groß und Klein", () => {
    expect(zeiger({ regex: false, grossKlein: false }, "lei")).toEqual(["/stadt", "/orte/0", "/Leiter"]);
    expect(zeiger({ regex: false, grossKlein: true }, "Lei")).toEqual(["/stadt", "/Leiter"]);
  });

  it("kann reguläre Ausdrücke und meldet kaputte verständlich", () => {
    expect(zeiger({ regex: true, grossKlein: false }, "^(halle|leipzig)$")).toEqual(["/stadt", "/orte/0", "/orte/1"]);
    expect(() => textsuche(index, json, "(", { regex: true, grossKlein: false })).toThrow(Suchfehler);
  });
});
