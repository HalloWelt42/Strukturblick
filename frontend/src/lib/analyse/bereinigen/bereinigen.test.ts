// Bereinigen: Facetten, ähnliche Werte, Typen gegen kleine, absichtlich unordentliche Kundendaten.

import { describe, expect, it } from "vitest";
import { format } from "../../formate/registrierung";
import { tabelleBauen } from "../tabelle";
import { abstand, gruppenFinden, kern, paarAehnlichkeit } from "./aehnlich";
import { datumLesen, facettenart, monatsVerteilung, werteZaehlen, zahlenVerteilung, zeilenFiltern } from "./facetten";
import { betragAlsZahl, datumAlsIso, spaltentypen, vorschlagFuer } from "./typen";

const CSV = [
  "name;plz;ort;angelegt;umsatz",
  'Ole;04109;Leipzig;2024-01-15;"1.200,00"',
  'Ines;04109;leipzig;01.02.2024;"300,50"',
  'Karl;04109;Leipzig ;2024-02-20;"2.500,00"',
  'Jan;01067;Dresden;15.03.2024;"ca. 900"',
  'Ute;01067;dresden;2024-03-01;"80,00"',
  'Tom;06108;Halle (Saale);2024-05-02;"1.2O4,00"',
  'Eva;06108;Halle/Saale;02.05.2024;"450,00"',
  "",
].join("\n");
const index = format("csv").lesen(CSV).index!;
const t = tabelleBauen(index, CSV, 0);
const sp = (n: string) => t.spalteNach.get(n)!;

describe("Facetten", () => {
  it("wählt die Art der Facette aus den Werten", () => {
    expect(facettenart(t, index, CSV, sp("ort"))).toBe("werte");
    expect(facettenart(t, index, CSV, sp("angelegt"))).toBe("datum");
  });

  it("zählt Werte, verteilt Zahlen und Monate", () => {
    expect(werteZaehlen(t, index, CSV, sp("ort")).find((w) => w.wert === "Leipzig")?.anzahl).toBe(1);
    const v = zahlenVerteilung(t, index, CSV, sp("umsatz"), 5);
    expect(v.unlesbar).toBe(2);
    expect(v.klassen.reduce((s, k) => s + k.anzahl, 0)).toBe(5);
    expect(monatsVerteilung(t, index, CSV, sp("angelegt")).monate.map((m) => `${m.monat}:${m.anzahl}`)).toEqual(["2024-01:1", "2024-02:2", "2024-03:2", "2024-04:0", "2024-05:2"]);
    expect(datumLesen("31.12.2025")).toEqual({ jahr: 2025, monat: 12, tag: 31 });
  });

  it("filtert über mehrere Facetten und zählt je Schritt", () => {
    const e = zeilenFiltern(t, index, CSV, [
      { spalte: "ort", auswahl: { art: "werte", werte: ["Leipzig", "leipzig", "Leipzig ", "Dresden"] } },
      { spalte: "umsatz", auswahl: { art: "bereich", von: 1000, bis: null } },
    ]);
    expect(e.schritte).toEqual([4, 2]);
    expect([...e.zeilen]).toEqual([0, 2]);
  });
});

describe("Ähnliche Werte", () => {
  const werte = werteZaehlen(t, index, CSV, sp("ort"));

  it("gleicher Kern: Groß, klein, Leerzeichen und Satzzeichen zählen nicht", () => {
    expect(kern("Halle (Saale)")).toBe(kern("Halle/Saale"));
    const g = gruppenFinden(werte, "kern");
    expect(g.map((x) => x.varianten.map((v) => v.wert).sort())).toEqual([["Leipzig", "Leipzig ", "leipzig"], ["Dresden", "dresden"], ["Halle (Saale)", "Halle/Saale"]]);
    expect(g[0].ziel).toBe("Leipzig");
  });

  it("Buchstabenpaare und Tippfehler-Abstand finden auch vertauschte Buchstaben", () => {
    expect(paarAehnlichkeit("leipzig", "leipizg")).toBeLessThan(1);
    expect(abstand("leipzig", "lepzig")).toBe(1);
    expect(abstand("leipzig", "dresden")).toBeGreaterThan(2);
    const g = gruppenFinden([{ wert: "Leipzig", anzahl: 5 }, { wert: "Lepzig", anzahl: 1 }, { wert: "Dresden", anzahl: 3 }], "abstand");
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ ziel: "Leipzig" });
  });
});

describe("Typen", () => {
  it("liest deutsche Beträge und Datumsangaben", () => {
    expect(betragAlsZahl("1.234,50")).toBe("1234.50");
    expect(betragAlsZahl("ca. 900")).toBeNull();
    expect(datumAlsIso("1.2.2024")).toBe("2024-02-01");
  });

  it("schlägt Betrag mit unlesbaren Werten vor", () => {
    const csv = ["umsatz", ..."1.200,00 300,50 2.500,00 80,00 450,00 12,00 7.000,00 99,99".split(" ").map((w) => `"${w}"`), '"ca. 900"', '"1.2O4,00"', ""].join("\n");
    const ix = format("csv").lesen(csv).index!;
    const v = vorschlagFuer(tabelleBauen(ix, csv, 0), ix, csv, 0)!;
    expect(v.art).toBe("betrag");
    expect(v.aenderungen.map((a) => a.neu)).toContainEqual({ art: "zahl", roh: "1200.00" });
    expect(v.unlesbar.map((u) => [u.wert, u.grund])).toEqual([["ca. 900", "Wort vor der Zahl"], ["1.2O4,00", "Buchstabe O statt Null?"]]);
  });

  it("stellt gemischte Datumsformen um und lässt ISO stehen", () => {
    const v = vorschlagFuer(t, index, CSV, sp("angelegt"))!;
    expect(v.erkannt).toBe("Datum, 2 Formate gemischt");
    expect(v.bleiben).toBe(4);
    expect(v.aenderungen.map((a) => [a.vorher, a.neu])).toEqual([["01.02.2024", { art: "text", wert: "2024-02-01" }], ["15.03.2024", { art: "text", wert: "2024-03-15" }], ["02.05.2024", { art: "text", wert: "2024-05-02" }]]);
  });

  it("lässt Postleitzahlen Text und warnt vor der verlorenen Null", () => {
    const v = vorschlagFuer(t, index, CSV, sp("plz"))!;
    expect(v).toMatchObject({ art: "text-bleibt", fuehrendeNullen: 7, aenderungen: [] });
    expect(spaltentypen(t, index, CSV).map((s) => `${s.spalte}:${s.vorschlag}`)).toEqual(["name:null", "plz:text-bleibt", "ort:null", "angelegt:datum", "umsatz:null"]);
    // umsatz: nur 5 von 7 lesbar (71 %), unter der Schwelle für einen Vorschlag (80 %)
  });
});
