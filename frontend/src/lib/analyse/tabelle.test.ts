import { describe, expect, it } from "vitest";
import { inhalt, KEIN, KnotenArt, type Strukturindex } from "../kern/strukturindex";
import { knotenZu } from "../kern/pfade";
import { JSON_FORMAT } from "../formate/json";
import { CSV_FORMAT } from "../formate/csv";
import { listeFinden, ortVon, sichtBerechnen, sichtStellen, tabelleBauen, vorschau, zahlenwert, zelle, zellenDerZeile, zellZeiger, WERT_SPALTE_NAME } from "./tabelle";
import { leistungstest, zeitgrenze } from "../../pruefhilfen/zeitgrenze";

function json(text: string): Strukturindex {
  const e = JSON_FORMAT.lesen(text);
  if (!e.index) throw new Error("kein Index");
  return e.index;
}

const KUNDEN = `[
  {"nr": 1, "name": "Anna", "ort": "Leipzig"},
  {"nr": 2, "name": "Bert"},
  {"nr": 10, "name": "carla", "ort": "Halle", "plz": "06108"}
]`;

describe("Welche Liste", () => {
  it("nimmt die Wurzel, wenn sie eine Liste ist", () => {
    const index = json(KUNDEN);
    expect(listeFinden(index, KEIN, KEIN)).toBe(0);
  });
  it("nimmt sonst die erste Liste gleich aufgebauter Objekte", () => {
    const text = '{"meta": {"tags": ["a", "b"]}, "daten": {"kunden": [{"a": 1}, {"a": 2}]}}';
    const index = json(text);
    expect(listeFinden(index, KEIN, KEIN)).toBe(knotenZu(index, text, "/daten/kunden"));
  });
  it("findet keine, wenn es keine gibt", () => {
    expect(listeFinden(json('{"a": 1, "b": {"c": 2}}'), KEIN, KEIN)).toBe(KEIN);
  });
  it("folgt der Wahl: gewählte Liste oder die Liste, in der sie liegt", () => {
    const text = '{"a": [1, 2], "b": [{"x": [5, 6]}]}';
    const index = json(text);
    const k = (z: string) => knotenZu(index, text, z);
    expect(listeFinden(index, k("/a"), KEIN)).toBe(k("/a"));
    expect(listeFinden(index, k("/a/1"), KEIN)).toBe(k("/a"));
    expect(listeFinden(index, k("/b/0/x/1"), KEIN)).toBe(k("/b/0/x"));
  });
  it("bleibt bei der gezeigten Liste, wenn eine ihrer Zellen gewählt wird, auch eine Liste darin", () => {
    const text = '{"b": [{"x": [5, 6]}]}';
    const index = json(text);
    const k = (z: string) => knotenZu(index, text, z);
    expect(listeFinden(index, k("/b/0/x"), k("/b"))).toBe(k("/b"));
    expect(listeFinden(index, k("/b/0/x/0"), k("/b"))).toBe(k("/b/0/x"));
  });
});

