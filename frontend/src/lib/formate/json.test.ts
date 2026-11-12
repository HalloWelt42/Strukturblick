import { describe, expect, it } from "vitest";
import { inhalt, KEIN, kinderVon, KnotenArt, schluessel, type Strukturindex } from "../kern/strukturindex";
import { knotenZu, zeigerVon } from "../kern/pfade";
import { JSON_FORMAT } from "./json";
import { NDJSON_FORMAT } from "./ndjson";
import { Formatfehler, type NeuerWert } from "./vertrag";
import { leistungstest, zeitgrenze } from "../../pruefhilfen/zeitgrenze";

function gelesen(text: string): Strukturindex {
  const e = JSON_FORMAT.lesen(text);
  if (!e.index) throw new Error("kein Index");
  return e.index;
}

function knoten(text: string, zeiger: string): { index: Strukturindex; k: number } {
  const index = gelesen(text);
  const k = knotenZu(index, text, zeiger);
  expect(k).not.toBe(KEIN);
  return { index, k };
}

const fehler = (text: string) => JSON_FORMAT.lesen(text).diagnosen.filter((d) => d.schwere === "fehler");

describe("JSON lesen", () => {
  it("liest Art, Schlüssel, Inhalt und Spannen", () => {
    const text = '{"name": "Anna", "alter": 42, "aktiv": true, "x": null, "liste": [1, "b"]}';
    const e = JSON_FORMAT.lesen(text);
    expect(e.diagnosen).toEqual([]);
    const index = e.index!;
    expect(index.art[0]).toBe(KnotenArt.objekt);
    expect([index.von[0], index.bis[0]]).toEqual([0, text.length]);
    expect(index.kinder[0]).toBe(5);
    const name = knotenZu(index, text, "/name");
    expect(index.art[name]).toBe(KnotenArt.text);
    expect(schluessel(index, text, name)).toBe("name");
    expect(text.slice(index.schluesselVon[name], index.schluesselBis[name])).toBe("name");
    expect(text.slice(index.von[name], index.bis[name])).toBe('"Anna"');
    expect(inhalt(index, text, name)).toBe("Anna");
    const alter = knotenZu(index, text, "/alter");
    expect(index.art[alter]).toBe(KnotenArt.zahl);
    expect(inhalt(index, text, alter)).toBe("42");
    expect(index.art[knotenZu(index, text, "/aktiv")]).toBe(KnotenArt.wahrheitswert);
    expect(index.art[knotenZu(index, text, "/x")]).toBe(KnotenArt.nichts);
    const liste = knotenZu(index, text, "/liste");
    expect(index.art[liste]).toBe(KnotenArt.liste);
    expect(text.slice(index.von[liste], index.bis[liste])).toBe('[1, "b"]');
    const b = knotenZu(index, text, "/liste/1");
    expect(schluessel(index, text, b)).toBeNull();
    expect(inhalt(index, text, b)).toBe("b");
  });

  it("dekodiert Escapes in Werten und Schlüsseln", () => {
    const text = '{"a\\"b": "x\\ny\\u00e4\\/", "plain": "ok"}';
    const index = gelesen(text);
    const k = index.erstesKind[0];
    expect(schluessel(index, text, k)).toBe('a"b');
    expect(index.schluesselDekodiert.has(k)).toBe(true);
    expect(inhalt(index, text, k)).toBe("x\nyä/");
    const plain = index.naechstes[k];
    expect(index.dekodiert.has(plain)).toBe(false);
    expect(knotenZu(index, text, '/a"b')).toBe(k);
  });

  it("zählt Positionen in UTF-16-Einheiten (Emoji)", () => {
    const text = '{"😀": "a😀b", "n": 1}';
    const index = gelesen(text);
    const k = index.erstesKind[0];
    expect([index.schluesselVon[k], index.schluesselBis[k]]).toEqual([2, 4]);
    expect([index.von[k], index.bis[k]]).toEqual([7, 13]);
    expect(inhalt(index, text, k)).toBe("a😀b");
    const n = index.naechstes[k];
    expect(text.slice(index.von[n], index.bis[n])).toBe("1");
    const kaputt = JSON_FORMAT.lesen('{"a": 1 😀}').diagnosen[0];
    expect([kaputt.von, kaputt.bis]).toEqual([8, 10]);
    expect(kaputt.meldung).toContain("😀");
  });

  it("lässt Zahlen als Rohtext", () => {
    const text = "[12345678901234567890123, 1.0, -0.5e+10, 0]";
    const index = gelesen(text);
    expect([...kinderVon(index, 0)].map((k) => inhalt(index, text, k))).toEqual(["12345678901234567890123", "1.0", "-0.5e+10", "0"]);
  });

  it("liest Skalare als Wurzel und überspringt eine BOM", () => {
    const text = '﻿ "x"';
    const index = gelesen(text);
    expect(index.art[0]).toBe(KnotenArt.text);
    expect(index.von[0]).toBe(2);
  });

  it("erlaubt JSONC mit Hinweis und Merkmal, URLs bleiben Texte", () => {
    const text = '// Kopf\n{\n  "url": "https://example.org/a//b", /* block */\n  "l": [1, 2,],\n}\n';
    const e = JSON_FORMAT.lesen(text);
    expect(e.diagnosen.filter((d) => d.schwere !== "hinweis")).toEqual([]);
    expect(e.diagnosen.filter((d) => d.schwere === "hinweis")).toHaveLength(2);
    expect(e.merkmale).toEqual({ kommentare: true, abschliessendeKommas: true });
    const index = e.index!;
    expect(inhalt(index, text, knotenZu(index, text, "/url"))).toBe("https://example.org/a//b");
    expect(index.kinder[knotenZu(index, text, "/l")]).toBe(2);
    expect(JSON_FORMAT.lesen('{"url": "http://x"}').merkmale).toEqual({ kommentare: false, abschliessendeKommas: false });
  });

  it("warnt bei doppelten Schlüsseln", () => {
    const text = '{"a": 1, "b": {"a": 2}, "a": 3}';
    const d = JSON_FORMAT.lesen(text).diagnosen;
    expect(d).toHaveLength(1);
    expect(d[0].schwere).toBe("warnung");
    expect(d[0].meldung).toContain('"a"');
    expect(text.slice(d[0].von, d[0].bis)).toBe('"a"');
    expect(d[0].von).toBe(24);
  });

  it("meldet NaN und Infinity als Fehler", () => {
    for (const t of ["[NaN]", "[Infinity]", "[-Infinity]"]) {
      const f = fehler(t);
      expect(f).toHaveLength(1);
      expect(f[0].meldung).toContain("NaN und Infinity");
    }
  });
});

