import { describe, expect, it } from "vitest";
import { KEIN, knotenZu, type Strukturindex } from "../kern";
import { JSON_FORMAT } from "../formate/json";
import { CSV_FORMAT } from "../formate/csv";
import { ALLE_EBENEN, sichtbareZeilen, zeileVon, zuAufklappen, type Aufklappen } from "./baumzeilen";
import { markieren, naechsterTreffer, suchen } from "./baumsuche";
import { behaelterInfo, gleichAufgebaut, zeileBeschreiben } from "./baumbeschreibung";

const DOK = JSON.stringify({
  shop: "Hofladen",
  stand: "2026-11-10T08:15:00+01:00",
  bestellungen: [
    { nr: "B-1", kunde: { name: "Jonas", plz: "04109" }, positionen: [{ preis: 2.49 }, { preis: 6.9 }] },
    { nr: "B-2", kunde: { name: "Marta", plz: "10115" }, positionen: [{ preis: 3.8 }] },
  ],
}, null, 2);

function gelesen(text: string, format = JSON_FORMAT): Strukturindex {
  const e = format.lesen(text);
  if (!e.index) throw new Error("kein Index");
  return e.index;
}

const index = gelesen(DOK);
const k = (zeiger: string) => knotenZu(index, DOK, zeiger);
const regel = (ebene: number, umgeschaltet: number[] = []): Aufklappen => ({ ebene, umgeschaltet: new Set(umgeschaltet) });
const zeilen = (a: Aufklappen) => Array.from(sichtbareZeilen(index, a).knoten);

describe("Sichtbare Zeilen", () => {
  it("zeigt nach Ebenen", () => {
    expect(zeilen(regel(0))).toEqual([0]);
    expect(zeilen(regel(1))).toEqual([0, k("/shop"), k("/stand"), k("/bestellungen")]);
    expect(zeilen(regel(2))).toEqual([0, k("/shop"), k("/stand"), k("/bestellungen"), k("/bestellungen/0"), k("/bestellungen/1")]);
    expect(zeilen(regel(ALLE_EBENEN))).toHaveLength(index.anzahl);
  });

  it("schaltet einzelne Behälter gegen die Ebene um", () => {
    const zu = zeilen(regel(2, [k("/bestellungen")]));
    expect(zu).toEqual([0, k("/shop"), k("/stand"), k("/bestellungen")]);
    const auf = zeilen(regel(2, [k("/bestellungen/1")]));
    expect(auf).toContain(k("/bestellungen/1/nr"));
    expect(auf).not.toContain(k("/bestellungen/0/nr"));
  });

  it("liefert Tiefe, Stelle und offen", () => {
    const s = sichtbareZeilen(index, regel(2));
    const i = zeileVon(s, k("/bestellungen/1"));
    expect(s.tiefe[i]).toBe(2);
    expect(s.stelle[i]).toBe(1);
    expect(s.offen[zeileVon(s, k("/bestellungen"))]).toBe(1);
    expect(s.offen[i]).toBe(0);
    expect(zeileVon(s, k("/bestellungen/1/nr"))).toBe(-1);
  });

  it("nennt die zuzuklappenden Vorfahren eines versteckten Knotens", () => {
    const a = regel(1);
    expect(zuAufklappen(index, a, k("/bestellungen/1/kunde/plz"))).toEqual([k("/bestellungen/1/kunde"), k("/bestellungen/1"), k("/bestellungen")]);
    expect(zuAufklappen(index, a, k("/shop"))).toEqual([]);
  });

  it("zeigt nur Treffer mit ihren Vorfahren", () => {
    const treffer = suchen(index, DOK, "marta");
    expect(treffer?.anzahl).toBe(1);
    const s = Array.from(sichtbareZeilen(index, { ...regel(1), nurTreffer: treffer }).knoten);
    expect(s).toEqual([0, k("/bestellungen"), k("/bestellungen/1"), k("/bestellungen/1/kunde"), k("/bestellungen/1/kunde/name")]);
  });

  it("zeigt unter einem Treffer den Inhalt wie üblich", () => {
    const treffer = suchen(index, DOK, "kunde");
    const s = Array.from(sichtbareZeilen(index, { ...regel(ALLE_EBENEN), nurTreffer: treffer }).knoten);
    expect(s).toContain(k("/bestellungen/0/kunde/plz"));
    expect(s).not.toContain(k("/bestellungen/0/nr"));
  });

  it("bleibt bei 100.000 Zeilen schnell und ohne Rekursion bei tiefer Schachtelung", () => {
    const gross = JSON.stringify(Array.from({ length: 100_000 }, (_, i) => ({ i })));
    const gi = gelesen(gross);
    const t0 = performance.now();
    const s = sichtbareZeilen(gi, regel(ALLE_EBENEN));
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(s.anzahl).toBe(gi.anzahl);
    const tief = "[".repeat(20_000) + "]".repeat(20_000);
    expect(sichtbareZeilen(gelesen(tief), regel(ALLE_EBENEN)).anzahl).toBe(20_000);
  });
});

