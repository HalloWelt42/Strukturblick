import { describe, expect, it } from "vitest";
import { KnotenArt } from "../kern/strukturindex";
import { hinweiseFuer, istDatum, istDatumZeit, istZahltext } from "./hinweise";

const titel = (art: number, s: string) => hinweiseFuer(art, s).map((h) => h.titel);

describe("Hinweise zu Werten", () => {
  it("erkennt Text mit führender Null", () => {
    expect(titel(KnotenArt.text, "04109")).toEqual(["Text, sieht aus wie Zahl"]);
    expect(titel(KnotenArt.text, "007")).toEqual(["Text, sieht aus wie Zahl"]);
    expect(istZahltext("0,50")).toBe(false);
    expect(istZahltext("0")).toBe(false);
    expect(istZahltext("4109")).toBe(false);
    expect(istZahltext("0a1")).toBe(false);
  });

  it("gibt Zahlen und andere Arten keine Hinweise", () => {
    expect(titel(KnotenArt.zahl, "04109")).toEqual([]);
    expect(titel(KnotenArt.text, "Leipzig")).toEqual([]);
    expect(titel(KnotenArt.wahrheitswert, "true")).toEqual([]);
  });

  it("erkennt gültige Kalenderdaten", () => {
    expect(titel(KnotenArt.text, "2026-11-09")).toEqual(["Datum"]);
    expect(istDatum("2024-02-29")).toBe(true);
    expect(istDatum("2026-02-29")).toBe(false);
    expect(istDatum("2026-13-01")).toBe(false);
    expect(istDatum("2026-04-31")).toBe(false);
    expect(istDatum("09.11.2026")).toBe(false);
  });

  it("erkennt Zeitpunkte nach ISO 8601", () => {
    expect(titel(KnotenArt.text, "2026-11-10T08:15:00+01:00")).toEqual(["Datum und Zeit"]);
    expect(istDatumZeit("2026-11-10T08:15Z")).toBe(true);
    expect(istDatumZeit("2026-11-10 08:15:30.123")).toBe(true);
    expect(istDatumZeit("2026-11-10T24:00:00")).toBe(false);
    expect(istDatumZeit("2026-11-31T10:00:00")).toBe(false);
    expect(istDatumZeit("2026-11-10")).toBe(false);
  });
});
