// Markdown-Tabellen: finden (auch ohne äußere Striche, mit Text drumherum), Index mit Spannen, mehrere Tabellen nach
// Überschrift, Schreiben an Spannen und Erkennen.

import { describe, expect, it } from "vitest";
import { anwenden } from "../kern/aenderung";
import { inhalt, KEIN, KnotenArt, schluessel, type Strukturindex } from "../kern/strukturindex";
import { knotenZu } from "../kern/pfade";
import { erkennen } from "./registrierung";
import { MARKDOWN_FORMAT } from "./markdown";

function wertAus(index: Strukturindex, text: string, k = 0): unknown {
  const art = index.art[k];
  if (art === KnotenArt.objekt || art === KnotenArt.liste) {
    const kinder: number[] = [];
    for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) kinder.push(c);
    return art === KnotenArt.liste ? kinder.map((c) => wertAus(index, text, c)) : Object.fromEntries(kinder.map((c) => [schluessel(index, text, c), wertAus(index, text, c)]));
  }
  return inhalt(index, text, k);
}

const EINE = `Bestellungen der Woche:

| nr  | kunde        | betrag |
|-----|:-------------|-------:|
| B-1 | Ida Wendt    |   7,50 |
| B-2 | A \\| B      |  12,00 |
| B-3 | Zeile<br>zwei |        |

Danach folgt Text.
`;

const ZWEI = `# Hofladen

## Bestellungen
Kurz erklärt.

nr | menge
---|---
B-1 | 2

## Kunden
| name | ort |
|---|---|
| Ida | Halle |
`;

describe("Markdown lesen", () => {
  it("eine Tabelle ist die Wurzel; Kopfzeile gibt Namen, \\| und <br> werden gelesen", () => {
    const r = MARKDOWN_FORMAT.lesen(EINE);
    expect(r.diagnosen).toEqual([]);
    expect(wertAus(r.index!, EINE)).toEqual([
      { nr: "B-1", kunde: "Ida Wendt", betrag: "7,50" },
      { nr: "B-2", kunde: "A | B", betrag: "12,00" },
      { nr: "B-3", kunde: "Zeile\nzwei", betrag: "" },
    ]);
    const k = knotenZu(r.index!, EINE, "/0/kunde");
    expect(EINE.slice(r.index!.inhaltVon[k], r.index!.inhaltBis[k])).toBe("Ida Wendt");
  });

  it("mehrere Tabellen heißen nach ihrer Überschrift, auch ohne äußere Striche", () => {
    const r = MARKDOWN_FORMAT.lesen(ZWEI);
    expect(wertAus(r.index!, ZWEI)).toEqual({ Bestellungen: [{ nr: "B-1", menge: "2" }], Kunden: [{ name: "Ida", ort: "Halle" }] });
  });

  it("meldet abweichende Zellenzahl und fehlende Tabellen", () => {
    expect(MARKDOWN_FORMAT.lesen("|a|b|\n|---|---|\n|1|2|3|\n").diagnosen[0].meldung).toBe("Die Zeile hat 3 Zellen, die Kopfzeile 2");
    expect(MARKDOWN_FORMAT.lesen("# Nur Text\n").index).toBeNull();
  });

  it("erkennt Markdown-Tabellen, aber keine anderen Formate", () => {
    expect(erkennen(EINE).kennung).toBe("markdown");
    expect(erkennen("a;b\n1;2\n").kennung).toBe("csv");
    expect(erkennen("a: 1\n").kennung).toBe("yaml");
  });
});

describe("Markdown schreiben", () => {
  const r = MARKDOWN_FORMAT.lesen(EINE);
  const index = r.index!;
  const aendern = (a: readonly { von: number; bis: number; einfuegen: string }[]) => anwenden(EINE, a).text;

  it("ersetzt den Inhalt einer Zelle und maskiert | und Umbrüche", () => {
    const k = knotenZu(index, EINE, "/0/kunde");
    expect(aendern([MARKDOWN_FORMAT.wertSchreiben(EINE, index, k, { art: "text", wert: "X | Y\nZ" }, r.merkmale)])).toContain("| B-1 | X \\| Y<br>Z    |   7,50 |");
  });

  it("entfernt Zeilen und Spalten samt Strich, Text drumherum bleibt", () => {
    const ohneZeile = aendern(MARKDOWN_FORMAT.eintraegeEntfernen(EINE, index, 0, [1]));
    expect(ohneZeile).not.toContain("B-2");
    expect(ohneZeile).toContain("Danach folgt Text.");
    const ohneKunde = aendern(MARKDOWN_FORMAT.spalteEntfernen(EINE, index, 0, "kunde"));
    expect(ohneKunde.split("\n").slice(2, 5)).toEqual(["| nr  | betrag |", "|-----|-------:|", "| B-1 |   7,50 |"]);
    const ohneNr = aendern(MARKDOWN_FORMAT.spalteEntfernen(EINE, index, 0, "nr"));
    expect(ohneNr.split("\n")[2]).toBe("| kunde        | betrag |");
    for (const t of [ohneZeile, ohneKunde, ohneNr]) expect(MARKDOWN_FORMAT.lesen(t).diagnosen).toEqual([]);
  });
});
