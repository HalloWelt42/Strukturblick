// Bausteine der Befehlspalette: unscharfe Suche, Hervorhebung, Tastenkürzel, Ordnung der Einträge.

import { describe, expect, it } from "vitest";
import { abschnitte, unscharf } from "./suche";
import { kappen, passt, type Tastendruck } from "./tasten";
import { ordnen, type Paletteneintrag } from "./eintraege";

describe("unscharf", () => {
  it("findet zusammenhängend und bevorzugt den Wortanfang", () => {
    const anfang = unscharf("tab", "Tabelle")!;
    const mitte = unscharf("tab", "Ergebnis als Tabelle")!;
    const innen = unscharf("tab", "Notablage")!;
    expect(anfang.stellen).toEqual([0, 1, 2]);
    expect(mitte.stellen).toEqual([13, 14, 15]);
    expect(anfang.punkte).toBeGreaterThan(mitte.punkte);
    expect(mitte.punkte).toBeGreaterThan(innen.punkte);
  });

  it("findet Buchstabenfolgen über Wortanfänge", () => {
    const t = unscharf("tabb", "Tastenkürzel bearbeiten")!;
    expect(t).not.toBeNull();
    expect(t.stellen).toContain(13);
    expect(unscharf("xyz", "Tabelle")).toBeNull();
  });

  it("verlangt jedes Wort und ignoriert groß und klein", () => {
    expect(unscharf("pfad JQ", "Pfad als jq kopieren")).not.toBeNull();
    expect(unscharf("pfad xml", "Pfad als jq kopieren")).toBeNull();
    expect(unscharf("GRÖSSE", "Schrift: größe")).toBeNull();
    expect(unscharf("größe", "Schrift: Größe")?.stellen).toEqual([9, 10, 11, 12, 13]);
  });

  it("lässt in Beschreibungen nur zusammenhängende Stücke gelten", () => {
    expect(unscharf("tab", "Bleibt in der Ablage", false)).toBeNull();
    expect(unscharf("ablage", "Bleibt in der Ablage", false)).not.toBeNull();
  });

  it("zerlegt für die Hervorhebung", () => {
    expect(abschnitte("Tabelle", [0, 1, 2])).toEqual([{ text: "Tab", getroffen: true }, { text: "elle", getroffen: false }]);
  });
});

const druck = (teil: Partial<Tastendruck>): Tastendruck => ({ key: "", code: "", metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...teil });

describe("Tastenkürzel", () => {
  it("unterscheidet Mac und andere", () => {
    const k = { taste: "k", befehl: true } as const;
    expect(passt(k, druck({ key: "k", metaKey: true }), true)).toBe(true);
    expect(passt(k, druck({ key: "k", ctrlKey: true }), true)).toBe(false);
    expect(passt(k, druck({ key: "k", ctrlKey: true }), false)).toBe(true);
    expect(passt(k, druck({ key: "k", metaKey: true, shiftKey: true }), true)).toBe(false);
  });

  it("erkennt Alt-Kürzel an der Lage der Taste", () => {
    const n = { taste: "n", befehl: true, alt: true } as const;
    expect(passt(n, druck({ key: "~", code: "KeyN", metaKey: true, altKey: true }), true)).toBe(true);
    expect(passt({ taste: "2", befehl: true, alt: true }, druck({ key: "@", code: "Digit2", metaKey: true, altKey: true }), true)).toBe(true);
  });

  it("folgt der Belegung bei Buchstaben ohne Alt (Z auf deutscher Tastatur)", () => {
    expect(passt({ taste: "z", befehl: true }, druck({ key: "z", code: "KeyY", metaKey: true }), true)).toBe(true);
  });

  it("zeigt Kappen je Plattform", () => {
    expect(kappen({ taste: "z", befehl: true, umschalt: true }, true)).toEqual(["⇧", "⌘", "Z"]);
    expect(kappen({ taste: "z", befehl: true, umschalt: true }, false)).toEqual(["Strg", "Umschalt", "Z"]);
    expect(kappen({ taste: "ArrowDown" }, true)).toEqual(["↓"]);
  });
});

const eintrag = (kennung: string, gruppe: Paletteneintrag["gruppe"], titel: string, beschreibung = ""): Paletteneintrag => ({
  kennung, gruppe, titel, beschreibung, symbol: "fa-circle", ausfuehren: () => {},
});

describe("ordnen", () => {
  const alle = [
    eintrag("befehl:ablegen", "befehl", "Jetzt ablegen"),
    eintrag("befehl:tabelle-laden", "befehl", "Tabelle herunterladen"),
    eintrag("ansicht:tabelle", "ansicht", "Tabelle", "Gleich aufgebaute Listen"),
    eintrag("dokument:1", "dokument", "tarife-tabelle.json"),
    eintrag("dokument:2", "dokument", "kunden.csv", "Kundenimport"),
  ];

  it("zeigt ohne Anfrage zuletzt benutzte oben und sonst alles in Quellreihenfolge", () => {
    const g = ordnen(alle, "", ["dokument:2"]);
    expect(g.map((x) => x.titel)).toEqual(["Zuletzt benutzt", "Befehle", "Dokumente", "Ansichten"]);
    expect(g[0].funde.map((f) => f.eintrag.kennung)).toEqual(["dokument:2"]);
    expect(g[1].funde.map((f) => f.eintrag.kennung)).toEqual(["befehl:ablegen", "befehl:tabelle-laden"]);
    expect(g[2].funde.map((f) => f.eintrag.kennung)).toEqual(["dokument:1"]);
  });

  it("stellt die Gruppe mit dem besten Treffer vorn und findet auch über die Beschreibung", () => {
    const g = ordnen(alle, "tab", []);
    expect(g.map((x) => x.titel)).toEqual(["Ansichten", "Befehle", "Dokumente"]);
    expect(ordnen(alle, "", []).map((x) => x.titel)).toEqual(["Befehle", "Dokumente", "Ansichten"]);
    expect(ordnen(alle, "kundenimp", [])[0].funde[0]).toMatchObject({ eintrag: { kennung: "dokument:2" }, stellen: [] });
  });

  it("hält die Grenzen ein und lässt Unbekanntes aus der Erinnerung weg", () => {
    const viele = Array.from({ length: 20 }, (_, i) => eintrag(`dokument:${i}`, "dokument", `datei-${i}.json`));
    const g = ordnen(viele, "", ["dokument:weg", "dokument:3"], { zuletzt: 5, jeGruppe: 4 });
    expect(g[0].funde.map((f) => f.eintrag.kennung)).toEqual(["dokument:3"]);
    expect(g[1].funde).toHaveLength(4);
  });
});
