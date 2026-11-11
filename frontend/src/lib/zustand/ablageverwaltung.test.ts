// Ablageverwaltung gegen eine Ablage im Arbeitsspeicher: Ordner, Papierkorb mit Rückgängig, Sichern und Einspielen.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LEERER_VERLAUF } from "../kern/verlauf";
import type { AbgelegtesDokument } from "../dienste/ablage";
import { SpeicherAblage } from "../dienste/ablage-speicher";
import { arbeitsplatz } from "./arbeitsplatz.svelte";
import { ablageverwaltung } from "./ablageverwaltung.svelte";
import { meldungen } from "./meldungen.svelte";

const dokument = (kennung: string, name: string, ordner = ""): AbgelegtesDokument => ({
  kennung, name, ordner, formatWahl: null, optionen: {}, text: `{"name":"${name}"}`, verlauf: LEERER_VERLAUF, geaendert: "2026-11-11T10:00:00.000Z",
});

let ablage: SpeicherAblage;

beforeEach(async () => {
  ablage = new SpeicherAblage();
  await ablage.speichern(dokument("a", "kunden.json"));
  await ablage.speichern(dokument("b", "bestellungen.json", "Import"));
  await arbeitsplatz.starten(ablage);
  await ablageverwaltung.neuLaden();
});

afterEach(() => meldungen.schliessen());

describe("Ablageverwaltung", () => {
  it("kennt leere und gefüllte Ordner", async () => {
    await ablageverwaltung.ordnerAnlegen("Leer");
    expect(ablageverwaltung.ordner).toEqual(["Import", "Leer"]);
    expect(ablageverwaltung.ordnerWahl).toBe("Leer");
  });

  it("meldet doppelte Ordner, statt sie anzulegen", async () => {
    expect(await ablageverwaltung.ordnerAnlegen("Import")).toBe(false);
    expect(meldungen.aktuell?.text).toContain("gibt es schon");
  });

  it("legt in den Papierkorb und holt über Rückgängig zurück", async () => {
    await ablageverwaltung.entfernen(["a"]);
    expect(arbeitsplatz.dokumente.map((d) => d.kennung)).toEqual(["b"]);
    expect(ablageverwaltung.papierkorb.map((d) => d.kennung)).toEqual(["a"]);
    const meldung = meldungen.aktuell;
    expect(meldung?.aktion?.titel).toBe("Rückgängig");
    meldung?.aktion?.ausfuehren();
    await new Promise((r) => setTimeout(r, 0));
    expect(arbeitsplatz.dokumente.map((d) => d.kennung).sort()).toEqual(["a", "b"]);
    expect(ablageverwaltung.papierkorb).toEqual([]);
  });

  it("verschiebt und benennt um", async () => {
    await ablageverwaltung.verschieben(["a"], "Import");
    await ablageverwaltung.umbenennen("a", "kunden-november.json");
    expect(arbeitsplatz.dokumente.find((d) => d.kennung === "a")).toMatchObject({ name: "kunden-november.json", ordner: "Import" });
  });

  it("spielt eine Sicherung zusätzlich ein, mit neuen Kennungen und den Ordnern", async () => {
    await ablageverwaltung.ordnerAnlegen("Leer");
    const sicherung = await ablageverwaltung.sicherung();
    expect(sicherung.dokumente).toHaveLength(2);

    const ziel = new SpeicherAblage();
    await ziel.speichern(dokument("x", "vorhanden.json"));
    await arbeitsplatz.starten(ziel);
    await ablageverwaltung.einspielen(JSON.stringify(sicherung));

    const namen = arbeitsplatz.dokumente.map((d) => d.name).sort();
    expect(namen).toEqual(["bestellungen.json", "kunden.json", "vorhanden.json"]);
    expect(arbeitsplatz.dokumente.every((d) => !["a", "b"].includes(d.kennung))).toBe(true);
    expect(ablageverwaltung.ordner).toEqual(["Import", "Leer"]);
    expect((await ziel.laden(arbeitsplatz.dokumente.find((d) => d.name === "kunden.json")!.kennung))?.text).toBe('{"name":"kunden.json"}');
  });

  it("weist fremde Dateien beim Einspielen ab", async () => {
    await ablageverwaltung.einspielen('{"art":"etwas anderes"}');
    expect(meldungen.aktuell?.art).toBe("fehler");
    expect(arbeitsplatz.dokumente).toHaveLength(2);
  });
});
