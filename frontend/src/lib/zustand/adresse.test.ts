// Adressen: Lesen und Bauen unter beiden Basen, kurze Kennungen, Werte und Stelle, kaputte Adressen.

import { describe, expect, it } from "vitest";
import { adresseBauen, kennungFinden, kurzeKennung, namensteil, ortLesen, ortsWechsel, type Ort } from "./adresse";

const A = "3f9c2a71-5b0e-4c1d-9a7e-2d4f8b6c1e05";
const B = "3f9c2a71-77aa-4c1d-9a7e-2d4f8b6c1e06";
const C = "9b0e1d22-1111-4c1d-9a7e-2d4f8b6c1e07";

describe("Adressen", () => {
  it("baut und liest einen Ort im Dokument, auf dem Server und auf Pages", () => {
    const ort: Ort = { seite: "dokument", kennung: "9b0e1d22", name: "bestellungen.json", platz: "code", stelle: "/bestellungen/0", werte: { ziel: "php", grenzen: "attribute", namensraum: "App\\Daten" } };
    const server = adresseBauen(ort, "/");
    expect(server).toBe("/dokument/9b0e1d22/bestellungen-json/code?ziel=php&grenzen=attribute&namensraum=App%5CDaten&stelle=/bestellungen/0");
    const [pfad, suche] = server.split("?");
    // Gelesen kommt der lesbare Namensteil zurück; maßgeblich ist die Kennung
    const gelesen = { ...ort, name: "bestellungen-json" };
    expect(ortLesen(pfad, `?${suche}`, "/")).toEqual(gelesen);
    const pages = adresseBauen(ort, "/Strukturblick/");
    expect(pages.startsWith("/Strukturblick/dokument/9b0e1d22/")).toBe(true);
    expect(ortLesen(pages.split("?")[0], `?${pages.split("?")[1]}`, "/Strukturblick/")).toEqual(gelesen);
  });

  it("kennt Ablage, Arbeitsplatz und fängt Fremdes ab", () => {
    expect(adresseBauen({ seite: "ablage" }, "/Strukturblick/")).toBe("/Strukturblick/ablage");
    expect(adresseBauen({ seite: "arbeitsplatz" }, "/")).toBe("/");
    expect(ortLesen("/ablage", "", "/")).toEqual({ seite: "ablage" });
    expect(ortLesen("/Strukturblick", "", "/Strukturblick/")).toEqual({ seite: "arbeitsplatz" });
    expect(ortLesen("/irgendwas/x", "", "/")).toEqual({ seite: "arbeitsplatz" });
    expect(ortLesen("/anderes/dokument/x", "", "/Strukturblick/")).toEqual({ seite: "arbeitsplatz" });
    expect(ortLesen("/dokument/%E0%A4%A", "", "/")).toEqual({ seite: "arbeitsplatz" });
    expect(ortLesen("/dokument", "", "/")).toEqual({ seite: "arbeitsplatz" });
  });

  it("liest Dokumente auch ohne Ansicht und ohne Namen", () => {
    expect(ortLesen("/dokument/9b0e1d22", "", "/")).toEqual({ seite: "dokument", kennung: "9b0e1d22", name: "", platz: "", stelle: null, werte: {} });
    expect(ortLesen("/dokument/9b0e1d22/egal/graph", "?fokus=/a%20b&kaputt=%E0", "/")).toMatchObject({ platz: "graph", werte: { fokus: "/a b" } });
  });

  it("macht lesbare Namensteile", () => {
    expect(namensteil("Bestellungen 2026.json")).toBe("bestellungen-2026-json");
    expect(namensteil("Größe & Übersicht.csv")).toBe("groesse-uebersicht-csv");
    expect(namensteil("Café.xml")).toBe("cafe-xml");
    expect(namensteil("...")).toBe("dokument");
  });

  it("kürzt Kennungen eindeutig und findet sie wieder", () => {
    expect(kurzeKennung(C, [A, B, C])).toBe("9b0e1d22");
    expect(kurzeKennung(A, [A, B, C])).toBe("3f9c2a71-5");
    expect(kennungFinden("9b0e1d22", [A, B, C])).toBe(C);
    expect(kennungFinden("3f9c2a71", [A, B, C])).toBeNull();
    expect(kennungFinden("3f9c2a71-5", [A, B, C])).toBe(A);
    expect(kennungFinden(A, [A, B, C])).toBe(A);
    expect(kennungFinden("3f9c", [A, B, C])).toBeNull();
    expect(kurzeKennung("demo", ["demo"])).toBe("demo");
    expect(kennungFinden("demo", ["demo"])).toBe("demo");
  });

  it("unterscheidet Ortswechsel von Feinheiten", () => {
    const d = (platz: string, stelle: string | null = null): Ort => ({ seite: "dokument", kennung: "9b0e1d22", name: "x", platz, stelle, werte: {} });
    expect(ortsWechsel(d("baum"), d("baum", "/a"))).toBe(false);
    expect(ortsWechsel(d("baum"), d("code"))).toBe(true);
    expect(ortsWechsel(d("baum"), { seite: "ablage" })).toBe(true);
    expect(ortsWechsel({ seite: "ablage" }, { seite: "ablage" })).toBe(false);
  });
});
