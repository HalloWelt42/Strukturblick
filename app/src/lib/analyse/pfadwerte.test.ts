import { describe, expect, it } from "vitest";
import { knotenZu, KnotenArt, type Strukturindex } from "../kern";
import { JSON_FORMAT } from "../formate/json";
import { pfadwerte, stellenZu } from "./pfadwerte";

function gelesen(text: string): Strukturindex {
  const e = JSON_FORMAT.lesen(text);
  if (!e.index) throw new Error("kein Index");
  return e.index;
}

const DOK = JSON.stringify({
  bestellungen: [
    { nr: "B-1", positionen: [{ preis: 2.49 }, { preis: 39.9 }, { preis: 2.49 }] },
    { nr: "B-2", positionen: [{ preis: 0.89 }, { preis: "frei" }, {}] },
    { nr: "B-3" },
    { nr: 4, positionen: [{ preis: 2.49 }] },
  ],
});
const index = gelesen(DOK);

describe("Alle Werte eines Pfads", () => {
  it("wertet alle gleichartigen Stellen aus", () => {
    const w = pfadwerte(index, DOK, knotenZu(index, DOK, "/bestellungen/0/positionen/1/preis"));
    expect(w.muster).toBe(".bestellungen[].positionen[].preis");
    expect(w.anzahl).toBe(6);
    expect(w.fehlt).toBe(2); // B-3 ohne positionen, ein Eintrag ohne preis
    expect(w.typen).toEqual([{ art: KnotenArt.zahl, anzahl: 5 }, { art: KnotenArt.text, anzahl: 1 }]);
    expect(w.spanne).toEqual({ von: "0.89", bis: "39.9" });
    expect(w.haeufigste[0]).toEqual({ art: KnotenArt.zahl, wert: "2.49", anzahl: 3 });
    expect(w.haeufigste).toHaveLength(3);
    expect(w.verschiedene).toBe(4);
  });

  it("trennt gleiche Inhalte verschiedener Art", () => {
    const w = pfadwerte(index, DOK, knotenZu(index, DOK, "/bestellungen/0/nr"));
    expect(w.typen).toEqual([{ art: KnotenArt.text, anzahl: 3 }, { art: KnotenArt.zahl, anzahl: 1 }]);
    expect(w.spanne).toEqual({ von: "4", bis: "4" });
  });

  it("kennt die Wurzel und Schlüssel mit Sonderzeichen", () => {
    expect(pfadwerte(index, DOK, 0)).toMatchObject({ muster: ".", anzahl: 1, fehlt: 0, haeufigste: [] });
    const t = '[{"a/b": 1, "*": 2}, {"a/b": 3}]';
    const i = gelesen(t);
    expect(stellenZu(i, t, [0, "a/b"]).knoten.length).toBe(2);
    expect(stellenZu(i, t, [0, "*"])).toMatchObject({ fehlt: 1 });
  });

  it("schafft 100.000 Werte schnell", () => {
    const gross = JSON.stringify({ liste: Array.from({ length: 100_000 }, (_, i) => ({ id: i, wert: i % 7, name: `n${i % 100}` })) });
    const gi = gelesen(gross);
    const ziel = knotenZu(gi, gross, "/liste/5/name");
    const t0 = performance.now();
    const w = pfadwerte(gi, gross, ziel);
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(w.anzahl).toBe(100_000);
    expect(w.verschiedene).toBe(100);
    expect(w.haeufigste[0].anzahl).toBe(1000);
  });
});
