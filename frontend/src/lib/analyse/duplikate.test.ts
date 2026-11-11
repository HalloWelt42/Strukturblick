// Duplikate: Gruppen nach Schlüssel und ganzer Zeile, Unterschiede, Vorauswahl und Schlüsselvorschlag.

import { describe, expect, it } from "vitest";
import { format } from "../formate/registrierung";
import { tabelleBauen } from "./tabelle";
import { duplikateFinden, schluesselVorschlag, vorauswahl, wegfallendeDuplikate } from "./duplikate";

const CSV = ["kundennr;name;ort;telefon", "K-1;Ole;Leipzig;", "K-2;Ines;Dresden;0351 1", "K-1;Ole;leipzig;0341 2", "K-3;Jan;Halle;", "K-2;Ines;Dresden;0351 1", "K-4;Ute;Halle;", "K-5;Tom;Jena;", "K-6;Eva;Gera;", "K-7;Kai;Suhl;", "K-8;Lea;Hof;", "K-9;Max;Ulm;", "K-10;Pia;Bonn;", "K-11;Ida;Kiel;", "K-12;Leo;Linz;", "K-13;Mia;Graz;", "K-14;Udo;Wien;", "K-15;Ali;Bern;", "K-16;Bea;Genf;", "K-17;Cem;Basel;", "K-18;Dan;Zug;", "K-19;Eli;Chur;", "K-20;Fin;Sion;", "K-21;Gus;Thun;", "K-22;Hal;Biel;", "K-23;Isa;Aarau;", "K-24;Jon;Olten;", "K-25;Kim;Baden;", "K-26;Lou;Uster;", "K-27;Mo;Wil;", "K-28;Nia;Rapperswil;", "K-29;Oda;Frauenfeld;", "K-30;Pit;Kreuzlingen;", "K-31;Quin;Arbon;", "K-32;Rio;Romanshorn;", "K-33;Sam;Wädenswil;", "K-34;Tia;Horgen;", "K-35;Ugo;Thalwil;", "K-36;Vea;Kilchberg;", "K-37;Wim;Adliswil;", "K-38;Xia;Langnau;", "K-39;Yan;Affoltern;", "K-40;Zoe;Dietikon;", ""].join("\n");
const index = format("csv").lesen(CSV).index!;
const t = tabelleBauen(index, CSV, 0);

describe("Duplikate", () => {
  it("findet Gruppen nach Schlüssel mit ihren Unterschieden", () => {
    const g = duplikateFinden(t, index, CSV, [0]);
    expect(g.map((x) => `${x.wert}:${x.zeilen.join(",")}`)).toEqual(["K-1:0,2", "K-2:1,4"]);
    expect(g[0].unterschiede.map((j) => t.spalten[j].name)).toEqual(["ort", "telefon"]);
    expect(g[1].unterschiede).toEqual([]);
  });

  it("findet ganz gleiche Zeilen", () => {
    expect(duplikateFinden(t, index, CSV, []).map((x) => x.zeilen)).toEqual([[1, 4]]);
  });

  it("wählt nach Regel und sammelt die wegfallenden Zeilen", () => {
    const g = duplikateFinden(t, index, CSV, [0]);
    expect(vorauswahl(t, index, CSV, g[0], "erste")).toBe(0);
    expect(vorauswahl(t, index, CSV, g[0], "letzte")).toBe(2);
    expect(vorauswahl(t, index, CSV, g[0], "meiste")).toBe(2);
    expect(wegfallendeDuplikate(g, (x) => vorauswahl(t, index, CSV, x, "erste"))).toEqual([2, 4]);
  });

  it("schlägt die Kundennummer als Schlüssel vor", () => {
    expect(schluesselVorschlag(t, index, CSV)).toBe(0);
  });
});
