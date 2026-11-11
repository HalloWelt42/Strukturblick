// Beispiele öffnen: im Ordner Beispiele angelegt, beim zweiten Mal nur geöffnet, nach dem Papierkorb frisch angelegt.

import { afterEach, describe, expect, it, vi } from "vitest";
import { SpeicherAblage } from "../dienste/ablage-speicher";
import { arbeitsplatz } from "./arbeitsplatz.svelte";
import { beispieleOeffnen, BEISPIELE, BEISPIEL_ORDNER } from "./beispiele";
import { meldungen } from "./meldungen.svelte";

// Neue Dokumente lesen im Worker; den gibt es unter Node nicht. Ein stiller Ersatz genügt, gelesen wird hier nichts.
vi.stubGlobal("Worker", class { onmessage = null; onerror = null; postMessage(): void {} terminate(): void {} });

afterEach(() => meldungen.schliessen());

describe("Beispiele", () => {
  it("legt sie einmal an und öffnet danach die vorhandenen", async () => {
    const ablage = new SpeicherAblage();
    await arbeitsplatz.starten(ablage);
    await beispieleOeffnen();
    const namen = () => arbeitsplatz.dokumente.filter((d) => d.ordner === BEISPIEL_ORDNER).map((d) => d.name).sort();
    expect(namen()).toEqual(BEISPIELE.map((b) => b.name).sort());
    expect(arbeitsplatz.aktivesBlatt?.name).toBe("bestellungen.json");
    expect(arbeitsplatz.aktivesBlatt?.text).toContain("Hofladen Lindenhof");

    await beispieleOeffnen();
    expect(namen()).toHaveLength(BEISPIELE.length);
    expect(arbeitsplatz.blaetter).toHaveLength(BEISPIELE.length);
  });

  it("legt sie nach dem Papierkorb frisch an", async () => {
    const ablage = new SpeicherAblage();
    await arbeitsplatz.starten(ablage);
    await beispieleOeffnen();
    for (const d of await ablage.liste()) await ablage.entfernen(d.kennung);
    await arbeitsplatz.listeNeu();
    await beispieleOeffnen();
    expect((await ablage.liste()).length).toBe(BEISPIELE.length);
  });

  it("enthält nur erfundene Kontaktdaten", async () => {
    const kunden = await BEISPIELE.find((b) => b.name === "kunden.csv")!.laden();
    expect(kunden).not.toMatch(/@(?!example\.org)[\w.-]+;/);
    expect(kunden.split("\n").slice(1).filter(Boolean).every((z) => z.split(";")[5].startsWith("030 23125 "))).toBe(true);
  });
});
