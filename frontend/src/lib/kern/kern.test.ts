import { describe, expect, it } from "vitest";
import { anwenden, abbilden } from "./aenderung";
import { IndexBauer, KnotenArt, KEIN, inhalt, knotenAn, type Strukturindex } from "./strukturindex";
import { knotenZu, schreiben, teileAus, zeigerAus, zeigerVon, musterJq } from "./pfade";
import { Sitzung } from "./sitzung";
import type { Analyse } from "./befehl";
import { Formatfehler, type Format } from "./format";

describe("Textänderungen", () => {
  it("wendet an und kehrt um", () => {
    const alt = "Hallo Welt, hallo Mond";
    const a = anwenden(alt, [{ von: 6, bis: 10, einfuegen: "Erde" }, { von: 0, bis: 5, einfuegen: "Tschüss" }]);
    expect(a.text).toBe("Tschüss Erde, hallo Mond");
    expect(anwenden(a.text, a.umkehrung).text).toBe(alt);
  });
  it("lehnt Überlappungen ab", () => {
    expect(() => anwenden("abc", [{ von: 0, bis: 2, einfuegen: "" }, { von: 1, bis: 3, einfuegen: "" }])).toThrow(/überlappen/);
  });
  it("bildet Positionen ab", () => {
    expect(abbilden(10, [{ von: 2, bis: 4, einfuegen: "xyz" }])).toBe(11);
  });
});

describe("Pfade nach RFC 6901", () => {
  it("maskiert / und ~", () => {
    expect(zeigerAus(["a/b", "c~d", 0])).toBe("/a~1b/c~0d/0");
    expect(teileAus("/a~1b/c~0d/0")).toEqual(["a/b", "c~d", "0"]);
  });
  it("schreibt Pfade zum Kopieren", () => {
    const teile = ["bestellungen", 1, "positionen", 0, "preis"];
    expect(schreiben(teile, "jq")).toBe(".bestellungen[1].positionen[0].preis");
    expect(schreiben(teile, "jsonpath")).toBe("$.bestellungen[1].positionen[0].preis");
    expect(schreiben(teile, "php")).toBe("$daten['bestellungen'][1]['positionen'][0]['preis']");
    expect(schreiben(teile, "python")).toBe('daten["bestellungen"][1]["positionen"][0]["preis"]');
    expect(schreiben(["a b"], "jq")).toBe('.["a b"]');
    expect(schreiben([0, "x"], "jq")).toBe(".[0].x");
    expect(musterJq(teile)).toBe(".bestellungen[].positionen[].preis");
  });
});

// Ein Mini-Format nur für die Tests: "schluessel=wert" je Zeile, Wurzel ist ein Objekt.
function miniLesen(text: string): Strukturindex {
  const b = new IndexBauer();
  const w = b.knoten(KnotenArt.objekt, KEIN, 0);
  let pos = 0;
  for (const zeile of text.split("\n")) {
    const gleich = zeile.indexOf("=");
    if (gleich > 0) b.blatt(KnotenArt.text, w, pos + gleich + 1, pos + zeile.length, { von: pos, bis: pos + gleich });
    pos += zeile.length + 1;
  }
  b.schliessen(w, text.length);
  return b.fertig();
}
const MINI: Format = {
  kennung: "csv",
  name: "Mini",
  endungen: [],
  sprache: "text",
  faehigkeiten: { kommentare: false, tabellarisch: false, typen: false, schemasprache: "json-schema" },
  leseoptionen: [],
  erkennen: () => 0,
  lesen: (text) => ({ index: miniLesen(text), diagnosen: [], merkmale: {} }),
  eintraegeEntfernen: () => {
    throw new Formatfehler("Mini kennt keine Listen");
  },
  spalteEntfernen: () => {
    throw new Formatfehler("Mini kennt keine Listen");
  },
  wertSchreiben: (_t, index, k, neu) => {
    if (neu.art !== "text") throw new Formatfehler("Mini kennt nur Text");
    return { von: index.von[k], bis: index.bis[k], einfuegen: neu.wert };
  },
};

function sitzungMitAnalyse(text: string) {
  const s = new Sitzung(text);
  let analyse: Analyse | null = null;
  const lesen = () => { analyse = { ...MINI.lesen(s.text), revision: s.revision, format: MINI }; };
  s.analyseVon(() => analyse);
  lesen();
  s.beobachten(() => lesen());
  return s;
}

describe("Strukturindex", () => {
  it("findet Knoten über Zeiger und Position", () => {
    const text = "ort=Lpz.\nplz=04109";
    const i = miniLesen(text);
    const k = knotenZu(i, text, "/plz");
    expect(inhalt(i, text, k)).toBe("04109");
    expect(zeigerVon(i, text, k)).toBe("/plz");
    expect(knotenAn(i, text.indexOf("Lpz"))).toBe(knotenZu(i, text, "/ort"));
  });
});

