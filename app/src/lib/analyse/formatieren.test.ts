import { describe, expect, it } from "vitest";
import { FORMATIERBAR, umbauen } from "./formatieren";
import { JSON_FORMAT } from "../formate/json";

const text = (t: string, kennung: "json" | "ndjson", art: "formatieren" | "kompakt"): string => {
  const e = umbauen(kennung, art, t);
  if (!e.ok) throw new Error(e.fehler);
  return e.text;
};

describe("FORMATIERBAR", () => {
  it("nennt genau JSON und NDJSON", () => {
    expect([...FORMATIERBAR].sort()).toEqual(["json", "ndjson"]);
  });
  it("lehnt andere Formate ab", () => {
    expect(umbauen("csv", "formatieren", "a,b").ok).toBe(false);
  });
});

describe("JSON formatieren", () => {
  it("rückt ein und behält Zahlen und Escapes als Rohtext", () => {
    const roh = '{"plz":"04109","gross":12345678901234567890,"x":1.50,"e":"a\\"b\\u00e4","l":[1,{"a":null}],"leer":{},"nichts":[]}';
    expect(text(roh, "json", "formatieren")).toBe(
      [
        "{",
        '  "plz": "04109",',
        '  "gross": 12345678901234567890,',
        '  "x": 1.50,',
        '  "e": "a\\"b\\u00e4",',
        '  "l": [',
        "    1,",
        "    {",
        '      "a": null',
        "    }",
        "  ],",
        '  "leer": {},',
        '  "nichts": []',
        "}",
      ].join("\n"),
    );
  });

  it("Kompakt entfernt allen Leerraum außerhalb von Texten", () => {
    const roh = '{\n  "a b": [ 1 , 2 ],\n  "c" : { "d" : true }\n}\n';
    expect(text(roh, "json", "kompakt")).toBe('{"a b":[1,2],"c":{"d":true}}\n');
  });

  it("Formatieren und Kompakt sind Umkehrungen voneinander", () => {
    const roh = '{"a":[1,2,{"b":"c"}],"d":{"e":[]}}';
    const schoen = text(roh, "json", "formatieren");
    expect(text(schoen, "json", "kompakt")).toBe(roh);
    expect(text(text(schoen, "json", "formatieren"), "json", "formatieren")).toBe(schoen);
  });

  it("behält Kommentare und abschließende Kommas (JSONC)", () => {
    const roh = '{\n  // Kopf\n  "a": 1, // hinter a\n  "b": /* inline */ 2,\n}';
    const schoen = text(roh, "json", "formatieren");
    expect(schoen).toBe('{\n  // Kopf\n  "a": 1, // hinter a\n  "b": /* inline */ 2,\n}');
    expect(JSON_FORMAT.lesen(schoen).diagnosen.filter((d) => d.schwere === "fehler")).toEqual([]);
    const kompakt = text(roh, "json", "kompakt");
    expect(kompakt).toBe('{// Kopf\n"a":1,// hinter a\n"b":/* inline */2,}');
    expect(JSON_FORMAT.lesen(kompakt).index).not.toBeNull();
  });

  it("meldet kaputte Texte, statt etwas zu erfinden", () => {
    const e = umbauen("json", "formatieren", '{"a": [1, 2}');
    expect(e.ok).toBe(false);
    if (!e.ok) expect(e.fehler).toContain("Zeile 1");
    expect(umbauen("json", "formatieren", '{"a": "offen').ok).toBe(false);
    expect(umbauen("json", "kompakt", '{"a": 1').ok).toBe(false);
  });

  it("behält BOM und Zeilenende", () => {
    expect(text('\ufeff{ "a" : 1 }\r\n', "json", "kompakt")).toBe('\ufeff{"a":1}\r\n');
  });
});

describe("NDJSON", () => {
  const roh = '{ "a" :1,"b":[1,2] }\n\n{"c":  "x y"}\r\nkaputt {\n';

  it("Formatieren bleibt eine Zeile je Wert, kaputte Zeilen bleiben stehen", () => {
    expect(text(roh, "ndjson", "formatieren")).toBe('{"a": 1, "b": [1, 2]}\n\n{"c": "x y"}\r\nkaputt {\n');
  });

  it("Kompakt lässt Leerzeilen weg", () => {
    expect(text(roh, "ndjson", "kompakt")).toBe('{"a":1,"b":[1,2]}\n{"c":"x y"}\r\nkaputt {\n');
  });
});