describe("JSON kaputt", () => {
  it("liefert den Baum bis zur Fehlerstelle", () => {
    const text = '{"a": 1, "b": [true, }';
    const e = JSON_FORMAT.lesen(text);
    expect(e.diagnosen).toHaveLength(1);
    expect(e.diagnosen[0].von).toBe(21);
    const index = e.index!;
    expect(index.anzahl).toBe(4);
    expect(inhalt(index, text, knotenZu(index, text, "/a"))).toBe("1");
    expect(index.bis[0]).toBe(21);
  });

  it("meldet typische Fehler mit Spanne", () => {
    const fall = (t: string) => fehler(t)[0];
    expect(fall('{"a": "offen\n}').meldung).toContain("schließendes Anführungszeichen");
    expect(fall('{"a": "offen').meldung).toContain("schließendes Anführungszeichen");
    expect(fall('["\\x"]').meldung).toContain("Escape");
    expect(fall('["\\u12g4"]').meldung).toContain("Hexziffern");
    expect(fall('["a\tb"]').meldung).toContain("Steuerzeichen");
    expect(fall("[01]").meldung).toContain("führende Null");
    expect(fall("[1.]").meldung).toContain("Ungültige Zahl");
    expect(fall("[1e]").meldung).toContain("Ungültige Zahl");
    expect(fall("{'a': 1}").meldung).toContain("Schlüssel");
    expect(fall("['a']").meldung).toContain("doppelten Anführungszeichen");
    expect(fall("[undefined]").meldung).toContain("Unbekannter Wert");
    expect(fall('{"a" 1}').meldung).toContain(":");
    expect(fall("[1 2]").meldung).toContain(", oder ]");
    expect(fall("[1, /* offen").meldung).toContain("Kommentar ohne Ende");
    expect(fall("{} {}").meldung).toContain("folgt noch Text");
    expect(fall("[1,").meldung).toContain("endet zu früh");
  });

  it("gibt index null nur bei nicht lesbarem Text", () => {
    expect(JSON_FORMAT.lesen("").index).toBeNull();
    expect(JSON_FORMAT.lesen("   \n").diagnosen[0].meldung).toContain("leer");
    expect(JSON_FORMAT.lesen("hallo").index).toBeNull();
    expect(JSON_FORMAT.lesen('"offen').index).toBeNull();
    expect(JSON_FORMAT.lesen("[").index).not.toBeNull();
  });

  it("übersteht tiefe Verschachtelung ohne Ausnahme", () => {
    const tief = "[".repeat(100000);
    const e = JSON_FORMAT.lesen(tief);
    expect(e.index!.anzahl).toBe(100000);
    expect(e.diagnosen[0].meldung).toContain("endet zu früh");
    const ganz = "[".repeat(50000) + "]".repeat(50000);
    expect(JSON_FORMAT.lesen(ganz).diagnosen).toEqual([]);
  });
});

