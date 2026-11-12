// Ausschnitt der Ansicht Graph: Fokus mit Tiefe, Elternknoten als Rückweg, Beschriftung von Objekten, Plus für
// Verborgenes, Kürzen sehr langer Listen, Nachbarn des Fokus.

import { describe, expect, it } from "vitest";
import { knotenZu } from "../kern/pfade";
import { format } from "../formate/registrierung";
import { GRENZE_FOKUS, graphAusschnitt, type Wertkarte } from "./graph";

const TEXT = JSON.stringify({
  bestellungen: [
    { nr: "B-1", kunde: { name: "Ida", plz: "04109" }, positionen: [{ artikel: "Quark" }, { artikel: "Honig" }], bezahlt: true, notiz: null },
    { nr: "B-2", kunde: { name: "Ole", plz: "01067" }, positionen: [], bezahlt: false, notiz: null },
  ],
});
const index = format("json").lesen(TEXT).index!;
const zu = (zeiger: string) => knotenZu(index, TEXT, zeiger);
const zeile = (w: Wertkarte): string => [w.beschriftung, w.wert ?? w.titel ?? "", w.info ?? "", w.verborgen ? `+${w.verborgen}` : ""].filter(Boolean).join(" ");

describe("Ausschnitt für den Graph", () => {
  it("zeigt den Fokus mit Kindern bis zur Tiefe und den Elternknoten", () => {
    const a = graphAusschnitt(index, TEXT, zu("/bestellungen/0"), 2);
    expect(zeile(a.fokus)).toBe('[0] "B-1" 5 Schlüssel');
    expect(a.fokus.kinder.map(zeile)).toEqual(['nr "B-1"', 'kunde "Ida" 2 Schlüssel', "positionen 2 Einträge, gleich aufgebaut", "bezahlt true", "notiz null"]);
    expect(a.fokus.kinder[1].kinder.map(zeile)).toEqual(['name "Ida"', 'plz "04109"']);
    expect(a.fokus.kinder[2].kinder.map(zeile)).toEqual(['[0] "Quark" 1 Schlüssel +1', '[1] "Honig" 1 Schlüssel +1']);
    expect(zeile(a.eltern!)).toBe("bestellungen 2 Einträge, gleich aufgebaut +2");
    expect([a.vorher, a.nachher]).toEqual([-1, zu("/bestellungen/1")]);
    expect(a.sichtbar).toBe(11);
    expect(a.gesamt).toBe(index.anzahl);
  });

  it("beginnt an der Wurzel ohne Eltern und kürzt lange Listen", () => {
    const viele = JSON.stringify(Array.from({ length: GRENZE_FOKUS + 7 }, (_, i) => i));
    const i2 = format("json").lesen(viele).index!;
    const a = graphAusschnitt(i2, viele, 0, 1);
    expect(a.eltern).toBeNull();
    expect(a.fokus.beschriftung).toBe("$");
    expect(a.fokus.kinder).toHaveLength(GRENZE_FOKUS);
    expect(a.fokus.weitere).toBe(7);
  });
});
