// Genaue große Ganzzahlen durch JSON: schreiben ohne Anführungszeichen, lesen als bigint, Zahlen in Texten unberührt.

import { describe, expect, it } from "vitest";
import { ganzOderZahl, jsonLesen, jsonText } from "./json";

describe("JSON mit großen Ganzzahlen", () => {
  it("schreibt bigint als Ziffern, alles andere wie JSON.stringify", () => {
    expect(jsonText({ id: 12345678901234567891n, n: 1.5, t: "x" })).toBe('{"id":12345678901234567891,"n":1.5,"t":"x"}');
    expect(jsonText([-9007199254740993n], 2)).toBe("[\n  -9007199254740993\n]");
    expect(jsonText(12345678901234567891n)).toBe("12345678901234567891");
    expect(jsonText(undefined)).toBeUndefined();
  });
  it("liest große Ganzzahlen genau, lässt Zahlen in Texten und Kommazahlen in Ruhe", () => {
    expect(jsonLesen('{"id": 12345678901234567891, "t": "12345678901234567891", "k": 1234567890123456789.5, "e": 1e30}')).toEqual({ id: 12345678901234567891n, t: "12345678901234567891", k: 1234567890123456789.5, e: 1e30 });
    expect(jsonLesen('["a\\"12345678901234567891", -9007199254740993, 9007199254740991]')).toEqual(['a"12345678901234567891', -9007199254740993n, 9007199254740991]);
    expect(jsonLesen("[1, 2]")).toEqual([1, 2]);
  });
  it("kennt die Grenze genau", () => {
    expect(ganzOderZahl("9007199254740991")).toBe(9007199254740991);
    expect(ganzOderZahl("9007199254740992")).toBe(9007199254740992n);
    expect(ganzOderZahl("1.5")).toBe(1.5);
  });
});
