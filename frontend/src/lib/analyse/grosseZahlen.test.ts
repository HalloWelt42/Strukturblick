// Große Ganzzahlen (STB-53): bleiben in Werten genau und kommen beim Konvertieren als Zahl mit allen Ziffern an.

import { describe, expect, it } from "vitest";
import { format } from "../formate/registrierung";
import { wertAus } from "./wert";
import { umwandeln, type Zielkennung } from "./konvertieren/konvertieren";

const text = '{"liste": [{"id": 12345678901234567891, "klein": 7, "neg": -9007199254740993}]}';
const index = format("json").lesen(text).index!;

describe("Große Ganzzahlen", () => {
  it("stehen in Werten genau als bigint, kleine bleiben Zahlen", () => {
    expect(wertAus(index, text)).toEqual({ liste: [{ id: 12345678901234567891n, klein: 7, neg: -9007199254740993n }] });
  });
  it("kommen in jedem Ziel mit allen Ziffern an, als Zahl, wo das Ziel Zahlen kennt", () => {
    const quelle = { index, text, format: "json", formatName: "JSON", kommentare: false, fehler: 0, datumswerte: 0, typen: true };
    const ziel = (z: Zielkennung) => umwandeln(quelle, z).text;
    expect(ziel("json")).toContain('"id": 12345678901234567891');
    expect(ziel("ndjson")).toContain('"id":12345678901234567891');
    expect(ziel("yaml")).toMatch(/id: 12345678901234567891\b/);
    expect(ziel("toml")).toContain("-9007199254740993");
    for (const z of ["csv", "xml", "markdown", "html"] as const) expect(ziel(z), z).toContain("12345678901234567891");
  });
});
