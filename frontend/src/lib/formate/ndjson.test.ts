import { describe, expect, it } from "vitest";
import { inhalt, kinderVon, KnotenArt, schluessel } from "../kern/strukturindex";
import { knotenZu, zeigerVon } from "../kern/pfade";
import { NDJSON_FORMAT } from "./ndjson";
import { Formatfehler } from "./vertrag";
import { leistungstest, zeitgrenze } from "../../pruefhilfen/zeitgrenze";

describe("NDJSON lesen", () => {
  it("liest je nichtleere Zeile einen Eintrag der Wurzelliste", () => {
    const text = '{"name": "Anna", "n": 1}\r\n\n  [1, 2]  \n"😀"\n42\n';
    const e = NDJSON_FORMAT.lesen(text);
    expect(e.diagnosen).toEqual([]);
    expect(e.merkmale).toEqual({ kaputteZeilen: 0 });
    const index = e.index!;
    expect(index.art[0]).toBe(KnotenArt.liste);
    expect([index.von[0], index.bis[0]]).toEqual([0, text.length]);
    const eintraege = [...kinderVon(index, 0)];
    expect(eintraege.map((k) => index.art[k])).toEqual([KnotenArt.objekt, KnotenArt.liste, KnotenArt.text, KnotenArt.zahl]);
    expect(eintraege.map((k) => text.slice(index.von[k], index.bis[k]))).toEqual(['{"name": "Anna", "n": 1}', "[1, 2]", '"😀"', "42"]);
    const name = knotenZu(index, text, "/0/name");
    expect(schluessel(index, text, name)).toBe("name");
    expect(inhalt(index, text, name)).toBe("Anna");
    expect(inhalt(index, text, knotenZu(index, text, "/2"))).toBe("😀");
  });

  it("liest leere Texte als leere Liste", () => {
    const e = NDJSON_FORMAT.lesen("\n\n");
    expect(e.index!.anzahl).toBe(1);
    expect(e.diagnosen).toEqual([]);
  });

  it("macht kaputte Zeilen zu Texteinträgen mit Diagnose je Zeile", () => {
    const text = '{"a": 1}\n{"a": 2, oops}\n\n{"a": 3}\n// Kommentar\n[1,]\n{"a": 4} {"a": 5}\n{"a": 6, "a": 7}';
    const e = NDJSON_FORMAT.lesen(text);
    const index = e.index!;
    const f = e.diagnosen.filter((d) => d.schwere === "fehler");
    expect(f.map((d) => d.meldung.split(":")[0])).toEqual(["Zeile 2", "Zeile 5", "Zeile 6", "Zeile 7"]);
    expect(f[2].meldung).toContain("Komma");
    expect(f[3].meldung).toContain("folgt noch Text");
    const warnung = e.diagnosen.find((d) => d.schwere === "warnung")!;
    expect(warnung.meldung).toBe('Zeile 8: Doppelter Schlüssel "a"');
    expect(e.merkmale).toEqual({ kaputteZeilen: 4 });
    const eintraege = [...kinderVon(index, 0)];
    expect(eintraege).toHaveLength(7);
    const kaputt = eintraege[1];
    expect(index.art[kaputt]).toBe(KnotenArt.text);
    expect(inhalt(index, text, kaputt)).toBe('{"a": 2, oops}');
    expect(index.kinder[kaputt]).toBe(0);
    expect(inhalt(index, text, knotenZu(index, text, "/2/a"))).toBe("3");
    expect(inhalt(index, text, knotenZu(index, text, "/3"))).toBe("// Kommentar");
  });

  it("findet Einträge über Zeiger, auch mit / und ~", () => {
    const text = '{"a/b": 1}\n{"m~n": {"x": [true]}}\n';
    const index = NDJSON_FORMAT.lesen(text).index!;
    const k = knotenZu(index, text, "/1/m~0n/x/0");
    expect(index.art[k]).toBe(KnotenArt.wahrheitswert);
    expect(zeigerVon(index, text, knotenZu(index, text, "/0/a~1b"))).toBe("/0/a~1b");
    for (let i = 0; i < index.anzahl; i++) expect(knotenZu(index, text, zeigerVon(index, text, i))).toBe(i);
  });
});

