// TOML: Lesen mit Spannen (Tabellen, Tabellenlisten, Punktschlüssel, eingebettete Tabellen, alle Wertformen), Erkennen,
// Schreiben an Spannen und Vergleich mit einer unabhängigen Bibliothek.

import { describe, expect, it } from "vitest";
import { parse } from "smol-toml";
import { anwenden } from "../kern/aenderung";
import { inhalt, KEIN, knotenAn, KnotenArt, schluessel, type Strukturindex } from "../kern/strukturindex";
import { knotenZu } from "../kern/pfade";
import { erkennen } from "./registrierung";
import { TOML_FORMAT } from "./toml";

/** Wert eines Knotens aus dem Index (wie die Analyse ihn liest; hier eigen, weil Formate die Analyse nicht einbinden) */
function wertAus(index: Strukturindex, text: string, k = 0): unknown {
  const art = index.art[k];
  if (art === KnotenArt.objekt || art === KnotenArt.liste) {
    const kinder: number[] = [];
    for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) kinder.push(c);
    return art === KnotenArt.liste ? kinder.map((c) => wertAus(index, text, c)) : Object.fromEntries(kinder.map((c) => [schluessel(index, text, c), wertAus(index, text, c)]));
  }
  const roh = inhalt(index, text, k);
  if (art === KnotenArt.zahl) return Number.isFinite(Number(roh)) ? Number(roh) : roh;
  if (art === KnotenArt.wahrheitswert) return roh === "true";
  return roh;
}

const TEXT = `# Hofladen
shop = "Hofladen Lindenhof"
stand = 2026-11-10T08:15:00+01:00
offen.tage = ["Di", "Fr"]   # Punktschlüssel
offen.ab = 08:00:00

[inhaber]
name = 'Ida Wendt'
plz = "01067"
punkte = 1_250
farbe = 0xFF
anteil = 6.5e-1

[[bestellungen]]
nr = "B-1"
kunde = { name = "Jonas Brandt", plz = "01067" }
bezahlt = true

[[bestellungen.positionen]]
artikel = "Honig 500 g"
preis = 7.5

[[bestellungen]]
nr = "B-2"
notiz = """
Abholung
Samstag"""
bezahlt = false
`;

describe("TOML lesen", () => {
  const r = TOML_FORMAT.lesen(TEXT);
  const index = r.index!;

  it("liest ohne Fehler und gleich wie eine unabhängige Bibliothek", () => {
    expect(r.diagnosen).toEqual([]);
    const wert = wertAus(index, TEXT) as Record<string, unknown>;
    const vergleich = JSON.parse(JSON.stringify(parse(TEXT), (_, v) => (typeof v === "object" && v instanceof Date ? v.toISOString() : v)));
    expect(Object.keys(wert)).toEqual(["shop", "stand", "offen", "inhaber", "bestellungen"]);
    expect(wert.inhaber).toEqual({ name: "Ida Wendt", plz: "01067", punkte: 1250, farbe: 255, anteil: 0.65 });
    expect(wert.bestellungen).toEqual(vergleich.bestellungen);
    expect(wert.offen).toEqual({ tage: ["Di", "Fr"], ab: "08:00:00" });
    expect(wert.stand).toBe("2026-11-10T08:15:00+01:00");
  });

  it("Spannen: Tabelle von der Kopfzeile bis zum Ende ihres Abschnitts, Werte genau", () => {
    const inhaber = knotenZu(index, TEXT, "/inhaber");
    expect(TEXT.slice(index.von[inhaber], index.bis[inhaber])).toBe(`[inhaber]
name = 'Ida Wendt'
plz = "01067"
punkte = 1_250
farbe = 0xFF
anteil = 6.5e-1`);
    const b1 = knotenZu(index, TEXT, "/bestellungen/0");
    expect(TEXT.slice(index.von[b1], index.bis[b1])).toMatch(/^\[\[bestellungen\]\][\s\S]*preis = 7\.5$/);
    const name = knotenZu(index, TEXT, "/inhaber/name");
    expect([TEXT.slice(index.von[name], index.bis[name]), inhalt(index, TEXT, name), schluessel(index, TEXT, name)]).toEqual(["'Ida Wendt'", "Ida Wendt", "name"]);
    const notiz = knotenZu(index, TEXT, "/bestellungen/1/notiz");
    expect(inhalt(index, TEXT, notiz)).toBe("Abholung\nSamstag");
    expect(index.art[knotenZu(index, TEXT, "/bestellungen")]).toBe(KnotenArt.liste);
    expect(knotenAn(index, TEXT.indexOf("Honig"))).toBe(knotenZu(index, TEXT, "/bestellungen/0/positionen/0/artikel"));
  });

  it("meldet Fehler je Zeile und liest danach weiter", () => {
    const t = 'a = 1\nb = \nc = "offen\n[x]\nx = 1\nx = 2\nd = wahr\ne = 3\n';
    const f = TOML_FORMAT.lesen(t);
    expect(f.diagnosen.map((d) => d.meldung)).toEqual(["Hier fehlt ein Wert", "Text ohne schließendes Anführungszeichen", "Doppelter Schlüssel x", "Unbekannter Wert wahr"]);
    expect(wertAus(f.index!, t)).toEqual({ a: 1, x: { x: 1, e: 3 } });
  });

  it("weist doppelte Tabellen und Widersprüche ab", () => {
    expect(TOML_FORMAT.lesen("[a]\n[a]\n").diagnosen[0].meldung).toBe("Die Tabelle a gibt es schon");
    expect(TOML_FORMAT.lesen("a = 1\n[a.b]\n").diagnosen[0].meldung).toBe("a ist ein Wert, keine Tabelle");
  });

  it("Escapes, wörtliche Texte, besondere Zahlen", () => {
    const t = `a = "Zeile\\nzwei \\u00e4"\nb = 'C:\\pfad'\nc = '''\nroh \\n'''\nd = +inf\ne = 0o17\nf = 1979-05-27 07:32:00Z\n"g h" = 1\n`;
    const f = TOML_FORMAT.lesen(t);
    expect(f.diagnosen).toEqual([]);
    expect(wertAus(f.index!, t)).toEqual({ a: "Zeile\nzwei ä", b: "C:\\pfad", c: "roh \\n", d: "Infinity", e: 15, f: "1979-05-27 07:32:00Z", "g h": 1 });
  });
});

