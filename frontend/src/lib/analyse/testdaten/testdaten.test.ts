// Testdaten: Zufall und Erzeugung wiederholbar, Erzeuger einzeln, Wohnort stimmig, Ableitung aus den Prüfdaten
// (kunden.csv wie im Entwurf, bestellungen.json mit Objekt und Liste), Ausgabe und Ablegen des Auftrags.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { format } from "../../formate/registrierung";
import type { FormatKennung } from "../../kern/format";
import { KEIN } from "../../kern/strukturindex";
import { listeFinden } from "../tabelle";
import { ORTE } from "./daten";
import { deutsch, erzeuger, mitVorgaben, type Json } from "./erzeuger";
import { Zufall } from "./zufall";
import { beispiele, Erzeugung, vervollstaendigen, wertAn, type Feldspec, type Spezifikation } from "./spezifikation";
import { ableiten } from "./ableiten";
import { alsText, ausgeben, ausText } from "./auftrag";

const lies = (n: string) => readFileSync(new URL(`../../../../pruefdaten/${n}`, import.meta.url), "utf8");
const feld = (pfad: string, erz: string, einstellungen: Record<string, unknown> = {}, leer = 0): Feldspec => ({ pfad, erzeuger: erz, einstellungen: einstellungen as Feldspec["einstellungen"], leer: { anteil: leer, als: "fehlt" } });
const wert = (erz: string, e: Record<string, unknown> = {}, folge = 0, start = 7) =>
  erzeuger(erz).erzeugen(mitVorgaben(erzeuger(erz), e as never), { zufall: new Zufall(start), folge, person: () => ({ vorname: "Jörg", nachname: "Müller" }), wohnort: () => ({ ort: "Leipzig", plz: "04109", vorwahl: "0341" }) });

describe("Zufall und Erzeugung", () => {
  it("liefert mit gleichem Startwert dieselbe Folge, mit anderem eine andere", () => {
    const a = new Zufall(4711), b = new Zufall(4711), c = new Zufall(4712);
    const fa = Array.from({ length: 5 }, () => a.zahl());
    expect(Array.from({ length: 5 }, () => b.zahl())).toEqual(fa);
    expect(Array.from({ length: 5 }, () => c.zahl())).not.toEqual(fa);
  });
  it("erzeugt in Blöcken dasselbe wie am Stück", () => {
    const spez: Spezifikation = { felder: [feld("nr", "nummer", { muster: "K-#####", start: 20001 }), feld("name", "name"), feld("wert", "zahl", { von: 0, bis: 99, stellen: 2 })] };
    const ganz = new Erzeugung(spez, 4711).naechste(10);
    const e = new Erzeugung(spez, 4711);
    expect([...e.naechste(3), ...e.naechste(7)]).toEqual(ganz);
    expect(e.erzeugt).toBe(10);
    expect(ganz.map((d) => wertAn(d, "nr"))).toEqual(Array.from({ length: 10 }, (_, i) => `K-${20001 + i}`));
  });
  it("hält Postleitzahl, Ort und Vorwahl je Datensatz zusammen und bleibt im Gebiet", () => {
    const spez: Spezifikation = { felder: [feld("plz", "plz", { von: 1, bis: 9 }), feld("ort", "ort"), feld("telefon", "telefon")] };
    for (const d of new Erzeugung(spez, 1).naechste(200) as Record<string, string>[]) {
      const o = ORTE.find((x) => x.ort === d.ort)!;
      expect(Number(d.plz)).toBeGreaterThanOrEqual(o.plzVon);
      expect(Number(d.plz)).toBeLessThanOrEqual(o.plzBis);
      expect(d.plz).toMatch(/^0\d{4}$/);
      expect(d.telefon.startsWith(`${o.vorwahl} `)).toBe(true);
    }
  });
  it("lässt Felder mit Anteil leer: fehlt, null oder leerer Text", () => {
    const d = new Erzeugung({ felder: [feld("a", "konstante", { wert: "x" }, 100), { ...feld("b", "konstante", { wert: "x" }, 100), leer: { anteil: 100, als: "null" } }, { ...feld("c", "konstante", { wert: "x" }, 100), leer: { anteil: 100, als: "leertext" } }] }, 1).naechste(1)[0];
    expect(d).toEqual({ b: null, c: "" });
  });
  it("baut verschachtelte Objekte und Listen, auch ohne eigens genannte Objekte", () => {
    const spez: Spezifikation = { felder: [feld("kunde.name", "name"), feld("pos", "liste", { von: 2, bis: 2 }), feld("pos[].preis", "zahl", { von: 1, bis: 1 })] };
    expect(vervollstaendigen(spez.felder).map((f) => f.pfad)).toEqual(["kunde", "kunde.name", "pos", "pos[]", "pos[].preis"]);
    const d = new Erzeugung(spez, 3).naechste(1)[0] as { kunde: { name: string }; pos: { preis: number }[] };
    expect(typeof d.kunde.name).toBe("string");
    expect(d.pos).toEqual([{ preis: 1 }, { preis: 1 }]);
    expect(beispiele(spez, 3, "pos[].preis", 2)).toEqual([1, 1]);
  });
});

