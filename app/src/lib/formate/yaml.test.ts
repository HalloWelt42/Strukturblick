import { describe, expect, it, vi } from "vitest";
import { inhalt, KEIN, KnotenArt, schluessel, type Strukturindex } from "../kern/strukturindex";
import { knotenZu, zeigerVon } from "../kern/pfade";
import { Formatfehler, type Leseergebnis, type NeuerWert } from "./vertrag";
import { YAML_FORMAT } from "./yaml";

// Im Worker wählt Vite die Browser-Fassung der Bibliothek (Bedingung "default"). Vitest wählt in Node die Fassung
// "node", die bei jedem Zeichen-Baustein process.env abfragt und dadurch etwa dreimal langsamer liest. Die Tests
// nutzen deshalb dieselbe Fassung wie der Betrieb; der Quelltext ist sonst gleich.
vi.mock("yaml", async () => {
  const pfad = "../../../node_modules/yaml/browser/dist/index.js";
  return (await import(/* @vite-ignore */ pfad)) as typeof import("yaml");
});

type Gelesen = Leseergebnis & { readonly index: Strukturindex };

function lies(text: string): Gelesen {
  const e = YAML_FORMAT.lesen(text);
  if (e.index === null) throw new Error("kein Index");
  return { ...e, index: e.index };
}

function knoten(g: Gelesen, text: string, zeiger: string): number {
  const k = knotenZu(g.index, text, zeiger);
  expect(k, `Zeiger ${zeiger}`).not.toBe(KEIN);
  return k;
}

const spanne = (g: Gelesen, text: string, k: number): string => text.slice(g.index.von[k], g.index.bis[k]);
const fehler = (g: Leseergebnis) => g.diagnosen.filter((d) => d.schwere === "fehler");
const hinweise = (g: Leseergebnis) => g.diagnosen.filter((d) => d.schwere === "hinweis");

