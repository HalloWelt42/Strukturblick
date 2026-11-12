// YAML-Aliase als Werte (STB-52): an einem Alias steht für Abfragen, SQL, Validieren und Konvertieren der ganze Inhalt
// seines Ankers; der Index merkt sich das Ziel, der Baum zeigt weiter den Verweis.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { YAML_FORMAT } from "../formate/yaml";
import { knotenZu, zeigerVon } from "../kern/pfade";
import { wertAus } from "./wert";

describe("YAML-Aliase als Werte (STB-52)", () => {
  it("geben Abfragen und Konvertieren den Inhalt des Ankers, auch verschachtelt", () => {
    const text = readFileSync(new URL("../../../pruefdaten/dienste.yaml", import.meta.url), "utf8");
    const e = YAML_FORMAT.lesen(text);
    const w = wertAus(e.index!, text) as { standard: object; dienste: { gesundheit?: object; "<<": object }[] };
    expect(w.dienste[0].gesundheit).toEqual({ pfad: "/gesund", intervall: "30s", versuche: 3 });
    expect(w.dienste[0]["<<"]).toEqual(w.standard);
    expect((w.dienste[1]["<<"] as { gesundheit: object }).gesundheit).toEqual({ pfad: "/gesund", intervall: "30s", versuche: 3 });
    // Der Baum zeigt weiter den Verweis, mit seinem Ziel
    const k = knotenZu(e.index!, text, "/dienste/0/gesundheit");
    expect(e.index!.verweise.get(k)).toMatch(/^Verweis auf &gesundheit/);
    expect(zeigerVon(e.index!, text, e.index!.verweisZiele.get(k)!)).toBe("/standard/gesundheit");
  });
  it("laufen bei einem Alias auf sich selbst nicht endlos", () => {
    const text = "a: &x\n  b: *x\n";
    const e = YAML_FORMAT.lesen(text);
    expect(() => wertAus(e.index!, text)).not.toThrow();
  });
});

