import { describe, expect, it } from "vitest";
import { schluesselSortieren } from "./sortieren";
import { JSON_FORMAT } from "../formate/json";
import { NDJSON_FORMAT } from "../formate/ndjson";
import type { Format } from "../kern/format";

function sortiert(text: string, format: Format = JSON_FORMAT): string {
  const index = format.lesen(text).index;
  if (!index) throw new Error("kein Index");
  const e = schluesselSortieren(text, index);
  if (!e.ok) throw new Error(e.fehler);
  return e.text;
}

describe("Schlüssel sortieren", () => {
  it("ordnet jede Ebene und behält die Formatierung der Plätze", () => {
    const roh = '{\n  "b": 1,\n  "a": {"z": true, "y": [ {"d": 1, "c": 2} ]}\n}\n';
    expect(sortiert(roh)).toBe('{\n  "a": {"y": [ {"c": 2, "d": 1} ], "z": true},\n  "b": 1\n}\n');
  });

  it("lässt Sortiertes unverändert und Listen in ihrer Reihenfolge", () => {
    const roh = '// Kopf\n[3, 1, {"a": "x", "b": 0.10}, [], {}]  ';
    expect(sortiert(roh)).toBe(roh);
  });

  it("sortiert deutsch und mit Zahlen in natürlicher Reihenfolge", () => {
    expect(sortiert('{"ö":1,"z":2,"o":3,"a10":4,"a2":5}')).toBe('{"a2":5,"a10":4,"o":3,"ö":1,"z":2}');
  });

  it("behält Escapes in Schlüsseln und Werten", () => {
    expect(sortiert('{"b\\"x":"\\u00e4","a":1}')).toBe('{"a":1,"b\\"x":"\\u00e4"}');
  });

  it("sortiert jede NDJSON-Zeile für sich und lässt kaputte Zeilen stehen", () => {
    const roh = '{"b":1,"a":2}\nkaputt\n{"d":{"y":1,"x":2},"c":3}\n';
    expect(sortiert(roh, NDJSON_FORMAT)).toBe('{"a":2,"b":1}\nkaputt\n{"c":3,"d":{"x":2,"y":1}}\n');
  });

  it("verkraftet tiefe Verschachtelung ohne Rekursion", () => {
    const tiefe = 20000;
    const roh = '{"b":0,"a":'.repeat(tiefe) + "1" + "}".repeat(tiefe);
    const neu = sortiert(roh);
    expect(neu.length).toBe(roh.length);
    expect(neu.startsWith('{"a":{"a":')).toBe(true);
  });
});