describe("JSON Zeiger", () => {
  it("maskiert / und ~ in Schlüsseln (RFC 6901)", () => {
    const text = '{"a/b": {"m~n": [10, {"~1": "x"}]}, "": 5}';
    const index = gelesen(text);
    const x = knotenZu(index, text, "/a~1b/m~0n/1/~01");
    expect(inhalt(index, text, x)).toBe("x");
    expect(zeigerVon(index, text, x)).toBe("/a~1b/m~0n/1/~01");
    expect(inhalt(index, text, knotenZu(index, text, "/"))).toBe("5");
    for (let k = 0; k < index.anzahl; k++) expect(knotenZu(index, text, zeigerVon(index, text, k))).toBe(k);
  });
});

describe("JSON wertSchreiben", () => {
  const anwenden = (text: string, zeiger: string, neu: NeuerWert): { neu: string; von: number; einfuegen: string } => {
    const { index, k } = knoten(text, zeiger);
    const e = JSON_FORMAT.lesen(text);
    const a = JSON_FORMAT.wertSchreiben(text, index, k, neu, e.merkmale);
    expect([a.von, a.bis]).toEqual([index.von[k], index.bis[k]]);
    return { neu: text.slice(0, a.von) + a.einfuegen + text.slice(a.bis), von: a.von, einfuegen: a.einfuegen };
  };

  const text = '// Kopf\n{\n  "ort": "Leipzig",   "plz": "04109", "n": 1.0,\n  "ja": false, "😀": null, "liste": [1, 2,]\n}\n';

  const faelle: [string, NeuerWert, string][] = [
    ["/ort", { art: "text", wert: 'Halle "Saale"\n\\ 😀 \u0001' }, 'Halle "Saale"\n\\ 😀 \u0001'],
    ["/plz", { art: "zahl", roh: "12345678901234567890" }, "12345678901234567890"],
    ["/n", { art: "wahrheitswert", wert: true }, "true"],
    ["/ja", { art: "nichts" }, "null"],
    ["/😀", { art: "zahl", roh: "-1.50e3" }, "-1.50e3"],
    ["/liste/1", { art: "text", wert: "zwei" }, "zwei"],
  ];

  for (const [zeiger, neu, erwartet] of faelle) {
    it(`Rundreise ${zeiger} als ${neu.art}`, () => {
      const r = anwenden(text, zeiger, neu);
      expect(r.neu.slice(0, r.von)).toBe(text.slice(0, r.von));
      const vorher = knoten(text, zeiger);
      expect(r.neu.slice(r.von + r.einfuegen.length)).toBe(text.slice(vorher.index.bis[vorher.k]));
      const e = JSON_FORMAT.lesen(r.neu);
      expect(e.diagnosen.filter((d) => d.schwere === "fehler")).toEqual([]);
      const index = e.index!;
      const k = knotenZu(index, r.neu, zeiger);
      expect(inhalt(index, r.neu, k)).toBe(erwartet);
      expect(index.art[k]).toBe({ text: KnotenArt.text, zahl: KnotenArt.zahl, wahrheitswert: KnotenArt.wahrheitswert, nichts: KnotenArt.nichts }[neu.art]);
    });
  }

  it("lehnt ungültige Zahlen und Behälter ab", () => {
    const { index } = knoten(text, "");
    for (const roh of ["01", "1.", "NaN", "Infinity", "1,5", " 1", "+1", ""]) {
      expect(() => JSON_FORMAT.wertSchreiben(text, index, knotenZu(index, text, "/n"), { art: "zahl", roh }, {})).toThrow(Formatfehler);
    }
    expect(() => JSON_FORMAT.wertSchreiben(text, index, 0, { art: "nichts" }, {})).toThrow("Ein Objekt wird hier nicht ersetzt");
    expect(() => JSON_FORMAT.wertSchreiben(text, index, knotenZu(index, text, "/liste"), { art: "nichts" }, {})).toThrow("Eine Liste");
    expect(() => JSON_FORMAT.wertSchreiben(text, index, 999, { art: "nichts" }, {})).toThrow(Formatfehler);
  });
});