describe("Suche im Baum", () => {
  it("findet Schlüssel und Werte ohne Rücksicht auf Groß- und Kleinschreibung", () => {
    const e = suchen(index, DOK, "PLZ")!;
    expect(Array.from(e.knoten)).toEqual([k("/bestellungen/0/kunde/plz"), k("/bestellungen/1/kunde/plz")]);
    expect(suchen(index, DOK, "0410")!.anzahl).toBe(1);
    expect(suchen(index, DOK, "  ")).toBeNull();
  });

  it("springt ringsum zum nächsten und vorigen Treffer", () => {
    const e = suchen(index, DOK, "preis")!;
    const [a, b, c] = Array.from(e.knoten);
    expect(naechsterTreffer(e, KEIN)).toBe(a);
    expect(naechsterTreffer(e, a)).toBe(b);
    expect(naechsterTreffer(e, c)).toBe(a);
    expect(naechsterTreffer(e, a, true)).toBe(c);
    expect(naechsterTreffer(e, c, true)).toBe(b);
  });

  it("teilt Text in markierte Abschnitte", () => {
    expect(markieren("Bergkäse und Käse", "käse")).toEqual([
      { text: "Berg", treffer: false },
      { text: "käse", treffer: true },
      { text: " und ", treffer: false },
      { text: "Käse", treffer: true },
    ]);
    expect(markieren("abc", "")).toEqual([{ text: "abc", treffer: false }]);
  });
});

describe("Zeilenbeschreibung", () => {
  it("beschreibt Wurzel, Behälter und Werte", () => {
    const s = sichtbareZeilen(index, regel(ALLE_EBENEN, [k("/bestellungen/0")]));
    const wurzel = zeileBeschreiben(index, DOK, s, 0);
    expect(wurzel).toMatchObject({ wurzel: true, info: "3 Schlüssel", klappbar: true, offen: true });
    const liste = zeileBeschreiben(index, DOK, s, zeileVon(s, k("/bestellungen")));
    expect(liste).toMatchObject({ schluessel: "bestellungen", info: "2 Einträge, gleich aufgebaut", tabellarisch: true });
    const zu = zeileBeschreiben(index, DOK, s, zeileVon(s, k("/bestellungen/0")));
    expect(zu).toMatchObject({ stelle: 0, schluessel: null, offen: false, info: 'nr "B-1", kunde "Jonas", positionen [2]' });
    const plz = zeileBeschreiben(index, DOK, s, zeileVon(s, k("/bestellungen/1/kunde/plz")));
    expect(plz.wert).toBe('"10115"');
    expect(plz.hinweise).toEqual([]);
    const stand = zeileBeschreiben(index, DOK, s, zeileVon(s, k("/stand")));
    expect(stand.hinweise.map((h) => h.titel)).toEqual(["Datum und Zeit"]);
    const preis = zeileBeschreiben(index, DOK, s, zeileVon(s, k("/bestellungen/1/positionen/0/preis")));
    expect(preis).toMatchObject({ wert: "3.8", info: null, klappbar: false });
  });

  it("zeigt bei zugeklappten Listen Anzahl und erste Werte", () => {
    const t = '{"a": [1, "zwei", true, null, 5, 6], "b": [], "c": {}}';
    const i = gelesen(t);
    expect(behaelterInfo(i, t, knotenZu(i, t, "/a"), false)).toBe('6 Einträge: 1, "zwei", true, null, ...');
    expect(behaelterInfo(i, t, knotenZu(i, t, "/b"), false)).toBe("leer");
    expect(behaelterInfo(i, t, knotenZu(i, t, "/c"), true)).toBe("leer");
  });

  it("erkennt gleich aufgebaute Listen, auch bei CSV", () => {
    const t = '[{"a": 1, "b": 2}, {"b": 3, "a": 4}, {"a": 5}]';
    const i = gelesen(t);
    expect(gleichAufgebaut(i, t, 0)).toBe(false);
    const csv = "name;plz\nJonas;04109\nMarta;10115\n";
    expect(gleichAufgebaut(gelesen(csv, CSV_FORMAT), csv, 0)).toBe(true);
    const g = '[{"a": 1, "b": 2}, {"b": 3, "a": 4}]';
    expect(gleichAufgebaut(gelesen(g), g, 0)).toBe(true);
  });
});
