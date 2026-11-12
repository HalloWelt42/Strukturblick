// Vergleich: Paarung über Schlüssel und nach Stelle, Pfade und Zeiger, und ein JSON Patch, der Vorher wirklich in
// Jetzt verwandelt (auch bei zufälligen Änderungen).

import { describe, expect, it } from "vitest";
import { jsonPatch, type PatchVorgang } from "./patch";
import { gleich, schluesselKandidaten, vergleichen, type Vergleichsoptionen } from "./vergleichen";
import { vergleichszeilen } from "./zeilen";

const O: Vergleichsoptionen = { schluessel: true, reihenfolgeEgal: false, felder: {} };

/** RFC 6902 für add, remove, replace (genug für die Prüfung) */
function anwenden(doc: unknown, ops: readonly PatchVorgang[]): unknown {
  let wurzel = structuredClone(doc);
  for (const op of ops) {
    if (op.path === "") { wurzel = op.op === "remove" ? undefined : structuredClone(op.value); continue; }
    const teile = op.path.slice(1).split("/").map((t) => t.replaceAll("~1", "/").replaceAll("~0", "~"));
    const letzter = teile.pop()!;
    let ziel = wurzel as Record<string, unknown> | unknown[];
    for (const t of teile) ziel = (ziel as Record<string, unknown>)[t] as Record<string, unknown>;
    if (Array.isArray(ziel)) {
      const i = Number(letzter);
      if (op.op === "remove") ziel.splice(i, 1);
      else if (op.op === "add") ziel.splice(i, 0, structuredClone(op.value));
      else ziel[i] = structuredClone(op.value);
    } else if (op.op === "remove") delete ziel[letzter];
    else ziel[letzter] = structuredClone(op.value);
  }
  return wurzel;
}

const VORHER = {
  shop: "Hofladen",
  stand: "2026-11-09",
  bestellungen: [
    { nr: "B-1", kunde: { name: "Ida" }, positionen: [{ a: "Honig", p: 7.5 }], bezahlt: true },
    { nr: "B-2", kunde: { name: "Ole" }, positionen: [{ a: "Saft", p: 2.49 }, { a: "Käse", p: 6.9 }], bezahlt: false },
    { nr: "B-3", kunde: { name: "Karl" }, positionen: [], bezahlt: true },
  ],
};
const JETZT = {
  shop: "Hofladen",
  stand: "2026-11-10",
  bestellungen: [
    { nr: "B-1", kunde: { name: "Ida" }, positionen: [{ a: "Honig", p: 7.5 }], bezahlt: true },
    { nr: "B-2", kunde: { name: "Ole" }, positionen: [{ a: "Saft", p: 2.59 }, { a: "Käse", p: 6.9 }], bezahlt: true },
    { nr: "B-4", kunde: { name: "Mira" }, positionen: [{ a: "Eier", p: 3.8 }], bezahlt: false },
  ],
};

describe("Vergleich", () => {
  it("paart über nr: geändert, hinzu und weg mit Pfad und Zeigern", () => {
    const v = vergleichen(VORHER, JETZT, O);
    expect(v.unterschiede.map((u) => `${u.art} ${u.pfad} ${u.zeigerVorher} ${u.zeigerJetzt}`)).toEqual([
      "geaendert stand /stand /stand",
      'geaendert bestellungen[nr="B-2"].positionen[0].p /bestellungen/1/positionen/0/p /bestellungen/1/positionen/0/p',
      'geaendert bestellungen[nr="B-2"].bezahlt /bestellungen/1/bezahlt /bestellungen/1/bezahlt',
      'weg bestellungen[nr="B-3"] /bestellungen/2 null',
      'hinzu bestellungen[nr="B-4"] null /bestellungen/2',
    ]);
    const getauscht = vergleichen({ l: [{ id: 1 }, { id: 2 }] }, { l: [{ id: 2 }, { id: 1 }] }, O);
    expect(getauscht.unterschiede.map((u) => `${u.pfad} ${u.reihenfolge}`)).toEqual(["l true"]);
    expect(vergleichen({ l: [{ id: 1 }, { id: 2 }] }, { l: [{ id: 2 }, { id: 1 }] }, { ...O, reihenfolgeEgal: true }).unterschiede).toEqual([]);
    expect(v.paarungen.find((p) => p.muster === "bestellungen")).toEqual({ muster: "bestellungen", feld: "nr", paare: 2, nurVorher: 1, nurJetzt: 1, kandidaten: ["nr"] });
  });

  it("nach Stelle: ein eingefügter Eintrag lässt die folgenden gleich", () => {
    const v = vergleichen(["a", "b", "c"], ["a", "x", "b", "c"], O);
    expect(v.unterschiede.map((u) => `${u.art} ${u.pfad}`)).toEqual(["hinzu [1]"]);
    const egal = vergleichen(["a", "b", "c"], ["c", "a", "b"], { ...O, reihenfolgeEgal: true });
    expect(egal.unterschiede).toEqual([]);
  });

  it("Schlüsselfelder: eindeutig in beiden Listen, Namen wie nr oder id zuerst; gewählt und abgeschaltet", () => {
    expect(schluesselKandidaten(VORHER.bestellungen, JETZT.bestellungen)).toEqual(["nr"]);
    expect(schluesselKandidaten([{ name: "a", id: 1 }, { name: "b", id: 2 }], [{ name: "a", id: 1 }])).toEqual(["id", "name"]);
    const nachStelle = vergleichen(VORHER, JETZT, { ...O, felder: { bestellungen: "" } });
    expect(nachStelle.paarungen.find((p) => p.muster === "bestellungen")?.feld).toBeNull();
    expect(nachStelle.unterschiede.some((u) => u.pfad === "bestellungen[2].nr")).toBe(true);
  });

  it("Reihenfolge der Schlüssel zählt nicht", () => {
    expect(gleich({ a: 1, b: [1, { c: 2, d: 3 }] }, { b: [1, { d: 3, c: 2 }], a: 1 })).toBe(true);
    expect(vergleichen({ a: 1, b: 2 }, { b: 2, a: 1 }, O).wurzel.art).toBe("gleich");
  });
});

