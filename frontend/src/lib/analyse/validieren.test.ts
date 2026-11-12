// Validieren: Befunde mit Stelle, deutscher Meldung, Soll und Ist; format als Warnung; abgeleitetes Schema passt.

import { describe, expect, it } from "vitest";
import { format } from "../formate/registrierung";
import { alsJsonSchema, schemaAbleiten } from "./schema";
import { eintragKennung, pruefen, schemaLesen } from "./validieren";

const SCHEMA = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  required: ["bestellungen"],
  properties: { bestellungen: { type: "array", items: { $ref: "#/$defs/Bestellung" } } },
  $defs: {
    Bestellung: {
      type: "object",
      required: ["nr", "kunde"],
      additionalProperties: false,
      properties: {
        nr: { type: "string" },
        datum: { type: "string", format: "date" },
        kunde: { $ref: "#/$defs/Kunde" },
        menge: { type: "integer", minimum: 1 },
      },
    },
    Kunde: { type: "object", properties: { name: { type: "string" }, plz: { type: "string", pattern: "^[0-9]{5}$" } } },
  },
};

const TEXT = `{
  "bestellungen": [
    {"nr": "B-1", "datum": "2026-11-09", "kunde": {"name": "Henrik Lange", "plz": "4109"}, "menge": 0},
    {"nr": "B-2", "datum": "10.11.2026", "kunde": {"name": "Ines", "plz": "01067"}, "extra": true},
    {"datum": "2026-11-10", "kunde": {"name": "Ole", "plz": "01067"}}
  ]
}`;

describe("Validieren", () => {
  const index = format("json").lesen(TEXT).index!;

  it("meldet Verstöße mit Stelle, Soll, Ist und Vorschlag", () => {
    const p = pruefen(index, TEXT, SCHEMA);
    if (!p.ok) throw new Error(p.fehler);
    expect(p.befunde.map((b) => `${b.art}:${b.zeiger}:${b.regel}`)).toEqual([
      "fehler:/bestellungen/0/kunde/plz:pattern ^[0-9]{5}$",
      "fehler:/bestellungen/0/menge:minimum 1",
      "warnung:/bestellungen/1/datum:format date",
      "fehler:/bestellungen/1/extra:additionalProperties false",
      "fehler:/bestellungen/2:required nr",
    ]);
    const plz = p.befunde[0];
    expect(plz).toMatchObject({ meldung: "Hat 4 statt 5 Ziffern", gefunden: '"4109"', vorschlag: "04109", zeile: 3, imSchema: "#/$defs/Kunde/properties/plz" });
    expect(p.befunde[1].meldung).toBe("0 ist kleiner als das Minimum 1");
    expect(p.befunde[4]).toMatchObject({ meldung: "Pflichtfeld nr fehlt", gefunden: "fehlt" });
    expect(eintragKennung(index, TEXT, plz.knoten)).toBe("B-1, 2026-11-09");
  });

  it("ein aus den Daten abgeleitetes Schema passt zu den Daten", () => {
    const sauber = '[{"nr": "B-1", "datum": "2026-11-09", "menge": 2}, {"nr": "B-2", "datum": "2026-11-10", "menge": 3}]';
    const ix = format("json").lesen(sauber).index!;
    const s = alsJsonSchema(schemaAbleiten(ix, sauber), "test");
    const p = pruefen(ix, sauber, s);
    expect(p.ok && p.befunde).toEqual([]);
  });

  it("weist kaputte Schemas mit Grund ab", () => {
    expect(schemaLesen("{nicht json").ok).toBe(false);
    expect(schemaLesen("[1,2]")).toMatchObject({ ok: false });
    expect(schemaLesen('{"type": "object"}').ok).toBe(true);
  });
});

describe("Beispiel-Schema des Demosatzes", () => {
  it("meldet die Bestellungen mit mehr als drei Positionen und sonst nichts", async () => {
    const { readFileSync } = await import("node:fs");
    const daten = readFileSync(new URL("../../../pruefdaten/bestellungen.json", import.meta.url), "utf8");
    const schema = JSON.parse(readFileSync(new URL("../../../pruefdaten/bestellung.schema.json", import.meta.url), "utf8"));
    const index = format("json").lesen(daten).index!;
    const p = pruefen(index, daten, schema);
    if (!p.ok) throw new Error(p.fehler);
    expect(p.befunde.length).toBe(26);
    expect(new Set(p.befunde.map((b) => b.regel))).toEqual(new Set(["maxItems 3"]));
  });
});