describe("Tabellenmodell", () => {
  it("vereinigt die Spalten in Reihenfolge des ersten Auftretens, auch aus späteren Zeilen", () => {
    const index = json(KUNDEN);
    const t = tabelleBauen(index, KUNDEN, 0);
    expect(t.spalten.map((s) => s.name)).toEqual(["nr", "name", "ort", "plz"]);
    expect(t.zeilen.length).toBe(3);
    expect(Array.from(t.zeileImText)).toEqual([2, 3, 4]);
  });
  it("schlägt Zellen nach, fehlende sind KEIN", () => {
    const index = json(KUNDEN);
    const t = tabelleBauen(index, KUNDEN, 0);
    expect(inhalt(index, KUNDEN, zelle(t, index, 2, 3))).toBe("06108");
    expect(zelle(t, index, 1, 2)).toBe(KEIN);
    const z = zellenDerZeile(t, index, 1);
    expect(inhalt(index, KUNDEN, z[1])).toBe("Bert");
    expect(z[3]).toBe(KEIN);
  });
  it("zeigt Einträge, die keine Objekte sind, in einer eigenen Spalte", () => {
    const text = '[{"a": 1}, 7, [1, 2]]';
    const index = json(text);
    const t = tabelleBauen(index, text, 0);
    expect(t.spalten.map((s) => s.name)).toEqual(["a", WERT_SPALTE_NAME]);
    expect(inhalt(index, text, zelle(t, index, 1, 1))).toBe("7");
    expect(zelle(t, index, 0, 1)).toBe(KEIN);
    expect(vorschau(index, text, zelle(t, index, 2, 1)).text).toBe("[2] 1, 2");
  });
  it("zeigt verschachtelte Werte als kurzen Auszug ihres Inhalts", () => {
    const text = '[{"o": {"a": 1, "b": "zwei", "c": {"x": 1}}, "l": [1], "p": [{"artikel": "Brot", "menge": 1}, {"artikel": "Honig"}, 3, [], 5, 6], "leer": [], "nichts": {}}]';
    const index = json(text);
    const t = tabelleBauen(index, text, 0);
    expect(vorschau(index, text, zelle(t, index, 0, 0))).toEqual({ art: KnotenArt.objekt, text: "{1, zwei, {...}}" });
    expect(vorschau(index, text, zelle(t, index, 0, 1)).text).toBe("[1] 1");
    expect(vorschau(index, text, zelle(t, index, 0, 2)).text).toBe("[6] Brot, Honig, 3, [0], ...");
    expect(vorschau(index, text, zelle(t, index, 0, 3)).text).toBe("[0]");
    expect(vorschau(index, text, zelle(t, index, 0, 4)).text).toBe("{}");
  });
  it("klappt Objekte in Spalten je Feld auf, auch tiefer, und findet Zellen, Zeiger und Orte dort", () => {
    const text = '[{"nr": 1, "kunde": {"name": "Anna", "adresse": {"plz": "04109"}}}, {"nr": 2, "kunde": null}, {"nr": 3, "kunde": {"name": "Bert", "ort": "Halle"}}]';
    const index = json(text);
    const flach = tabelleBauen(index, text, 0);
    expect(flach.spalten.map((s) => s.name)).toEqual(["nr", "kunde"]);
    const t = tabelleBauen(index, text, 0, new Set(["kunde", "kunde.adresse"]));
    expect(t.spalten.map((s) => s.name)).toEqual(["nr", "kunde.name", "kunde.adresse.plz", "kunde", "kunde.ort"]);
    expect(t.spalten[2].pfad).toEqual(["kunde", "adresse", "plz"]);
    expect(inhalt(index, text, zelle(t, index, 0, 2))).toBe("04109");
    expect(inhalt(index, text, zelle(t, index, 1, 3))).toBe("null");
    expect(zelle(t, index, 0, 3)).toBe(KEIN);
    expect(inhalt(index, text, zelle(t, index, 2, 4))).toBe("Halle");
    expect([...zellenDerZeile(t, index, 2)].map((k) => (k === KEIN ? "-" : inhalt(index, text, k)))).toEqual(["3", "Bert", "-", "-", "Halle"]);
    expect(zellZeiger(t, 0, 2)).toBe("/0/kunde/adresse/plz");
    expect(ortVon(t, "/0/kunde/adresse/plz")).toEqual({ zeile: 0, spalte: 2 });
    expect(ortVon(t, "/1/kunde")).toEqual({ zeile: 1, spalte: 3 });
    expect(sichtBerechnen(t, index, text, { filter: "halle", sortierung: null })).toEqual(Int32Array.from([2]));
    expect(sichtBerechnen(t, index, text, { filter: "04109", sortierung: null })).toEqual(Int32Array.from([0]));
  });
  it("nimmt CSV-Spalten aus der Kopfzeile, auch wenn spätere Zeilen mehr Zellen haben", () => {
    const text = "a;b\n1;2\n3;4;5\n";
    const e = CSV_FORMAT.lesen(text);
    const t = tabelleBauen(e.index!, text, 0);
    expect(t.spalten.map((s) => s.name)).toEqual(["a", "b", "Spalte 3"]);
  });
});