describe("JSON erkennen", () => {
  it("erkennt Objekte und Listen, nicht aber NDJSON oder Fließtext", () => {
    expect(JSON_FORMAT.erkennen(' \n{"a": 1}')).toBeGreaterThan(0.8);
    expect(JSON_FORMAT.erkennen("// Kopf\n[1, 2,]")).toBeGreaterThan(0.8);
    expect(JSON_FORMAT.erkennen("hallo")).toBe(0);
    expect(JSON_FORMAT.erkennen("42")).toBe(0);
    const nd = '{"a": 1}\n{"a": 2}\n';
    expect(NDJSON_FORMAT.erkennen(nd)).toBeGreaterThan(JSON_FORMAT.erkennen(nd));
    const huebsch = '{\n  "a": 1,\n  "b": [2, 3]\n}\n';
    expect(JSON_FORMAT.erkennen(huebsch)).toBeGreaterThan(NDJSON_FORMAT.erkennen(huebsch));
  });

  it("prüft bei großen Texten nur den Anfang", () => {
    const gross = "[" + '"abcdefghij",'.repeat(200000) + "1]";
    expect(JSON_FORMAT.erkennen(gross)).toBeGreaterThan(0.8);
  });
});

describe("JSON Leistung", () => {
  leistungstest("liest etwa 5 MB deutlich unter 3 s", () => {
    const eintraege: string[] = [];
    let i = 0;
    let groesse = 0;
    while (groesse < 5_000_000) {
      const s = `{"id": ${i}, "name": "Eintrag ${i} mit \\"Escape\\" und 😀", "wert": ${i * 1.5}, "aktiv": ${i % 2 === 0}, "tags": ["a", "b", null], "pfad/x": {"tief": [${i}, ${i + 1}]}}`;
      eintraege.push(s);
      groesse += s.length + 2;
      i++;
    }
    const text = "[\n" + eintraege.join(",\n") + "\n]";
    const start = performance.now();
    const e = JSON_FORMAT.lesen(text);
    const dauer = performance.now() - start;
    console.log(`JSON: ${(text.length / 1e6).toFixed(1)} Mio. Zeichen, ${e.index!.anzahl} Knoten in ${dauer.toFixed(0)} ms`);
    expect(e.diagnosen).toEqual([]);
    expect(e.index!.kinder[0]).toBe(i);
    expect(dauer).toBeLessThan(zeitgrenze(3000));
  });
});
