// Statistik gegen kleine Bestellungen: Kennzahlen, Feldprofil mit Musterpfaden, Leer-Anteil, Lage und Muster.

import { describe, expect, it } from "vitest";
import { format } from "../formate/registrierung";
import { KnotenArt } from "../kern/strukturindex";
import { kennzahlen, lage, leerAnteil, musterFinden, statistik } from "./statistik";
import { klassenBilden } from "./klassen";

const JSON_TEXT = JSON.stringify({
  bestellungen: [
    { nr: "B-1", datum: "2026-09-14", kunde: { plz: "04109" }, positionen: [{ preis: 2.5, menge: 1 }, { preis: 10, menge: 2 }], bezahlt: true, notiz: null },
    { nr: "B-2", datum: "2026-09-15", kunde: { plz: "01067" }, positionen: [{ preis: 4, menge: 3 }], bezahlt: false },
    { nr: "B-3", datum: "2026-09-16", kunde: { plz: "99084" }, positionen: [], bezahlt: true, notiz: "Bitte klingeln" },
  ],
});
const index = format("json").lesen(JSON_TEXT).index!;
const liste = index.erstesKind[0]; // Wurzel ist das Objekt, ihr erstes Kind die Liste bestellungen

describe("Statistik", () => {
  it("zählt Knoten, Tiefe, Größe und Arten", () => {
    const k = kennzahlen(index, JSON_TEXT);
    expect(k.tiefe).toBe(5);
    expect(k.groesse).toBe(new TextEncoder().encode(JSON_TEXT).length);
    expect(k.arten[KnotenArt.liste]).toBe(4);
    expect(k.arten[KnotenArt.wahrheitswert]).toBe(3);
    expect(k.knoten).toBe(k.arten.reduce((a, b) => a + b, 0));
  });

  it("profiliert Felder als Musterpfade unterhalb der Liste", () => {
    const st = statistik(index, JSON_TEXT, liste);
    expect(st.eintraege).toBe(3);
    expect(st.felder.map((f) => f.pfad)).toEqual(["nr", "datum", "kunde.plz", "positionen", "positionen[].preis", "positionen[].menge", "bezahlt", "notiz"]);
    const preis = st.felder.find((f) => f.pfad === "positionen[].preis")!;
    expect(preis).toMatchObject({ vorsilbe: "positionen[].", name: "preis", vorkommen: 3, moeglich: 3, ganz: false });
    expect(lage(preis.zahlen)).toMatchObject({ min: 2.5, max: 10, median: 4 });
    expect(st.felder.find((f) => f.pfad === "positionen")!.listenLaenge).toEqual({ min: 0, max: 2 });
    const notiz = st.felder.find((f) => f.pfad === "notiz")!;
    expect(notiz).toMatchObject({ vorkommen: 2, moeglich: 3, nichts: 1 });
    expect(leerAnteil(notiz)).toBeCloseTo(2 / 3);
    expect(st.felder.find((f) => f.pfad === "kunde.plz")!.textBereich).toEqual({ min: "01067", max: "99084" });
    expect(st.felder.find((f) => f.pfad === "bezahlt")).toMatchObject({ wahr: 2, falsch: 1, verschiedene: 2 });
  });

  it("bestimmt die Spanne bei Beträgen nach Zahl und bei Datum nach Datum", () => {
    const csv = 'betrag;datum\n"996,28";01.03.2024\n"1.021,70";2024-01-15\n"80,00";28.02.2024\n';
    const ix = format("csv").lesen(csv).index!;
    const st = statistik(ix, csv, 0);
    expect(st.felder.find((f) => f.pfad === "betrag")!.textBereich).toEqual({ min: "80,00", max: "1.021,70" });
    expect(st.felder.find((f) => f.pfad === "datum")!.textBereich).toEqual({ min: "2024-01-15", max: "2024-03-01" });
  });

  it("findet Schlüssel, Datum und Nummern mit führender Null", () => {
    const m = musterFinden(statistik(index, JSON_TEXT, liste)).map((x) => `${x.art}:${x.feld.pfad}`);
    expect(m).toContain("eindeutig:nr");
    expect(m).toContain("datum:datum");
    expect(m).toContain("zahl-als-text:kunde.plz");
    expect(m).not.toContain("eindeutig:bezahlt");
  });

  it("teilt große Zahlenmengen ohne Stapelüberlauf in Klassen", () => {
    const zahlen = Float64Array.from({ length: 300_000 }, (_, i) => i % 1000);
    const k = klassenBilden(zahlen, 10);
    expect(k.schritt).toBe(100);
    expect(k.klassen.reduce((n, c) => n + c.anzahl, 0)).toBe(300_000);
    expect(klassenBilden(Float64Array.from([1, 2, 3, 4, 5, 6]), 10, true).schritt).toBe(1);
  });
});
