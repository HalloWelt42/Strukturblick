// Reparatur: feste Regeln, nichts geraten; das Ergebnis lässt sich danach streng lesen.

import { describe, expect, it } from "vitest";
import { format } from "../../formate/registrierung";
import { flicken } from "./flicker";
import { lesartVermuten, nachher, reparieren, vorhaben, zeichenUnterschied, zeilenSteckbrief, zeilentextNach } from "./reparatur";
import { leistungstest, zeitgrenze } from "../../../pruefhilfen/zeitgrenze";

const ZEILE = { jsonc: false, zeilenweise: true };

/** Eine Zeile flicken und das Ergebnis als Text */
function geflickt(s: string, o = ZEILE): string {
  const g = flicken(s, 0, s.length, o);
  if (g.ungeloest) throw new Error(g.ungeloest.meldung);
  return zeilentextNach(s, { von: 0, bis: s.length }, g.eingriffe);
}

describe("Flicker: eine Regel je Fehlerart", () => {
  const faelle: [string, string, string][] = [
    ["Komma fehlt", '{"a":1 "b":2}', '{"a":1, "b":2}'],
    ["abgeschnitten im Text", '{"a":"x","b":"Dresd', '{"a":"x","b":"Dresd"}'],
    ["abgeschnitten nach Doppelpunkt", '{"a":', '{"a":null}'],
    ["abgeschnitten nach Schlüssel", '{"a"', '{"a":null}'],
    ["abgeschnitten im Schlüssel", '{"a":1,"be', '{"a":1,"be":null}'],
    ["abschließendes Komma", '{"a":[1,2,],}', '{"a":[1,2]}'],
    ["doppeltes Komma", "[1,,2]", "[1,2]"],
    ["Doppelpunkt fehlt", '{"a" 1}', '{"a": 1}'],
    ["Wert fehlt", '{"a":,"b":1}', '{"a":null,"b":1}'],
    ["Klammer fehlt", '{"a":[1,2}', '{"a":[1,2]}'],
    ["Klammer zu viel", '{"a":1}}', '{"a":1}'],
    ["einfache Anführungszeichen", "{'a':'it\\'s \"x\"'}", '{"a":"it\'s \\"x\\""}'],
    ["Schlüssel ohne Anführungszeichen", "{name:1, plz_neu:2}", '{"name":1, "plz_neu":2}'],
    ["Text ohne Anführungszeichen", '{"ort":Halle (Saale),"n":1}', '{"ort":"Halle (Saale)","n":1}'],
    ["Wörter anderer Sprachen", "[True, None, NaN, -Infinity]", "[true, null, null, null]"],
    ["Zahlformen", "[+1, .5, 2., 007]", '[1, 0.5, 2.0, "007"]'],
    ["Rückstrich", '{"pfad":"C:\\daten"}', '{"pfad":"C:\\\\daten"}'],
    ["Steuerzeichen", '{"a":"x\ty"}', '{"a":"x\\ty"}'],
    ["Kommentar", '{"a":1 /* alt */}', '{"a":1 }'],
    ["zwei Datensätze", '{"a":1} {"a":2}', '{"a":1} \n{"a":2}'],
  ];
  for (const [name, ein, aus] of faelle) {
    it(name, () => {
      expect(geflickt(ein)).toBe(aus);
      for (const z of aus.split("\n")) expect(() => JSON.parse(z)).not.toThrow();
    });
  }

  it("lässt gültiges JSON in Ruhe", () => {
    for (const s of ['{"a":[1,{"b":null}],"c":"\\u00e4"}', "[]", "{}", "-0.5e3", '"x"']) {
      expect(flicken(s, 0, s.length, ZEILE)).toEqual({ eingriffe: [], hinweise: [], ungeloest: null });
    }
  });

  it("gibt auf, wo keine Regel greift, und behält die Eingriffe davor", () => {
    const s = '{"a":1 "b":2, @}';
    const g = flicken(s, 0, s.length, ZEILE);
    expect(g.eingriffe.map((e) => e.regel)).toEqual(["komma-fehlt"]);
    expect(g.ungeloest).toMatchObject({ von: 14 });
  });

  it("JSON mit Kommentaren behält Kommentare und abschließende Kommas", () => {
    const s = '{\n  // Hinweis\n  "a": [1, 2,],\n}';
    expect(flicken(s, 0, s.length, { jsonc: true, zeilenweise: false }).eingriffe).toEqual([]);
  });

  it("JSON über mehrere Zeilen: fehlendes Anführungszeichen am Zeilenende und fehlendes Komma", () => {
    const s = '{\n  "ort": "Dresden\n  "plz": "01067"\n}';
    expect(geflickt(s, { jsonc: true, zeilenweise: false })).toBe('{\n  "ort": "Dresden",\n  "plz": "01067"\n}');
  });
});