describe("Erzeuger einzeln", () => {
  it("schreibt Nummern, Beträge, Datum, E-Mail, Telefon und mehr wie eingestellt", () => {
    expect(wert("nummer", { muster: "K-#####", start: 20001 }, 4)).toBe("K-20005");
    expect(wert("nummer", { muster: "#", start: 1000, als: "zahl" }, 2)).toBe(1002);
    expect(deutsch(1087.15, 2)).toBe("1.087,15");
    expect(deutsch(-1234567.5, 1)).toBe("-1.234.567,5");
    expect(wert("zahl", { von: 1000, bis: 1000, stellen: 2, schreibweise: "deutsch" })).toBe("1.000,00");
    expect(wert("datum", { von: "2024-03-01", bis: "2024-03-01", schreibweise: "deutsch" })).toBe("01.03.2024");
    expect(wert("zeitpunkt", { von: "2024-03-01", bis: "2024-03-01" })).toMatch(/^2024-03-01T\d{2}:\d{2}:\d{2}Z$/);
    expect(wert("email", { domain: "beispiel.example" })).toBe("joerg.mueller@beispiel.example");
    expect(wert("telefon", { netz: "festnetz", schreibweise: "international" })).toMatch(/^\+49 341 [1-9]\d{5,6}$/);
    expect(wert("telefon", { netz: "mobil", schreibweise: "strich" })).toMatch(/^01\d{2}\/\d{7}$/);
    expect(wert("uuid")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(wert("wahrheit", { anteil: 100, schreibweise: "ja-nein" })).toBe("ja");
    expect(wert("auswahl", { werte: [{ wert: "7", gewicht: 1 }], als: "zahl" })).toBe(7);
    expect(wert("konstante", { wert: "", als: "null" })).toBeNull();
    expect(wert("name", { teil: "nachname" })).toBe("Müller");
  });
});

describe("Ableiten aus einer Vorlage", () => {
  const ab = (datei: string, fmt: FormatKennung) => {
    const text = lies(datei);
    const index = format(fmt).lesen(text).index!;
    return ableiten(index, text, listeFinden(index, KEIN, KEIN));
  };
  it("erkennt in kunden.csv Nummer, Name, Postleitzahl, Ort, E-Mail, Telefon, Datum und Betrag", () => {
    const a = ab("kunden.csv", "csv");
    expect(a.eintraege).toBe(1214);
    const nach = Object.fromEntries(a.spezifikation.felder.map((f) => [f.pfad, f]));
    expect(nach.kundennr).toMatchObject({ erzeuger: "nummer", einstellungen: { muster: "K-#####", start: 10001 } });
    expect(Object.values(nach).map((f) => f.erzeuger)).toEqual(["nummer", "name", "plz", "ort", "email", "telefon", "datum", "zahl"]);
    expect(nach.umsatz.einstellungen).toMatchObject({ stellen: 2, schreibweise: "deutsch" });
    expect(a.hinweise.join(" ")).toContain("angelegt");
  });
  it("übernimmt aus bestellungen.json Objekt, Liste mit Einträgen, feste Werte und den Anteil leerer Notizen", () => {
    const a = ab("bestellungen.json", "json");
    const nach = Object.fromEntries(a.spezifikation.felder.map((f) => [f.pfad, f]));
    expect(nach.kunde.erzeuger).toBe("objekt");
    expect(nach.positionen).toMatchObject({ erzeuger: "liste", einstellungen: { von: 1, bis: 4 } });
    expect(nach["positionen[]"].erzeuger).toBe("objekt");
    expect(nach["positionen[].menge"]).toMatchObject({ erzeuger: "auswahl", einstellungen: { als: "zahl" } });
    expect(nach.notiz.leer).toEqual({ anteil: 80, als: "null" });
    const d = new Erzeugung(a.spezifikation, 4711).naechste(5) as { nr: string; positionen: unknown[]; kunde: object }[];
    expect(d[0].nr).toBe("B-24017");
    expect(d.every((x) => x.positionen.length >= 1 && x.positionen.length <= 4 && typeof x.kunde === "object")).toBe(true);
  });
});

describe("E-Mail-Domain aus der Vorlage", () => {
  const domain = (csv: string) => {
    const index = format("csv").lesen(csv).index!;
    return ableiten(index, csv, 0).spezifikation.felder.find((f) => f.pfad === "email")?.einstellungen.domain;
  };
  it("übernimmt nur reservierte Beispieldomains, nie eine echte", () => {
    expect(domain("name;email\nA;a@example.org\nB;b@example.org\nC;c@example.org\n")).toBe("example.org");
    expect(domain("name;email\nA;a@firma.de\nB;b@firma.de\nC;c@firma.de\n")).toBe("");
    expect(domain("name;email\nA;a@shop.example\nB;b@shop.example\nC;c@shop.example\n")).toBe("shop.example");
  });
});

describe("Ausgabe und Auftrag", () => {
  const daten: Json[] = [{ nr: "K-1", plz: "04109", umsatz: "1.087,15" }, { nr: "K-2", plz: "01067", umsatz: "58,90" }];
  it("schreibt CSV mit Trennzeichen, NDJSON, JSON und YAML", () => {
    expect(ausgeben(daten, "csv", ";").split(/\r?\n/)[0]).toBe("nr;plz;umsatz");
    expect(ausgeben(daten, "csv", ";")).toContain("04109");
    expect(ausgeben(daten, "ndjson", ";")).toBe('{"nr":"K-1","plz":"04109","umsatz":"1.087,15"}\n{"nr":"K-2","plz":"01067","umsatz":"58,90"}\n');
    expect(JSON.parse(ausgeben(daten, "json", ";"))).toEqual(daten);
    expect(ausgeben(daten, "yaml", ";")).toContain("plz: \"04109\"");
  });
  it("legt den Auftrag als Dokument ab und liest ihn wieder, Fremdes nicht", () => {
    const a = { spezifikation: { felder: [feld("nr", "nummer", { muster: "K-#####", start: 1 }), feld("w", "auswahl", { werte: [{ wert: "a", gewicht: 2 }] }, 10)] }, anzahl: 500, startwert: 4711, ziel: "csv" as const, trennzeichen: ";" as const };
    expect(ausText(alsText(a))).toEqual(a);
    expect(ausText('{"a": 1}')).toBeNull();
    expect(ausText('{"$testdaten": 1, "felder": [{"pfad": "x", "erzeuger": "gibtsnicht"}]}')?.spezifikation.felder).toEqual([]);
  });
});