describe("YAML lesen", () => {
  it("liest Objekt, Liste und Typen nach dem Core-Schema", () => {
    const t = "name: Leipzig\nplz: \"04109\"\neinwohner: 620000\nfläche: 297.8\naktiv: true\nleer:\nnichts: ~\nauch: null\nlisten:\n  - a\n  - 2\n";
    const g = lies(t);
    expect(g.diagnosen).toEqual([]);
    expect(g.index.art[0]).toBe(KnotenArt.objekt);
    const art = (z: string) => g.index.art[knoten(g, t, z)];
    expect(art("/name")).toBe(KnotenArt.text);
    expect(art("/plz")).toBe(KnotenArt.text);
    expect(art("/einwohner")).toBe(KnotenArt.zahl);
    expect(art("/fläche")).toBe(KnotenArt.zahl);
    expect(art("/aktiv")).toBe(KnotenArt.wahrheitswert);
    expect(art("/leer")).toBe(KnotenArt.nichts);
    expect(art("/nichts")).toBe(KnotenArt.nichts);
    expect(art("/auch")).toBe(KnotenArt.nichts);
    expect(art("/listen")).toBe(KnotenArt.liste);
    expect(art("/listen/1")).toBe(KnotenArt.zahl);

    const plz = knoten(g, t, "/plz");
    expect(spanne(g, t, plz)).toBe('"04109"');
    expect(inhalt(g.index, t, plz)).toBe("04109");
    expect(g.index.dekodiert.has(plz)).toBe(false);
    expect(t.slice(g.index.schluesselVon[plz], g.index.schluesselBis[plz])).toBe("plz");
    expect(schluessel(g.index, t, plz)).toBe("plz");
    expect(spanne(g, t, knoten(g, t, "/nichts"))).toBe("~");
    const leer = knoten(g, t, "/leer");
    expect(g.index.von[leer]).toBe(g.index.bis[leer]);
    expect(g.index.kinder[knoten(g, t, "/listen")]).toBe(2);
    expect(g.merkmale.dokumente).toBe(1);
  });

  it("lässt Zahlen als Rohtext", () => {
    const t = "gross: 123456789012345678901234567890\neins: 1.0\nhex: 0x1F\nunendlich: -.inf\nexp: 1e3\n";
    const g = lies(t);
    for (const [z, roh] of [["/gross", "123456789012345678901234567890"], ["/eins", "1.0"], ["/hex", "0x1F"], ["/unendlich", "-.inf"], ["/exp", "1e3"]]) {
      const k = knoten(g, t, z);
      expect(g.index.art[k]).toBe(KnotenArt.zahl);
      expect(inhalt(g.index, t, k)).toBe(roh);
      expect(t.slice(g.index.inhaltVon[k], g.index.inhaltBis[k])).toBe(roh);
    }
  });

  it("dekodiert Escapes, einfache Anführungszeichen, gefaltete und Block-Texte", () => {
    const t = "a: \"Zeile\\nzwei \\u00e4\"\nb: 'O''Brien'\nc: |\n  eins\n  zwei\nd: >-\n  gefaltet\n  weiter\ne: mehr\n  zeilig\n\"f\\tg\": 1\n";
    const g = lies(t);
    expect(fehler(g)).toEqual([]);
    const a = knoten(g, t, "/a");
    expect(inhalt(g.index, t, a)).toBe("Zeile\nzwei ä");
    expect(t.slice(g.index.inhaltVon[a], g.index.inhaltBis[a])).toBe("Zeile\\nzwei \\u00e4");
    expect(inhalt(g.index, t, knoten(g, t, "/b"))).toBe("O'Brien");
    const c = knoten(g, t, "/c");
    expect(g.index.art[c]).toBe(KnotenArt.text);
    expect(inhalt(g.index, t, c)).toBe("eins\nzwei\n");
    expect(spanne(g, t, c).startsWith("|")).toBe(true);
    expect(inhalt(g.index, t, knoten(g, t, "/d"))).toBe("gefaltet weiter");
    expect(inhalt(g.index, t, knoten(g, t, "/e"))).toBe("mehr zeilig");
    const f = knoten(g, t, "/f\tg");
    expect(t.slice(g.index.schluesselVon[f], g.index.schluesselBis[f])).toBe('"f\\tg"');
    expect(schluessel(g.index, t, f)).toBe("f\tg");
  });

  it("zeigt Aliase als Knoten der Art des Ziels mit eigener Spanne", () => {
    const t = "basis: &b 42\nvorgabe: &v\n  x: 1\nzahl: *b\nkopie: *v\n";
    const g = lies(t);
    expect(fehler(g)).toEqual([]);
    const zahl = knoten(g, t, "/zahl");
    expect(g.index.art[zahl]).toBe(KnotenArt.zahl);
    expect(spanne(g, t, zahl)).toBe("*b");
    expect(inhalt(g.index, t, zahl)).toBe("42");
    const kopie = knoten(g, t, "/kopie");
    expect(g.index.art[kopie]).toBe(KnotenArt.objekt);
    expect(spanne(g, t, kopie)).toBe("*v");
    expect(g.index.kinder[kopie]).toBe(0);
    expect(spanne(g, t, knoten(g, t, "/basis"))).toBe("42");
    const h = hinweise(g);
    expect(h).toHaveLength(2);
    expect(h[0].meldung).toContain("&b");
    expect(t.slice(h[0].von, h[0].bis)).toBe("*b");
  });

  it("meldet einen Alias ohne Anker als Fehler", () => {
    const t = "a: *fehlt\nb: 1\n";
    const g = lies(t);
    expect(fehler(g)).toHaveLength(1);
    expect(fehler(g)[0].meldung).toContain("&fehlt");
    expect(t.slice(fehler(g)[0].von, fehler(g)[0].bis)).toBe("*fehlt");
    expect(g.index.art[knoten(g, t, "/b")]).toBe(KnotenArt.zahl);
  });

  it("macht aus mehreren Dokumenten eine Liste", () => {
    const t = "a: 1\n---\n- x\n---\nletzt\n";
    const g = lies(t);
    expect(fehler(g)).toEqual([]);
    expect(g.merkmale.dokumente).toBe(3);
    expect(g.index.art[0]).toBe(KnotenArt.liste);
    expect(g.index.kinder[0]).toBe(3);
    expect(inhalt(g.index, t, knoten(g, t, "/0/a"))).toBe("1");
    expect(inhalt(g.index, t, knoten(g, t, "/1/0"))).toBe("x");
    expect(inhalt(g.index, t, knoten(g, t, "/2"))).toBe("letzt");
    expect(hinweise(g).some((d) => d.meldung.includes("3 Dokumente"))).toBe(true);
  });

  it("ein einzelnes Dokument mit --- bleibt ein Dokument", () => {
    const g = lies("---\na: 1\n");
    expect(g.index.art[0]).toBe(KnotenArt.objekt);
    expect(g.merkmale.dokumente).toBe(1);
  });

  it("führt Schlüssel, die keine Texte sind, als Rohtext mit Hinweis", () => {
    const t = "1: eins\n? [a, b]\n: liste\n~: nichts\n";
    const g = lies(t);
    expect(fehler(g)).toEqual([]);
    expect(inhalt(g.index, t, knoten(g, t, "/1"))).toBe("eins");
    expect(inhalt(g.index, t, knoten(g, t, "/[a, b]"))).toBe("liste");
    expect(inhalt(g.index, t, knoten(g, t, "/~0"))).toBe("nichts");
    expect(hinweise(g)).toHaveLength(3);
  });

  it("warnt bei doppelten Schlüsseln und liefert beide", () => {
    const t = "a: 1\nb: 2\na: 3\n";
    const g = lies(t);
    const w = g.diagnosen.filter((d) => d.schwere === "warnung");
    expect(w).toHaveLength(1);
    expect(w[0].von).toBe(10);
    expect(g.index.kinder[0]).toBe(3);
    expect(inhalt(g.index, t, knoten(g, t, "/a"))).toBe("1");
  });

  it("zählt Positionen in UTF-16 (Emojis)", () => {
    const t = "😀: \"😀x\"\nb: 🎉\n";
    const g = lies(t);
    const k = knoten(g, t, "/😀");
    expect(g.index.schluesselVon[k]).toBe(0);
    expect(g.index.schluesselBis[k]).toBe(2);
    expect(g.index.von[k]).toBe(4);
    expect(g.index.bis[k]).toBe(9);
    expect(inhalt(g.index, t, k)).toBe("😀x");
    const b = knoten(g, t, "/b");
    expect(spanne(g, t, b)).toBe("🎉");
  });

  it("baut Zeiger mit / und ~ in Schlüsseln", () => {
    const t = "\"a/b\":\n  c~d: 1\nliste:\n  - {x: 2}\n";
    const g = lies(t);
    const k = knoten(g, t, "/a~1b/c~0d");
    expect(zeigerVon(g.index, t, k)).toBe("/a~1b/c~0d");
    const x = knoten(g, t, "/liste/0/x");
    expect(zeigerVon(g.index, t, x)).toBe("/liste/0/x");
    expect(inhalt(g.index, t, x)).toBe("2");
  });
});

