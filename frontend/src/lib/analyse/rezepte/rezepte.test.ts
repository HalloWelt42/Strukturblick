// Rezepte gegen kleine, unordentliche Dateien: Schritte planen, ausführen, überspringen und Spalten prüfen.

import { describe, expect, it } from "vitest";
import { format } from "../../formate/registrierung";
import { kleinsteAenderung } from "../../kern";
import { rezeptAusfuehren, spaltenPruefen } from "./ausfuehren";
import { rezeptLesen, schrittTitel, type Rezept, type Rezeptschritt } from "./rezept";

const CSV = [
  "name;ort;angelegt;umsatz",
  'Ole;leipzig;2024-01-15;"1.200,00"',
  'Ines;Leipzig ;01.02.2024;"300,50"',
  'Jan;Dresden;15.03.2024;"ca. 900"',
  'Ute;Lpz.;2024-03-01;"80,00"',
  "",
].join("\n");

const rezept = (schritte: Rezeptschritt[]): Rezept => ({
  kennung: "00000000-0000-4000-8000-000000000001",
  name: "Kunden säubern",
  schritte,
  spalten: ["name", "ort", "angelegt", "umsatz"],
  quelle: "kunden.csv",
  angelegt: "2026-11-11T20:00:00.000Z",
  geaendert: "2026-11-11T20:00:00.000Z",
  zuletzt: [],
});

const ORT: Rezeptschritt = { art: "ersetzen", spalte: "ort", karte: [{ vorher: "leipzig", nachher: "Leipzig" }, { vorher: "Leipzig ", nachher: "Leipzig" }, { vorher: "Lpz.", nachher: "Leipzig" }], an: true };
const UMSATZ: Rezeptschritt = { art: "betrag", spalte: "umsatz", unlesbar: "leeren", an: true };
const DATUM: Rezeptschritt = { art: "datum", spalte: "angelegt", unlesbar: "lassen", an: true };

describe("Rezepte ausführen", () => {
  it("führt Schritte nacheinander aus und ändert nur Zellen", () => {
    const lauf = rezeptAusfuehren(rezept([ORT, UMSATZ, DATUM]), CSV, format("csv"));
    // Gequotete Zellen bleiben gequotet: die Schreibweise der Datei bleibt, nur der Inhalt wechselt
    expect(lauf.text).toBe(["name;ort;angelegt;umsatz", 'Ole;Leipzig;2024-01-15;"1200.00"', 'Ines;Leipzig;2024-02-01;"300.50"', 'Jan;Dresden;2024-03-15;""', 'Ute;Leipzig;2024-03-01;"80.00"', ""].join("\n"));
    expect(lauf.plaene.map((p) => (p.status === "ok" ? p.zellen : p.status))).toEqual([3, 4, 2]);
    const umsatz = lauf.plaene[1];
    expect(umsatz.status === "ok" && umsatz.unlesbar).toBe(1);
    expect(umsatz.status === "ok" && umsatz.beispiele.find((b) => b.nachher === null)?.vorher).toBe("ca. 900");
  });

  it("überspringt Schritte mit fehlender Spalte und ausgeschaltete", () => {
    const lauf = rezeptAusfuehren(rezept([{ ...ORT, an: false }, { art: "betrag", spalte: "preis", unlesbar: "lassen", an: true }, DATUM]), CSV, format("csv"));
    expect(lauf.plaene.map((p) => p.status)).toEqual(["aus", "uebersprungen", "ok"]);
    expect(lauf.plaene[1]).toMatchObject({ grund: "Die Spalte preis gibt es in dieser Datei nicht." });
  });

  it("behält nur passende Zeilen und lässt Kopf und Rest stehen", () => {
    const lauf = rezeptAusfuehren(rezept([ORT, { art: "behalten", filter: [{ spalte: "ort", auswahl: { art: "werte", werte: ["Leipzig"] } }], an: true }]), CSV, format("csv"));
    expect(lauf.text.split("\n")).toEqual(["name;ort;angelegt;umsatz", 'Ole;Leipzig;2024-01-15;"1.200,00"', 'Ines;Leipzig;01.02.2024;"300,50"', 'Ute;Leipzig;2024-03-01;"80,00"', ""]);
    expect(lauf.zeilen).toBe(1);
  });

  it("macht in JSON aus Betragstext eine Zahl und läuft ein zweites Mal ohne Änderung", () => {
    const json = '[\n  {"preis": "1.234,50"},\n  {"preis": 7}\n]';
    const r = rezept([{ art: "betrag", spalte: "preis", unlesbar: "lassen", an: true }]);
    const lauf = rezeptAusfuehren(r, json, format("json"));
    expect(lauf.text).toBe('[\n  {"preis": 1234.50},\n  {"preis": 7}\n]');
    expect(rezeptAusfuehren(r, lauf.text, format("json")).zellen).toBe(0);
  });

  it("prüft Spalten: fehlende mit ihren Schritten, zusätzliche bleiben", () => {
    const p = spaltenPruefen(rezept([ORT, { art: "betrag", spalte: "preis", unlesbar: "lassen", an: true }]), "name;ort;gutschein\nA;B;C\n", format("csv"))!;
    expect(p.erwartet.filter((e) => !e.da).map((e) => `${e.spalte}:${e.schritte.join(",")}`)).toEqual(["angelegt:", "umsatz:", "preis:2"]);
    expect(p.zusaetzlich).toEqual(["gutschein"]);
    expect(p.zeilen).toBe(1);
  });
});

describe("Rezepte lesen", () => {
  it("nimmt gültige Rezepte und weist anderes mit Grund ab", () => {
    expect(rezeptLesen(rezept([ORT])).ok).toBe(true);
    const f = rezeptLesen({ ...rezept([ORT]), schritte: [{ art: "zaubern" }] });
    expect(f.ok).toBe(false);
    expect(schrittTitel(UMSATZ)).toBe("umsatz als Betrag");
  });

  it("kleinste Änderung lässt gleichen Anfang und gleiches Ende stehen", () => {
    expect(kleinsteAenderung("abcXYZdef", "abc12def")).toEqual({ von: 3, bis: 6, einfuegen: "12" });
    expect(kleinsteAenderung("aaa", "aaaa")).toEqual({ von: 3, bis: 3, einfuegen: "a" });
    expect(kleinsteAenderung("gleich", "gleich")).toEqual({ von: 6, bis: 6, einfuegen: "" });
  });
});