describe("NDJSON wertSchreiben", () => {
  const text = '{"ort": "Leipzig", "plz": "04109"}\n\nkaputt hier\n{"n": 1}\n';

  it("Rundreise: Wert ersetzen, Rest bleibt gleich", () => {
    const e = NDJSON_FORMAT.lesen(text);
    const index = e.index!;
    const k = knotenZu(index, text, "/0/ort");
    const a = NDJSON_FORMAT.wertSchreiben(text, index, k, { art: "text", wert: "Halle\nan der Saale" }, e.merkmale);
    const neu = text.slice(0, a.von) + a.einfuegen + text.slice(a.bis);
    expect(neu.slice(0, a.von)).toBe(text.slice(0, a.von));
    expect(neu.slice(a.von + a.einfuegen.length)).toBe(text.slice(a.bis));
    const n = NDJSON_FORMAT.lesen(neu);
    expect(n.diagnosen.filter((d) => d.schwere === "fehler")).toHaveLength(1);
    expect(inhalt(n.index!, neu, knotenZu(n.index!, neu, "/0/ort"))).toBe("Halle\nan der Saale");
    expect(n.index!.kinder[0]).toBe(3);
  });

  it("eine kaputte Zeile lässt sich durch einen gültigen Wert ersetzen", () => {
    const e = NDJSON_FORMAT.lesen(text);
    const index = e.index!;
    const k = knotenZu(index, text, "/1");
    const a = NDJSON_FORMAT.wertSchreiben(text, index, k, { art: "zahl", roh: "7" }, e.merkmale);
    const neu = text.slice(0, a.von) + a.einfuegen + text.slice(a.bis);
    expect(neu).toBe('{"ort": "Leipzig", "plz": "04109"}\n\n7\n{"n": 1}\n');
    const n = NDJSON_FORMAT.lesen(neu);
    expect(n.diagnosen).toEqual([]);
    expect(n.index!.art[knotenZu(n.index!, neu, "/1")]).toBe(KnotenArt.zahl);
  });

  it("lehnt Wurzel, Objekte und ungültige Zahlen ab", () => {
    const e = NDJSON_FORMAT.lesen(text);
    const index = e.index!;
    expect(() => NDJSON_FORMAT.wertSchreiben(text, index, 0, { art: "nichts" }, e.merkmale)).toThrow(Formatfehler);
    expect(() => NDJSON_FORMAT.wertSchreiben(text, index, knotenZu(index, text, "/0"), { art: "nichts" }, e.merkmale)).toThrow("Ein Objekt");
    expect(() => NDJSON_FORMAT.wertSchreiben(text, index, knotenZu(index, text, "/2/n"), { art: "zahl", roh: "1,5" }, e.merkmale)).toThrow(Formatfehler);
  });
});

describe("NDJSON erkennen", () => {
  it("braucht mindestens zwei Zeilen mit je einem JSON-Wert", () => {
    expect(NDJSON_FORMAT.erkennen('{"a": 1}\n{"a": 2}')).toBeGreaterThan(0.9);
    expect(NDJSON_FORMAT.erkennen('{"a": 1}\n')).toBe(0);
    expect(NDJSON_FORMAT.erkennen("hallo\nwelt")).toBe(0);
    expect(NDJSON_FORMAT.erkennen('{\n  "a": 1\n}')).toBe(0);
    expect(NDJSON_FORMAT.erkennen('{"a": 1}\n{"a": 2}\nkaputt')).toBeGreaterThan(0.5);
    expect(NDJSON_FORMAT.erkennen("1\n2\n3")).toBeLessThan(0.6);
  });
});

describe("NDJSON Leistung", () => {
  leistungstest("liest etwa 5 MB deutlich unter 3 s", () => {
    const zeilen: string[] = [];
    let groesse = 0;
    while (groesse < 5_000_000) {
      const i = zeilen.length;
      const z = `{"id": ${i}, "zeit": "2026-11-11T10:00:00Z", "meldung": "Zeile ${i} mit 😀 und \\"Escape\\"", "werte": [${i}, ${i / 3}, null], "ok": true}`;
      zeilen.push(z);
      groesse += z.length + 1;
    }
    const text = zeilen.join("\n") + "\n";
    const start = performance.now();
    const e = NDJSON_FORMAT.lesen(text);
    const dauer = performance.now() - start;
    console.log(`NDJSON: ${(text.length / 1e6).toFixed(1)} Mio. Zeichen, ${e.index!.anzahl} Knoten in ${dauer.toFixed(0)} ms`);
    expect(e.diagnosen).toEqual([]);
    expect(e.index!.kinder[0]).toBe(zeilen.length);
    expect(dauer).toBeLessThan(zeitgrenze(3000));
  });
});
