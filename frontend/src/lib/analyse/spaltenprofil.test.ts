import { describe, expect, it } from "vitest";
import { KnotenArt } from "../kern/strukturindex";
import { JSON_FORMAT } from "../formate/json";
import { CSV_FORMAT } from "../formate/csv";
import { tabelleBauen } from "./tabelle";
import { siehtAusWie, spaltenprofil } from "./spaltenprofil";
import { leistungstest, zeitgrenze } from "../../pruefhilfen/zeitgrenze";

function csvProfil(text: string, spalte: string) {
  const index = CSV_FORMAT.lesen(text).index!;
  const t = tabelleBauen(index, text, 0);
  return spaltenprofil(t, index, text, t.spalteNach.get(spalte)!);
}

describe("Muster einzelner Werte", () => {
  it("erkennt Betrag, Datum und Zahl", () => {
    expect(siehtAusWie("1.234,50")).toBe("betrag");
    expect(siehtAusWie("312,00 €")).toBe("betrag");
    expect(siehtAusWie("2024-03-01")).toBe("datum");
    expect(siehtAusWie("01.03.2024")).toBe("datum");
    expect(siehtAusWie("04109")).toBe("zahl");
    expect(siehtAusWie("-3.5e2")).toBe("zahl");
    expect(siehtAusWie("Leipzig")).toBeNull();
  });
});

describe("Spaltenprofil", () => {
  const text = "plz;ort;umsatz;angelegt\n04109;Leipzig;2.418,90;2024-01-08\n04109;Leipzig;312,00;08.01.2024\n06108;Halle;;2024-01-11\n01067;Dresden;87,40;\n";

  it("zählt leere, verschiedene und häufigste Werte", () => {
    const p = csvProfil(text, "plz");
    expect(p.zeilen).toBe(4);
    expect(p.leer).toBe(0);
    expect(p.verschieden).toBe(3);
    expect(p.haeufigste[0]).toEqual({ wert: "04109", anzahl: 2 });
    expect(p.haeufigste.length).toBe(3);
    expect(csvProfil(text, "umsatz").leer).toBe(1);
  });
  it("schlägt Typen nur vor", () => {
    expect(csvProfil(text, "plz").typ.titel).toBe("Text, sieht aus wie Zahl");
    expect(csvProfil(text, "umsatz").typ.titel).toBe("Text, sieht aus wie Betrag");
    expect(csvProfil(text, "angelegt").typ.titel).toBe("Text, sieht aus wie Datum");
    expect(csvProfil(text, "ort").typ).toMatchObject({ art: KnotenArt.text, siehtAusWie: null, titel: "Text" });
  });
  it("kennt Arten bei Formaten mit Typen, fehlende Schlüssel und null zählen als leer", () => {
    const json = '[{"a": 1, "b": "x"}, {"a": 2, "b": 5}, {"b": null}, {"a": 2, "c": [1]}]';
    const index = JSON_FORMAT.lesen(json).index!;
    const t = tabelleBauen(index, json, 0);
    const a = spaltenprofil(t, index, json, 0);
    expect(a).toMatchObject({ zeilen: 4, leer: 1, verschieden: 2, typ: { art: KnotenArt.zahl, titel: "Zahl" } });
    expect(a.haeufigste[0]).toEqual({ wert: "2", anzahl: 2 });
    const b = spaltenprofil(t, index, json, 1);
    expect(b).toMatchObject({ leer: 2, verschieden: 2, typ: { art: "gemischt" } });
    const c = spaltenprofil(t, index, json, 2);
    expect(c).toMatchObject({ leer: 3, verschieden: 0, typ: { art: KnotenArt.liste } });
  });
  it("trennt gleichen Text verschiedener Art", () => {
    const json = '[{"a": 5}, {"a": "5"}]';
    const index = JSON_FORMAT.lesen(json).index!;
    const t = tabelleBauen(index, json, 0);
    expect(spaltenprofil(t, index, json, 0).verschieden).toBe(2);
  });
  leistungstest("bleibt bei 100.000 Zeilen flott", () => {
    const zeilen = ["nr;ort;betrag"];
    for (let i = 0; i < 100_000; i++) zeilen.push(`${i};Ort ${i % 50};${i % 1000},50`);
    const csv = zeilen.join("\n");
    const index = CSV_FORMAT.lesen(csv).index!;
    const t = tabelleBauen(index, csv, 0);
    const anfang = performance.now();
    const profile = t.spalten.map((_, j) => spaltenprofil(t, index, csv, j));
    expect(performance.now() - anfang).toBeLessThan(zeitgrenze(1500));
    expect(profile[0].verschieden).toBe(100_000);
    expect(profile[1].haeufigste[0].anzahl).toBe(2000);
    expect(profile[2].typ.siehtAusWie).toBe("betrag");
  });
});