describe("YAML kaputt", () => {
  it("meldet ein offenes Anführungszeichen mit Spanne und liefert den Baum", () => {
    const t = "a: 1\nb: \"offen\nc: 2\n";
    const g = lies(t);
    expect(fehler(g).length).toBeGreaterThan(0);
    for (const d of g.diagnosen) {
      expect(d.von).toBeGreaterThanOrEqual(0);
      expect(d.bis).toBeLessThanOrEqual(t.length);
      expect(d.meldung).not.toMatch(/[a-z]+ing\b/);
    }
    expect(inhalt(g.index, t, knoten(g, t, "/a"))).toBe("1");
  });

  it("meldet falsche Einrückung deutsch", () => {
    const t = "a:\n  b: 1\n c: 2\n";
    const g = lies(t);
    expect(fehler(g)[0].meldung).toBe("Falsche Einrückung");
    expect(inhalt(g.index, t, knoten(g, t, "/a/b"))).toBe("1");
  });

  it("wirft bei wirrem Text nie", () => {
    for (const t of [": : :\n\t- [", "a: [1, 2\nb: {", "- a\nb: 1", "&a *a: &b", "\"", "%YAML 9\n--- |\n x\n ...", "\u0000\u0001", "? ? ?"]) {
      const e = YAML_FORMAT.lesen(t);
      expect(e.index).not.toBeNull();
      for (const d of e.diagnosen) {
        expect(d.von).toBeLessThanOrEqual(d.bis);
        expect(d.bis).toBeLessThanOrEqual(t.length);
      }
    }
  });

  it("liest leeren Text als nichts", () => {
    const g = lies("");
    expect(g.index.art[0]).toBe(KnotenArt.nichts);
    expect(g.diagnosen).toEqual([]);
  });
});