describe("Reparatur eines Dokuments", () => {
  const IMPORT = [
    '{"kundennr":"K-10471","name":"Ole Hansen","plz":"06108","ort":"Halle (Saale)","angelegt":"2026-11-10"}',
    '{"kundennr":"K-10472" "name":"Petra Nguyen","plz":"01067","ort":"Dresd',
    '{"kundennr":"K-10473","name":"Karl Weiß","plz":"04229","ort":"Leipzig","angelegt":"2026-11-10"}',
  ].join("\n");

  it("JSON Lines wie im Entwurf: Komma und Schluss, Hinweise auf Abgeschnittenes und fehlende Felder", () => {
    const r = reparieren(IMPORT, "ndjson");
    expect(r.zeilen).toBe(3);
    expect(r.befunde).toHaveLength(1);
    const b = r.befunde[0];
    expect(b.zeile).toBe(2);
    expect(b.eingriffe.map((e) => [e.von - b.von + 1, e.meldung, e.vorschlag])).toEqual([
      [22, 'Komma fehlt nach "K-10472"', "Komma einfügen"],
      [71, "Zeile endet mitten im Text", 'Text und Objekt schließen mit "}'],
    ]);
    expect(b.hinweise).toEqual(['ort "Dresd" ist vermutlich abgeschnitten', "angelegt fehlt. Nichts wird erfunden: bitte von Hand ergänzen"]);
    expect(b.felder).toEqual({ vorhanden: ["kundennr", "name", "plz", "ort"], fehlend: ["angelegt"] });

    const v = vorhaben(IMPORT, r.befunde);
    expect([v.ergaenzt, v.geloescht, v.zeilen]).toEqual([3, 0, 1]);
    expect(nachher(v.text, "ndjson")).toEqual({ fehler: 0, datensaetze: 3 });
    expect(nachher(IMPORT, "ndjson")).toEqual({ fehler: 1, datensaetze: 2 });
  });

  it("JSON: Befunde nach Textzeile gebündelt, danach streng lesbar", () => {
    const text = '{\n  "a": 1\n  "b": [1, 2\n}';
    const r = reparieren(text, "json");
    expect(r.befunde.map((b) => [b.zeile, b.eingriffe.map((e) => e.regel)])).toEqual([[2, ["komma-fehlt"]], [3, ["klammer-fehlt"]]]);
    const v = vorhaben(text, r.befunde);
    expect(format("json").lesen(v.text).diagnosen).toEqual([]);
    expect(vorhaben(text, r.befunde.slice(0, 1)).zeilen).toBe(1);
  });

  it("vermutet die Leseart", () => {
    expect(lesartVermuten(IMPORT, null).als).toBe("ndjson");
    expect(lesartVermuten('{\n "a": 1\n}', null).als).toBe("json");
    expect(lesartVermuten("x", "ndjson")).toEqual({ als: "ndjson", grund: "Format des Dokuments" });
  });

  it("Bilanz zeichengenau: einfache gegen doppelte Anführungszeichen sind je ein Tausch", () => {
    const text = "{a:'x'}";
    const r = reparieren(text, "ndjson");
    expect(vorhaben(text, r.befunde)).toMatchObject({ text: '{"a":"x"}', ergaenzt: 4, geloescht: 2 });
    expect(zeichenUnterschied("'x'", '"x"')).toEqual([{ text: "'", art: "weg" }, { text: '"', art: "neu" }, { text: "x", art: "gleich" }, { text: "'", art: "weg" }, { text: '"', art: "neu" }]);
  });

  it("Steckbrief einer Zeile", () => {
    expect(zeilenSteckbrief('{"kundennr":"K-10471","name":"Ole Hansen","plz":"06108","n":3}')).toBe("K-10471, Ole Hansen, 4 Felder");
  });

  it("Beispiel kundenimport.ndjson: vier Zeilen repariert, danach alle 21 Datensätze lesbar", async () => {
    const { readFileSync } = await import("node:fs");
    const text = readFileSync(new URL("../../../../pruefdaten/kundenimport.ndjson", import.meta.url), "utf8");
    const r = reparieren(text, "ndjson");
    expect(r.befunde.map((b) => b.zeile)).toEqual([2, 7, 12, 16]);
    expect(r.zeilen).toBe(20);
    expect(r.befunde.every((b) => !b.ungeloest)).toBe(true);
    expect(nachher(text, "ndjson").fehler).toBe(4);
    expect(nachher(vorhaben(text, r.befunde).text, "ndjson")).toEqual({ fehler: 0, datensaetze: 21 });
  });

  leistungstest("bleibt bei großen Dateien schnell", () => {
    const zeilen = Array.from({ length: 20000 }, (_, i) => (i % 500 === 7 ? `{"nr":${i} "name":"x` : `{"nr":${i},"name":"Kunde ${i}","ort":"Ort"}`));
    const text = zeilen.join("\n");
    const start = performance.now();
    const r = reparieren(text, "ndjson");
    expect(r.befunde).toHaveLength(40);
    expect(performance.now() - start).toBeLessThan(zeitgrenze(1500));
  });
});