describe("Zeiger und Ort", () => {
  const text = '{"daten": [{"a/b": 1, "c": 2}, 5]}';
  const index = json(text);
  const t = tabelleBauen(index, text, knotenZu(index, text, "/daten"));
  it("baut Zeiger auf Zellen, auch mit maskierten Schlüsseln und für Einträge selbst", () => {
    expect(zellZeiger(t, 0, 0)).toBe("/daten/0/a~1b");
    expect(zellZeiger(t, 1, 2)).toBe("/daten/1");
    expect(knotenZu(index, text, zellZeiger(t, 0, 1))).toBe(zelle(t, index, 0, 1));
  });
  it("liest Zeile und Spalte aus einem Zeiger", () => {
    expect(ortVon(t, "/daten/0/a~1b")).toEqual({ zeile: 0, spalte: 0 });
    expect(ortVon(t, "/daten/0")).toEqual({ zeile: 0, spalte: t.wertSpalte });
    expect(ortVon(t, "/daten/1")).toEqual({ zeile: 1, spalte: 2 });
    expect(ortVon(t, "/daten/0/fehlt")).toEqual({ zeile: 0, spalte: -1 });
    expect(ortVon(t, "/anderes/0")).toBeNull();
    expect(ortVon(t, "/daten/7")).toBeNull();
    expect(ortVon(t, null)).toBeNull();
  });
});

describe("Sicht: Filter und Sortierung", () => {
  const index = json(KUNDEN);
  const t = tabelleBauen(index, KUNDEN, 0);
  const sicht = (filter: string, spalte: string | null, richtung: "auf" | "ab" = "auf") =>
    Array.from(sichtBerechnen(t, index, KUNDEN, { filter, sortierung: spalte ? { spalte, selbst: false, richtung } : null }));

  it("filtert Volltext über die Zellen, ohne Groß- und Kleinschreibung", () => {
    expect(sicht("", null)).toEqual([0, 1, 2]);
    expect(sicht("LEIP", null)).toEqual([0]);
    expect(sicht("a", null)).toEqual([0, 2]); // Anna, carla, Halle; Bert hat kein a, Schlüssel zählen nicht
    expect(sicht("name", null)).toEqual([]);
  });
  it("sortiert Zahlen als Zahlen, Leeres immer ans Ende", () => {
    expect(sicht("", "nr", "auf")).toEqual([0, 1, 2]);
    expect(sicht("", "nr", "ab")).toEqual([2, 1, 0]);
    expect(sicht("", "ort", "auf")).toEqual([2, 0, 1]);
    expect(sicht("", "ort", "ab")).toEqual([0, 2, 1]);
    expect(sicht("", "name", "auf")).toEqual([0, 1, 2]);
  });
  it("lässt das Dokument unverändert und kennt die Umkehrung", () => {
    const s = sichtBerechnen(t, index, KUNDEN, { filter: "a", sortierung: { spalte: "nr", selbst: false, richtung: "ab" } });
    expect(Array.from(s)).toEqual([2, 0]);
    expect(Array.from(sichtStellen(t, s))).toEqual([1, -1, 0]);
  });
  it("liest Zahlen auch in deutscher Schreibweise", () => {
    expect(zahlenwert("1.234,50")).toBe(1234.5);
    expect(zahlenwert("-3.5")).toBe(-3.5);
    expect(zahlenwert("04109")).toBe(4109);
    expect(zahlenwert("abc")).toBeNaN();
  });
});

describe("Große Tabellen", () => {
  leistungstest("baut 100.000 Zeilen, filtert und sortiert in vertretbarer Zeit", () => {
    const teile: string[] = [];
    for (let i = 0; i < 100_000; i++) teile.push(`{"nr": ${i}, "name": "Name ${i % 997}", "ort": "Ort ${i % 50}", "betrag": "${i % 1000},50"}`);
    const text = "[" + teile.join(",\n") + "]";
    const index = json(text);
    const anfang = performance.now();
    const t = tabelleBauen(index, text, 0);
    const gebaut = performance.now();
    const s = sichtBerechnen(t, index, text, { filter: "ort 7", sortierung: { spalte: "name", selbst: false, richtung: "ab" } });
    const fertig = performance.now();
    expect(t.zeilen.length).toBe(100_000);
    expect(s.length).toBe(2000); // Orte gehen nur bis 49, also genau "Ort 7"
    expect(gebaut - anfang).toBeLessThan(zeitgrenze(1500));
    expect(fertig - gebaut).toBeLessThan(zeitgrenze(1500));
  });
});
