// XPath über lieferungen.xml: Treffer als Zeiger der Lesart von Strukturblick (Attribute, Text neben Elementen,
// gleichnamige Geschwister als Liste, Präfixe), Zahlen und Text als Wert, Fehler im Ausdruck.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { XML_FORMAT } from "../../formate/xml";
import { KEIN, knotenZu } from "../../kern";
import { wertAus } from "../wert";
import { XpathFehler, xpathAuswerten } from "./xpath";

const text = readFileSync(new URL("../../../../pruefdaten/lieferungen.xml", import.meta.url), "utf8");
const index = XML_FORMAT.lesen(text).index!;

async function knoten(ausdruck: string): Promise<{ zeiger: (string | null)[]; werte: unknown[] }> {
  const r = await xpathAuswerten(text, ausdruck);
  if (r.art !== "knoten") throw new Error("Knoten erwartet");
  const werte = r.zeiger.map((z) => {
    const k = z === null ? KEIN : knotenZu(index, text, z);
    expect(k, `Zeiger ${z} trifft keinen Knoten`).not.toBe(KEIN);
    return wertAus(index, text, k);
  });
  return { zeiger: [...r.zeiger], werte };
}

describe("XPath über XML", () => {
  it("findet Attribute in der Liste gleichnamiger Elemente", async () => {
    const r = await knoten("//lieferung/@nr");
    expect(r.zeiger.length).toBe(12);
    expect(r.zeiger[0]).toBe("/lieferungen/lieferung/0/@nr");
    expect(r.werte.slice(0, 2)).toEqual(["L-2401", "L-2402"]);
  });

  it("übersetzt Elemente nur mit Text, einzelne und mehrfache Elemente mit Präfix und Text daneben", async () => {
    expect((await knoten("/lieferungen/lieferung[2]/kunde/name")).zeiger).toEqual(["/lieferungen/lieferung/1/kunde/name"]);
    const pos = await knoten("//lieferung[position() <= 2]/hl:position");
    expect(pos.zeiger).toEqual(["/lieferungen/lieferung/0/hl:position", "/lieferungen/lieferung/1/hl:position/0", "/lieferungen/lieferung/1/hl:position/1"]);
    const texte = await knoten("//lieferung[1]/hl:position/text()");
    expect(texte.zeiger).toEqual(["/lieferungen/lieferung/0/hl:position/#text"]);
    expect(texte.werte).toEqual(["Quark & Schmand Paket"]);
    expect((await knoten("//lieferung[2]/hinweis")).werte).toEqual(["Bitte beim Nachbarn <Haus 2> abgeben"]);
  });

  it("filtert mit Bedingungen und rechnet Zahlen, Text und Wahrheitswerte", async () => {
    const offen = await knoten("//lieferung[bezahlt = 'nein']/@nr");
    expect(offen.werte[0]).toBe("L-2401");
    expect(await xpathAuswerten(text, "count(//lieferung)")).toEqual({ art: "wert", wert: 12 });
    expect(await xpathAuswerten(text, "string(/lieferungen/@stand)")).toEqual({ art: "wert", wert: "2026-11-10" });
    expect(await xpathAuswerten(text, "count(//hl:position) > 12")).toEqual({ art: "wert", wert: true });
  });

  it("meldet Fehler im Ausdruck und kaputtes XML", async () => {
    await expect(xpathAuswerten(text, "//lieferung[")).rejects.toBeInstanceOf(XpathFehler);
    await expect(xpathAuswerten("<a><b></a>", "//b")).rejects.toBeInstanceOf(XpathFehler);
  });
});
