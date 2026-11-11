// Browser-Ablage gegen eine nachgebildete IndexedDB: der Umstieg auf Stufe 2 bei einem älteren Tab, der nicht
// reagiert (STB-27), das Platzmachen für eine neuere Fassung und der Umstieg mit vorhandenen Dokumenten.

import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { deleteDB, openDB } from "idb";
import { BrowserAblage } from "./ablage-browser";

const NAME = "strukturblick-2";
const warten = (ms: number) => new Promise((r) => setTimeout(r, ms));

const offen: BrowserAblage[] = [];
const ablageMit = (e: ConstructorParameters<typeof BrowserAblage>[0] = {}): BrowserAblage => {
  const a = new BrowserAblage(e);
  offen.push(a);
  return a;
};

afterEach(async () => {
  for (const a of offen.splice(0)) await a.schliessen();
  await deleteDB(NAME);
});

/** Ein Tab mit Fassung vor 2.1: Stufe 1, ohne Antwort auf einen Umstieg (kein versionchange) */
async function alterTab() {
  return openDB(NAME, 1, {
    upgrade(db) {
      db.createObjectStore("dokumente", { keyPath: "kennung" });
      db.createObjectStore("stand");
    },
  });
}

describe("BrowserAblage", () => {
  it("meldet, dass ein älterer Tab den Umstieg aufhält, und geht weiter, sobald er zu ist", async () => {
    const alt = await alterTab();
    await alt.put("dokumente", { kennung: "d1", name: "alt.json", text: "{}", geaendert: "2026-11-01T00:00:00Z", verlauf: { eintraege: [], zeiger: 0 }, formatWahl: null, optionen: {} });
    const ereignisse: string[] = [];
    const ablage = ablageMit({ wartet: () => ereignisse.push("wartet"), frei: () => ereignisse.push("frei") });

    const liste = ablage.liste();
    await warten(50);
    expect(ereignisse).toEqual(["wartet"]);

    alt.close();
    expect((await liste).map((d) => [d.name, d.ordner])).toEqual([["alt.json", ""]]);
    expect(ereignisse).toEqual(["wartet", "frei"]);
    expect(await ablage.ordner()).toEqual([]);
  });

  it("macht einer neueren Fassung Platz", async () => {
    let abgeloest = 0;
    const ablage = ablageMit({ abgeloest: () => abgeloest++ });
    await ablage.liste();
    // eine neuere Fassung will eine Stufe höher; diese Ablage schließt auf das Ereignis hin
    const neu = openDB(NAME, 99, { upgrade() {} });
    await warten(50);
    expect(abgeloest).toBe(1);
    await ablage.schliessen();
    (await neu).close();
  });

  it("legt nach dem Umstieg Ordner an (Stufe 2)", async () => {
    const ablage = ablageMit();
    await ablage.ordnerAnlegen("Import");
    expect(await ablage.ordner()).toEqual(["Import"]);
  });

  it("hält Rezepte (Stufe 3): speichern, geordnet lesen, Ungültiges weglassen, entfernen", async () => {
    const ablage = ablageMit();
    const rezept = (kennung: string, geaendert: string) => ({
      kennung, name: "Kunden säubern", schritte: [{ art: "datum" as const, spalte: "angelegt", unlesbar: "lassen" as const, an: true }],
      spalten: ["angelegt"], quelle: "kunden.csv", angelegt: geaendert, geaendert, zuletzt: [],
    });
    await ablage.rezeptSpeichern(rezept("00000000-0000-4000-8000-000000000001", "2026-11-01T00:00:00Z"));
    await ablage.rezeptSpeichern(rezept("00000000-0000-4000-8000-000000000002", "2026-11-05T00:00:00Z"));
    const db = await openDB(NAME);
    await db.put("rezepte", { kennung: "kaputt", name: "" });
    db.close();
    expect((await ablage.rezepte()).map((r) => r.kennung.slice(-1))).toEqual(["2", "1"]);
    await ablage.rezeptEntfernen("00000000-0000-4000-8000-000000000002");
    expect((await ablage.rezepte()).length).toBe(1);
  });
});
