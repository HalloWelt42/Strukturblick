// Einträge entfernen in allen Formaten: nur die Textstellen der Einträge verschwinden, alles andere bleibt.

import { describe, expect, it } from "vitest";
import { anwenden } from "../kern/aenderung";
import { knotenZu } from "../kern/pfade";
import { format } from "./registrierung";
import type { FormatKennung } from "../kern/format";

function entfernen(art: FormatKennung, text: string, liste: string, stellen: number[]): string {
  const f = format(art);
  const index = f.lesen(text).index!;
  return anwenden(text, f.eintraegeEntfernen(text, index, knotenZu(index, text, liste), stellen)).text;
}

describe("Einträge entfernen", () => {
  it("JSON: mit Kommas, Kommentare und Einrückung bleiben", () => {
    const t = '{\n  // Kunden\n  "k": [\n    {"n": 1},\n    {"n": 2},\n    {"n": 3},\n    {"n": 4}\n  ]\n}';
    expect(entfernen("json", t, "/k", [1, 2])).toBe('{\n  // Kunden\n  "k": [\n    {"n": 1},\n    {"n": 4}\n  ]\n}');
    expect(entfernen("json", t, "/k", [0])).toBe('{\n  // Kunden\n  "k": [\n    {"n": 2},\n    {"n": 3},\n    {"n": 4}\n  ]\n}');
    expect(entfernen("json", t, "/k", [3])).toBe('{\n  // Kunden\n  "k": [\n    {"n": 1},\n    {"n": 2},\n    {"n": 3}\n  ]\n}');
    expect(JSON.parse(entfernen("json", "[1,2,3,4,5]", "", [0, 2, 4]))).toEqual([2, 4]);
  });

  it("CSV: ganze Zeilen samt Umbruch, auch mit \\r\\n und mehrzeiligen Feldern", () => {
    expect(entfernen("csv", "a;b\r\n1;2\r\n3;4\r\n5;6\r\n", "", [1])).toBe("a;b\r\n1;2\r\n5;6\r\n");
    expect(entfernen("csv", 'a;b\n1;"zwei\nzeilen"\n3;4\n', "", [0])).toBe("a;b\n3;4\n");
    expect(entfernen("csv", "a;b\n1;2\n3;4", "", [1])).toBe("a;b\n1;2\n");
  });

  it("NDJSON: Zeilen, Listen in einer Zeile wie JSON", () => {
    expect(entfernen("ndjson", '{"a":1}\n{"a":2}\n{"a":3}\n', "", [1])).toBe('{"a":1}\n{"a":3}\n');
    expect(entfernen("ndjson", '{"l":[1,2,3]}\n{"l":[4]}\n', "/0/l", [1])).toBe('{"l":[1,3]}\n{"l":[4]}\n');
  });

  it("YAML: Block zeilenweise, Klammern mit Kommas", () => {
    const t = "liste:\n  # Kommentar bleibt\n  - name: x\n    n: 1\n  - name: y\n    n: 2\n  - name: z\n    n: 3\nflach: [1, 2, 3]\n";
    expect(entfernen("yaml", t, "/liste", [1])).toBe("liste:\n  # Kommentar bleibt\n  - name: x\n    n: 1\n  - name: z\n    n: 3\nflach: [1, 2, 3]\n");
    expect(entfernen("yaml", t, "/flach", [0, 1])).toBe("liste:\n  # Kommentar bleibt\n  - name: x\n    n: 1\n  - name: y\n    n: 2\n  - name: z\n    n: 3\nflach: [3]\n");
  });
});