describe("YAML erkennen", () => {
  it("erkennt Schlüsselzeilen und Listen", () => {
    expect(YAML_FORMAT.erkennen("name: a\nort: b\n# Kommentar\nliste:\n  - x\n")).toBeGreaterThan(0.6);
    expect(YAML_FORMAT.erkennen("- a\n- b\n")).toBeGreaterThan(0.6);
    expect(YAML_FORMAT.erkennen("---\ntext: |\n  freie Zeile ohne Doppelpunkt\n  noch eine\n")).toBeGreaterThan(0.6);
  });

  it("lässt JSON und NDJSON gewinnen", () => {
    expect(YAML_FORMAT.erkennen('{\n  "a": 1,\n  "b": [1, 2]\n}\n')).toBeLessThanOrEqual(0.2);
    expect(YAML_FORMAT.erkennen('{"a": 1}\n{"a": 2}\n')).toBeLessThanOrEqual(0.2);
    expect(YAML_FORMAT.erkennen("[1, 2, 3]")).toBeLessThanOrEqual(0.2);
  });

  it("gibt CSV höchstens 0,1", () => {
    expect(YAML_FORMAT.erkennen("name,ort,plz\nAnna,Leipzig,04109\nBen,Halle,06108\n")).toBeLessThanOrEqual(0.1);
    expect(YAML_FORMAT.erkennen("name;zeit\nAnna;12:30\n")).toBeLessThanOrEqual(0.1);
  });
});

/** Wert schreiben, neu lesen und den Wert an derselben Stelle zurückgeben. */
function rundreise(text: string, zeiger: string, neu: NeuerWert) {
  const g = lies(text);
  const k = knoten(g, text, zeiger);
  const a = YAML_FORMAT.wertSchreiben(text, g.index, k, neu, g.merkmale);
  expect(a.von).toBe(g.index.von[k]);
  expect(a.bis).toBe(g.index.bis[k]);
  const neuText = text.slice(0, a.von) + a.einfuegen + text.slice(a.bis);
  expect(neuText.slice(0, a.von)).toBe(text.slice(0, a.von));
  expect(neuText.slice(a.von + a.einfuegen.length)).toBe(text.slice(a.bis));
  const n = lies(neuText);
  expect(fehler(n)).toEqual([]);
  const k2 = knoten(n, neuText, zeiger);
  return { neuText, einfuegen: a.einfuegen, art: n.index.art[k2], inhalt: inhalt(n.index, neuText, k2) };
}

