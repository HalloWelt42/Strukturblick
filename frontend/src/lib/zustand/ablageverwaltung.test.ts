// Ablageverwaltung gegen eine Ablage im Arbeitsspeicher: Ordner, Papierkorb mit Rückgängig, Sichern und Einspielen.

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LEERER_VERLAUF } from "../kern/verlauf";
import { Ablagefehler, type Ablage, type AbgelegtesDokument, type Arbeitsstand, type Dokumentkopf, type Papierkorbeintrag } from "../dienste/ablage";
import { arbeitsplatz } from "./arbeitsplatz.svelte";
import { ablageverwaltung } from "./ablageverwaltung.svelte";
import { meldungen } from "./meldungen.svelte";

class SpeicherAblage implements Ablage {
  readonly ort = "Probe";
  readonly hinweis = "Nur im Test";
  dokumente = new Map<string, AbgelegtesDokument & { geloescht?: string }>();
  ordnerNamen = new Set<string>();
  stand: Arbeitsstand = { offen: [], aktiv: null };

  private kopf(d: AbgelegtesDokument): Dokumentkopf {
    return { kennung: d.kennung, name: d.name, ordner: d.ordner ?? "", groesse: d.text.length, geaendert: d.geaendert };
  }
  async liste(): Promise<Dokumentkopf[]> {
    return [...this.dokumente.values()].filter((d) => !d.geloescht).map((d) => this.kopf(d));
  }
  async laden(k: string): Promise<AbgelegtesDokument | null> {
    const d = this.dokumente.get(k);
    return d && !d.geloescht ? d : null;
  }
  async speichern(d: AbgelegtesDokument): Promise<void> {
    this.dokumente.set(d.kennung, { ...d });
  }
  async aendern(k: string, teil: { name?: string; ordner?: string }): Promise<void> {
    const d = this.dokumente.get(k);
    if (d) this.dokumente.set(k, { ...d, ...teil });
  }
  async entfernen(k: string): Promise<void> {
    const d = this.dokumente.get(k);
    if (d) this.dokumente.set(k, { ...d, geloescht: new Date().toISOString() });
  }
  async papierkorb(): Promise<Papierkorbeintrag[]> {
    return [...this.dokumente.values()].filter((d) => d.geloescht).map((d) => ({ ...this.kopf(d), geloescht: d.geloescht! }));
  }
  async wiederherstellen(k: string): Promise<void> {
    const d = this.dokumente.get(k);
    if (d) this.dokumente.set(k, { ...d, geloescht: undefined });
  }
  async endgueltigEntfernen(k: string): Promise<void> {
    this.dokumente.delete(k);
  }
  async ordner(): Promise<string[]> {
    const n = new Set(this.ordnerNamen);
    for (const d of this.dokumente.values()) if (d.ordner && !d.geloescht) n.add(d.ordner);
    return [...n].sort();
  }
  async ordnerAnlegen(name: string): Promise<void> {
    if ((await this.ordner()).includes(name)) throw new Ablagefehler(`Den Ordner ${name} gibt es schon`);
    this.ordnerNamen.add(name);
  }
  async ordnerUmbenennen(alt: string, neu: string): Promise<void> {
    this.ordnerNamen.delete(alt);
    this.ordnerNamen.add(neu);
    for (const [k, d] of this.dokumente) if (d.ordner === alt) this.dokumente.set(k, { ...d, ordner: neu });
  }
  async ordnerEntfernen(name: string): Promise<void> {
    if ([...this.dokumente.values()].some((d) => d.ordner === name && !d.geloescht)) throw new Ablagefehler(`Der Ordner ${name} ist nicht leer`);
    this.ordnerNamen.delete(name);
  }
  async arbeitsstand(): Promise<Arbeitsstand> {
    return this.stand;
  }
  async arbeitsstandSpeichern(s: Arbeitsstand): Promise<void> {
    this.stand = s;
  }
}

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