describe("JSON Patch", () => {
  it("verwandelt Vorher in Jetzt", () => {
    const ops = jsonPatch(vergleichen(VORHER, JETZT, O).wurzel);
    expect(ops[0]).toEqual({ op: "replace", path: "/stand", value: "2026-11-10" });
    expect(gleich(anwenden(VORHER, ops), JETZT)).toBe(true);
  });

  it("verwandelt auch bei zufälligen Änderungen, mit und ohne Schlüssel", () => {
    let saat = 7;
    const zufall = (n: number) => { saat = (saat * 1103515245 + 12345) % 2147483648; return saat % n; };
    for (let lauf = 0; lauf < 200; lauf++) {
      const vorher = Array.from({ length: 4 + zufall(6) }, (_, i) => ({ id: i, w: zufall(3), l: Array.from({ length: zufall(4) }, () => zufall(3)) }));
      const jetzt = structuredClone(vorher).filter(() => zufall(5) > 0);
      for (const e of jetzt) if (zufall(3) === 0) { e.w = zufall(9); e.l.splice(zufall(3), zufall(2), zufall(5)); }
      for (let k = zufall(3); k > 0; k--) jetzt.splice(zufall(jetzt.length + 1), 0, { id: 100 + lauf * 10 + k, w: 1, l: [] });
      if (zufall(4) === 0 && jetzt.length > 1) jetzt.reverse();
      for (const opt of [O, { ...O, schluessel: false }]) {
        const ops = jsonPatch(vergleichen({ liste: vorher }, { liste: jetzt }, opt).wurzel);
        expect(gleich(anwenden({ liste: vorher }, ops), { liste: jetzt })).toBe(true);
      }
      // Ist die Reihenfolge egal, stimmt das Ergebnis bis auf die Reihenfolge
      const sortiert = (w: unknown) => ((w as { liste: unknown[] }).liste.map((x) => JSON.stringify(x)).sort());
      const egal = jsonPatch(vergleichen({ liste: vorher }, { liste: jetzt }, { ...O, schluessel: false, reihenfolgeEgal: true }).wurzel);
      expect(sortiert(anwenden({ liste: vorher }, egal))).toEqual(sortiert({ liste: jetzt }));
    }
  });
});

describe("Zeilen nebeneinander", () => {
  it("Gleiches als Falte, Geändertes links alt und rechts neu, Fehlendes nur auf einer Seite", () => {
    const v = vergleichen(VORHER, JETZT, O);
    const { zeilen } = vergleichszeilen(v.wurzel, new Set());
    const falten = zeilen.flatMap((z) => (z.art === "falte" ? [z.text] : []));
    expect(falten).toContain("[0] B-1, gleich");
    const geaendert = zeilen.find((z) => z.art === "zeile" && z.ton === "geaendert" && z.knoten?.pfad === "stand");
    expect(geaendert && geaendert.art === "zeile" ? [geaendert.links?.map((t) => t.text).join(""), geaendert.rechts?.map((t) => t.text).join("")] : null).toEqual(['"stand": "2026-11-09",', '"stand": "2026-11-10",']);
    const hinzu = zeilen.filter((z) => z.art === "zeile" && z.ton === "hinzu");
    expect(hinzu.every((z) => z.art === "zeile" && z.links === null)).toBe(true);
    const offen = vergleichszeilen(v.wurzel, new Set(["bestellungen[nr=\"B-1\"]"])).zeilen;
    expect(offen.length).toBeGreaterThan(zeilen.length);
  });
});
