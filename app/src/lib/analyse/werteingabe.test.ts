import { describe, expect, it } from "vitest";
import { KnotenArt } from "../kern/strukturindex";
import { eingabeAnfang, neuerWertAus } from "./werteingabe";
import { textstelle } from "./textstelle";

describe("Eingabe beim direkten Bearbeiten", () => {
  it("lässt Zahlen Zahlen, solange die Eingabe eine gültige Zahl ist", () => {
    expect(neuerWertAus(KnotenArt.zahl, "2.59")).toEqual({ art: "zahl", roh: "2.59" });
    expect(neuerWertAus(KnotenArt.zahl, " -1e3 ")).toEqual({ art: "zahl", roh: "-1e3" });
    expect(neuerWertAus(KnotenArt.zahl, "2,59")).toEqual({ art: "text", wert: "2,59" });
    expect(neuerWertAus(KnotenArt.zahl, "04109")).toEqual({ art: "text", wert: "04109" });
  });

  it("lässt Text Text, auch wenn er wie eine Zahl aussieht", () => {
    expect(neuerWertAus(KnotenArt.text, "42")).toEqual({ art: "text", wert: "42" });
    expect(neuerWertAus(KnotenArt.text, "true")).toEqual({ art: "text", wert: "true" });
  });

  it("setzt Wahrheitswerte und nichts passend", () => {
    expect(neuerWertAus(KnotenArt.wahrheitswert, "false")).toEqual({ art: "wahrheitswert", wert: false });
    expect(neuerWertAus(KnotenArt.wahrheitswert, "null")).toEqual({ art: "nichts" });
    expect(neuerWertAus(KnotenArt.nichts, "true")).toEqual({ art: "wahrheitswert", wert: true });
    expect(neuerWertAus(KnotenArt.nichts, "7")).toEqual({ art: "zahl", roh: "7" });
    expect(neuerWertAus(KnotenArt.nichts, "Leipzig")).toEqual({ art: "text", wert: "Leipzig" });
  });

  it("nimmt bei Formaten ohne Typen immer Text", () => {
    expect(neuerWertAus(KnotenArt.zahl, "42", false)).toEqual({ art: "text", wert: "42" });
    expect(neuerWertAus(KnotenArt.nichts, "null", false)).toEqual({ art: "text", wert: "null" });
    expect(neuerWertAus(KnotenArt.zahl, "42", true)).toEqual({ art: "zahl", roh: "42" });
  });

  it("beginnt mit dem Inhalt, bei leerem nichts mit null", () => {
    expect(eingabeAnfang(KnotenArt.nichts, "")).toBe("null");
    expect(eingabeAnfang(KnotenArt.nichts, "~")).toBe("~");
    expect(eingabeAnfang(KnotenArt.text, "")).toBe("");
  });
});

describe("Textstelle", () => {
  it("rechnet Zeile und Spalte ab 1", () => {
    const t = "{\n  \"a\": 1,\n  \"b\": 2\n}";
    expect(textstelle(t, 0)).toEqual({ zeile: 1, spalte: 1 });
    expect(textstelle(t, t.indexOf("2"))).toEqual({ zeile: 3, spalte: 8 });
    expect(textstelle(t, t.indexOf("\n"))).toEqual({ zeile: 1, spalte: 2 });
    expect(textstelle(t, 10_000)).toEqual({ zeile: 4, spalte: 2 });
  });
});