describe("Sitzung", () => {
  it("setzt einen Wert als Textänderung und lässt den Rest unberührt", () => {
    const s = sitzungMitAnalyse("# Kopf\nort=Lpz.\nplz=04109");
    const e = s.ausfuehren("wert.setzen", { zeiger: "/ort", neu: { art: "text", wert: "Leipzig" } }, { ort: "Tabelle" });
    expect(e).toEqual({ ok: true, titel: "ort: Lpz. -> Leipzig", geaendert: true });
    expect(s.text).toBe("# Kopf\nort=Leipzig\nplz=04109");
    expect(s.revision).toBe(1);
  });

  it("macht rückgängig und wiederholt", () => {
    const s = sitzungMitAnalyse("ort=Lpz.");
    s.ausfuehren("wert.setzen", { zeiger: "/ort", neu: { art: "text", wert: "Leipzig" } }, { ort: "Baum" });
    s.ausfuehren("text.aendern", { aenderungen: [{ von: 0, bis: 0, einfuegen: "plz=1\n" }] }, { ort: "Editor" });
    expect(s.text).toBe("plz=1\nort=Leipzig");
    expect(s.rueckgaengig()).toBe(true);
    expect(s.text).toBe("ort=Leipzig");
    expect(s.rueckgaengig()).toBe(true);
    expect(s.text).toBe("ort=Lpz.");
    expect(s.wiederholen()).toBe(true);
    expect(s.text).toBe("ort=Leipzig");
    s.springen(2);
    expect(s.text).toBe("plz=1\nort=Leipzig");
    // Text eines Stands, ohne den Stand zu ändern
    expect([s.textBei(0), s.textBei(1), s.textBei(2), s.verlauf.zeiger]).toEqual(["ort=Lpz.", "ort=Leipzig", "plz=1\nort=Leipzig", 2]);
    s.springen(1);
    expect(s.textBei(2)).toBe("plz=1\nort=Leipzig");
  });

  it("fasst eine Geste zu einem Schritt zusammen", () => {
    const s = new Sitzung("");
    for (const z of ["a", "b", "c"]) s.ausfuehren("text.aendern", { aenderungen: [{ von: s.text.length, bis: s.text.length, einfuegen: z }] }, { ort: "Editor", geste: "tippen-1" });
    expect(s.verlauf.eintraege).toHaveLength(1);
    s.rueckgaengig();
    expect(s.text).toBe("");
  });

  it("verwirft zurückgenommene Schritte erst bei neuer Arbeit", () => {
    const s = new Sitzung("x");
    s.ausfuehren("text.ersetzen", { text: "y" }, { ort: "Editor" });
    s.rueckgaengig();
    expect(s.kannVor).toBe(true);
    s.ausfuehren("text.ersetzen", { text: "z" }, { ort: "Editor" });
    expect(s.kannVor).toBe(false);
    expect(s.verlauf.eintraege).toHaveLength(1);
  });

  it("meldet Fehler statt zu werfen", () => {
    const s = sitzungMitAnalyse("ort=Lpz.");
    expect(s.ausfuehren("gibt.es.nicht", {}, { ort: "Test" })).toMatchObject({ ok: false, art: "unbekannt" });
    expect(s.ausfuehren("wert.setzen", { zeiger: 3 }, { ort: "Test" })).toMatchObject({ ok: false, art: "werte" });
    expect(s.ausfuehren("wert.setzen", { zeiger: "/fehlt", neu: { art: "text", wert: "x" } }, { ort: "Test" })).toMatchObject({ ok: false, art: "fachlich" });
    expect(s.ausfuehren("wert.setzen", { zeiger: "/ort", neu: { art: "zahl", roh: "1" } }, { ort: "Test" })).toMatchObject({ ok: false, art: "fachlich", fehler: "Mini kennt nur Text" });
  });

  it("rechnet nicht mit einer veralteten Analyse", () => {
    const s = new Sitzung("ort=Lpz.");
    const alt: Analyse = { ...MINI.lesen(s.text), revision: 0, format: MINI };
    s.analyseVon(() => alt);
    s.ausfuehren("text.aendern", { aenderungen: [{ von: 0, bis: 0, einfuegen: "x" }] }, { ort: "Editor" });
    expect(s.ausfuehren("wert.setzen", { zeiger: "/ort", neu: { art: "text", wert: "y" } }, { ort: "Tabelle" })).toMatchObject({ ok: false, art: "fachlich" });
    expect(s.text).toBe("xort=Lpz.");
  });
});