describe("TOML erkennen", () => {
  it("TOML gewinnt bei Zuweisungen und Kopfzeilen, JSON und YAML bleiben, was sie sind", () => {
    expect(erkennen(TEXT).kennung).toBe("toml");
    expect(erkennen('[server]\nport = 8080\n').kennung).toBe("toml");
    expect(erkennen('{"a": 1}').kennung).toBe("json");
    expect(erkennen("a: 1\nb: 2\n").kennung).toBe("yaml");
    expect(erkennen("[1, 2]").kennung).toBe("json");
  });
});

describe("TOML schreiben", () => {
  const r = TOML_FORMAT.lesen(TEXT);
  const index = r.index!;
  const aendern = (a: readonly { von: number; bis: number; einfuegen: string }[]) => anwenden(TEXT, a).text;

  it("ersetzt genau einen Wert, Kommentare bleiben", () => {
    const k = knotenZu(index, TEXT, "/inhaber/plz");
    const neu = aendern([TOML_FORMAT.wertSchreiben(TEXT, index, k, { art: "text", wert: 'O"Brien' }, r.merkmale)]);
    expect(neu).toContain('plz = "O\\"Brien"');
    expect(neu).toContain("# Punktschlüssel");
    expect(TOML_FORMAT.lesen(neu).diagnosen).toEqual([]);
    expect(() => TOML_FORMAT.wertSchreiben(TEXT, index, k, { art: "nichts" }, r.merkmale)).toThrow(/kein null/);
  });

  it("entfernt ein Element einer Tabellenliste samt Untertabellen", () => {
    const liste = knotenZu(index, TEXT, "/bestellungen");
    const neu = aendern(TOML_FORMAT.eintraegeEntfernen(TEXT, index, liste, [0]));
    expect(neu).not.toContain("B-1");
    expect(neu).not.toContain("Honig");
    const w = wertAus(TOML_FORMAT.lesen(neu).index!, neu) as { bestellungen: { nr: string }[] };
    expect(w.bestellungen.map((b) => b.nr)).toEqual(["B-2"]);
  });

  it("entfernt ein Feld aus allen Elementen, in Abschnitten zeilenweise", () => {
    const liste = knotenZu(index, TEXT, "/bestellungen");
    const neu = aendern(TOML_FORMAT.spalteEntfernen(TEXT, index, liste, "bezahlt"));
    expect(neu).not.toContain("bezahlt");
    expect(TOML_FORMAT.lesen(neu).diagnosen).toEqual([]);
    const inline = 'l = [{ a = 1, b = 2 }, { a = 3, b = 4 }]\n';
    const ix = TOML_FORMAT.lesen(inline).index!;
    expect(anwenden(inline, TOML_FORMAT.spalteEntfernen(inline, ix, knotenZu(ix, inline, "/l"), "a")).text).toBe("l = [{ b = 2 }, { b = 4 }]\n");
    expect(anwenden(inline, TOML_FORMAT.eintraegeEntfernen(inline, ix, knotenZu(ix, inline, "/l"), [0])).text).toBe("l = [{ a = 3, b = 4 }]\n");
  });
});

describe("Beispiel webshop.toml", () => {
  it("liest ohne Fehler und gleich wie eine unabhängige Bibliothek", async () => {
    const { readFileSync } = await import("node:fs");
    const text = readFileSync(new URL("../../../pruefdaten/webshop.toml", import.meta.url), "utf8");
    const r = TOML_FORMAT.lesen(text);
    expect(r.diagnosen).toEqual([]);
    expect(erkennen(text, "webshop.toml").kennung).toBe("toml");
    const vergleich = JSON.parse(JSON.stringify(parse(text), (_, v) => (typeof v === "object" && v instanceof Date ? "datum" : v)));
    const w = wertAus(r.index!, text) as Record<string, unknown>;
    expect(w.versand).toEqual(vergleich.versand);
    expect(w.zahlung).toEqual(vergleich.zahlung);
  });
});
