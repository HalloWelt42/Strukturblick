// Spalte entfernen in allen Formaten: nur die Mitglieder bzw. Zellen verschwinden, Formatierung und Rest bleiben.

import { describe, expect, it } from "vitest";
import { anwenden } from "../kern/aenderung";
import type { FormatKennung } from "../kern/format";
import { format } from "./registrierung";

function ohne(f: FormatKennung, text: string, spalte: string, liste = 0): string {
  const fmt = format(f);
  const index = fmt.lesen(text).index!;
  return anwenden(text, fmt.spalteEntfernen(text, index, liste, spalte)).text;
}

describe("Spalte entfernen", () => {
  it("JSON: erstes, mittleres und letztes Mitglied, Kommentare und Einrückung bleiben", () => {
    const t = '[\n  {"a": 1, "b": "x", "c": true},\n  {"b": "y", "a": 2}\n]';
    expect(ohne("json", t, "a")).toBe('[\n  {"b": "x", "c": true},\n  {"b": "y"}\n]');
    expect(ohne("json", t, "b")).toBe('[\n  {"a": 1, "c": true},\n  {"a": 2}\n]');
    expect(ohne("json", '[{"a": 1}]', "a")).toBe("[{}]");
  });

  it("NDJSON: je Zeile", () => {
    expect(ohne("ndjson", '{"a":1,"b":"x"}\n{"a":2,"b":"y"}\n', "a")).toBe('{"b":"x"}\n{"b":"y"}\n');
  });

  it("YAML: Block mit Strich, mittleres Mitglied, verschachtelter Wert und Klammern", () => {
    const t = "- a: 1\n  b: x\n  c:\n    d: 2\n- a: 3\n  b: y\n";
    expect(ohne("yaml", t, "a")).toBe("- b: x\n  c:\n    d: 2\n- b: y\n");
    expect(ohne("yaml", t, "b")).toBe("- a: 1\n  c:\n    d: 2\n- a: 3\n");
    expect(ohne("yaml", t, "c")).toBe("- a: 1\n  b: x\n- a: 3\n  b: y\n");
    expect(ohne("yaml", "- {a: 1, b: x}\n", "a")).toBe("- {b: x}\n");
    expect(ohne("yaml", "- a: 1\n- a: 2\n", "a")).toBe("- {}\n- {}\n");
  });

  it("CSV: Kopfzelle und Zellen, auch die letzte Spalte und gequotete Köpfe", () => {
    expect(ohne("csv", "a;b;c\n1;x;y\n2;z;w\n", "b")).toBe("a;c\n1;y\n2;w\n");
    expect(ohne("csv", "a;b;c\n1;x;y\n", "c")).toBe("a;b\n1;x\n");
    expect(ohne("csv", '"a";"b"\n1;"x;y"\n', "a")).toBe('"b"\n"x;y"\n');
    expect(() => ohne("csv", "a\n1\n", "a")).toThrow("letzte Spalte");
  });
});