describe("YAML wertSchreiben", () => {
  const t = "a: alt\nq1: 'einfach'\nq2: \"doppelt\"\nz: 1\nleer:\nk: # Kommentar\nfluss: [x, y]\nnull: ~\n";

  it("schreibt einfache Texte ohne Anführungszeichen", () => {
    const r = rundreise(t, "/a", { art: "text", wert: "Leipzig Süd" });
    expect(r.einfuegen).toBe("Leipzig Süd");
    expect(r.art).toBe(KnotenArt.text);
    expect(r.inhalt).toBe("Leipzig Süd");
  });

  it("setzt doppelte Anführungszeichen, wo der Text sonst etwas anderes bedeutet", () => {
    for (const wert of ["true", "123", "null", "1.5", "yes", "~", "", "#kein Kommentar", "a: b", "a #b", "*x", "- a", " vorn", "zwei\nZeilen", "2024-01-02", "Ende:"]) {
      const r = rundreise(t, "/a", { art: "text", wert });
      expect(r.einfuegen.startsWith('"'), wert).toBe(true);
      expect(r.art, wert).toBe(KnotenArt.text);
      expect(r.inhalt, wert).toBe(wert);
    }
  });

  it("erhält einfache und doppelte Anführungszeichen", () => {
    const e = rundreise(t, "/q1", { art: "text", wert: "O'Brien" });
    expect(e.einfuegen).toBe("'O''Brien'");
    expect(e.inhalt).toBe("O'Brien");
    const d = rundreise(t, "/q2", { art: "text", wert: 'sagt "hallo"\n\tund 😀' });
    expect(d.einfuegen).toBe('"sagt \\"hallo\\"\\n\\tund 😀"');
    expect(d.inhalt).toBe('sagt "hallo"\n\tund 😀');
    const umbruch = rundreise(t, "/q1", { art: "text", wert: "zwei\nZeilen" });
    expect(umbruch.einfuegen.startsWith('"')).toBe(true);
    expect(umbruch.inhalt).toBe("zwei\nZeilen");
  });

  it("schreibt Zahlen roh, Wahrheitswerte und null", () => {
    const z = rundreise(t, "/a", { art: "zahl", roh: "123456789012345678901234567890" });
    expect(z.art).toBe(KnotenArt.zahl);
    expect(z.inhalt).toBe("123456789012345678901234567890");
    expect(rundreise(t, "/q2", { art: "zahl", roh: "1.0" }).inhalt).toBe("1.0");
    const w = rundreise(t, "/z", { art: "wahrheitswert", wert: false });
    expect(w.art).toBe(KnotenArt.wahrheitswert);
    expect(w.einfuegen).toBe("false");
    const n = rundreise(t, "/z", { art: "nichts" });
    expect(n.art).toBe(KnotenArt.nichts);
    expect(n.einfuegen).toBe("null");
    expect(rundreise(t, "/null", { art: "nichts" }).einfuegen).toBe("~");
  });

  it("füllt leere Werte mit Abstand, auch vor Kommentaren", () => {
    const l = rundreise(t, "/leer", { art: "zahl", roh: "5" });
    expect(l.neuText).toContain("leer: 5\n");
    expect(l.art).toBe(KnotenArt.zahl);
    const k = rundreise(t, "/k", { art: "text", wert: "wert" });
    expect(k.neuText).toContain("k: wert # Kommentar\n");
    expect(k.inhalt).toBe("wert");
  });

  it("zitiert Kommas und Klammern in Klammerschreibweise", () => {
    const r = rundreise(t, "/fluss/0", { art: "text", wert: "a, b" });
    expect(r.einfuegen).toBe('"a, b"');
    expect(r.inhalt).toBe("a, b");
    expect(rundreise(t, "/fluss/1", { art: "text", wert: "frei" }).einfuegen).toBe("frei");
  });

  it("schreibt in mehreren Dokumenten", () => {
    const r = rundreise("a: 1\n---\nb: 2\n", "/1/b", { art: "text", wert: "x" });
    expect(r.neuText).toBe("a: 1\n---\nb: x\n");
  });

  it("lehnt Block-Texte, Aliase, Behälter und falsche Zahlen ab", () => {
    const s = "blk: |\n  x\nanker: &a 1\nalias: *a\nobj:\n  x: 1\n";
    const g = lies(s);
    const schreib = (z: string, neu: NeuerWert) => () => YAML_FORMAT.wertSchreiben(s, g.index, knoten(g, s, z), neu, g.merkmale);
    expect(schreib("/blk", { art: "text", wert: "y" })).toThrow(/Block-Text/);
    expect(schreib("/alias", { art: "zahl", roh: "2" })).toThrow(/Alias/);
    expect(schreib("/obj", { art: "text", wert: "y" })).toThrow(Formatfehler);
    expect(schreib("/anker", { art: "zahl", roh: "1.234,50" })).toThrow(/keine Zahl/);
  });

  it("achtet auf Typangaben vor dem Wert", () => {
    const s = "a: !!str 12\nb: &x !!str 13\n";
    const g = lies(s);
    expect(() => YAML_FORMAT.wertSchreiben(s, g.index, knoten(g, s, "/a"), { art: "zahl", roh: "5" }, g.merkmale)).toThrow(/!!str/);
    const r = rundreise(s, "/b", { art: "text", wert: "neu" });
    expect(r.neuText).toBe("a: !!str 12\nb: &x !!str neu\n");
    expect(rundreise("wow !ja: 5\n", "/wow !ja", { art: "text", wert: "x" }).neuText).toBe("wow !ja: x\n");
  });
});

describe("YAML mit Kommentaren und Ankern", () => {
  it("ändert einen Wert und lässt Kommentare und Anker Byte für Byte stehen", () => {
    const t = [
      "# Einstellungen für den Dienst",
      "standard: &standard   # Vorgaben, unten wiederverwendet",
      "  zeitlimit: 30  # Sekunden",
      "  wiederholen: true",
      "dienste:",
      "  - name: \"web\" # Hauptdienst",
      "    <<: *standard",
      "    port: 8080   # öffentlich",
      "  - name: 'api'",
      "    einstellungen: *standard",
      "",
    ].join("\n");
    const r = rundreise(t, "/dienste/0/port", { art: "zahl", roh: "9090" });
    const alt = t.split("\n");
    const neu = r.neuText.split("\n");
    expect(neu).toHaveLength(alt.length);
    for (let i = 0; i < alt.length; i++) {
      if (i === 7) expect(neu[i]).toBe("    port: 9090   # öffentlich");
      else expect(neu[i]).toBe(alt[i]);
    }
    const n = rundreise(r.neuText, "/dienste/1/name", { art: "text", wert: "api-2" });
    expect(n.neuText).toBe(r.neuText.replace("'api'", "'api-2'"));
    expect(n.neuText).toContain("&standard   # Vorgaben, unten wiederverwendet");
    expect(n.neuText).toContain("einstellungen: *standard");
  });
});

describe("YAML Leistung", () => {
  // YAML-Dateien sind meist Konfigurationen weit unter 1 MB. Die Bibliothek yaml braucht für 5 MB mehrere Sekunden
  // (11.11.2026 gemessen: 6,6 s bei Rechnerlast 10); das Lesen läuft im Worker, die Oberfläche bleibt bedienbar.
  // Grenze daher für 1 MB; 5 MB wird nur gemessen und ausgegeben (STB-3, Kommentar am Ticket).
  function erzeugen(ziel: number): string {
    const teile: string[] = ["einträge:\n"];
    let laenge = 0;
    for (let i = 0; laenge < ziel; i++) {
      const z = `  - id: ${i}\n    name: "Eintrag ${i}" # Kommentar\n    wert: ${i * 1.5}\n    aktiv: ${i % 2 === 0}\n    tags: [a, b, c]\n`;
      teile.push(z);
      laenge += z.length;
    }
    return teile.join("");
  }
  function messen(text: string): number {
    const start = performance.now();
    const e = YAML_FORMAT.lesen(text);
    const dauer = performance.now() - start;
    console.log(`YAML: ${(text.length / 1e6).toFixed(1)} MB in ${dauer.toFixed(0)} ms, ${e.index?.anzahl} Knoten`);
    expect(e.index).not.toBeNull();
    expect(fehler(e)).toEqual([]);
    return dauer;
  }
  it("liest 1 MB in unter 2 s", () => {
    expect(messen(erzeugen(1_000_000))).toBeLessThan(2000);
  });
  it("liest 5 MB überhaupt (nur gemessen)", () => {
    messen(erzeugen(5_000_000));
  }, 30_000);
});
