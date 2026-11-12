import { describe, expect, it } from "vitest";
import { CSV_FORMAT } from "./csv";
import { Formatfehler, type Leseergebnis, type NeuerWert } from "./vertrag";
import { inhalt, KEIN, KnotenArt, kinderVon, schluessel, type Strukturindex } from "../kern/strukturindex";
import { knotenZu, zeigerVon } from "../kern/pfade";
import { leistungstest, zeitgrenze } from "../../pruefhilfen/zeitgrenze";

function lies(text: string, optionen?: Record<string, string | boolean>): Leseergebnis & { index: Strukturindex } {
  const e = CSV_FORMAT.lesen(text, optionen);
  if (e.index === null) throw new Error("kein Index");
  return { ...e, index: e.index };
}

/** Datensätze als Liste von Objekten (Schlüssel zu Inhalt). */
function tabelle(text: string, index: Strukturindex): Record<string, string>[] {
  return [...kinderVon(index, 0)].map((d) => Object.fromEntries([...kinderVon(index, d)].map((c) => [schluessel(index, text, c), inhalt(index, text, c)])));
}

function anwenden(text: string, a: { von: number; bis: number; einfuegen: string }): string {
  return text.slice(0, a.von) + a.einfuegen + text.slice(a.bis);
}

describe("CSV lesen", () => {
  it("liest Komma-CSV mit Kopfzeile: Art, Schlüssel, Inhalt und Spannen", () => {
    const text = "name,ort\nAnna,Leipzig\nBen,Köln\n";
    const { index, diagnosen, merkmale } = lies(text);
    expect(diagnosen).toEqual([]);
    expect(merkmale).toEqual({ trennzeichen: ",", kopfzeile: true, zeilenende: "lf", zeilen: 2, spalten: 2 });
    expect(index.art[0]).toBe(KnotenArt.liste);
    expect(index.kinder[0]).toBe(2);
    const [d1] = [...kinderVon(index, 0)];
    expect(index.art[d1]).toBe(KnotenArt.objekt);
    expect(index.schluesselVon[d1]).toBe(KEIN);
    expect(text.slice(index.von[d1], index.bis[d1])).toBe("Anna,Leipzig");
    const [name, ort] = [...kinderVon(index, d1)];
    expect(index.art[name]).toBe(KnotenArt.text);
    expect([index.schluesselVon[name], index.schluesselBis[name]]).toEqual([0, 4]);
    expect([index.schluesselVon[ort], index.schluesselBis[ort]]).toEqual([5, 8]);
    expect(index.schluesselDekodiert.has(name)).toBe(false);
    expect(schluessel(index, text, ort)).toBe("ort");
    expect(inhalt(index, text, ort)).toBe("Leipzig");
    expect(text.slice(index.von[ort], index.bis[ort])).toBe("Leipzig");
    expect(tabelle(text, index)).toEqual([
      { name: "Anna", ort: "Leipzig" },
      { name: "Ben", ort: "Köln" },
    ]);
  });

  it("liest Anführungszeichen: Spanne mit, Inhalt ohne, verdoppelte dekodiert, Umbruch in der Zelle", () => {
    const text = 'id;"Be""schreibung"\n1;"a;b"\n2;"sagt ""hallo"""\n3;"zwei\nZeilen"\n4;""';
    const { index, diagnosen, merkmale } = lies(text);
    expect(diagnosen).toEqual([]);
    expect(merkmale.trennzeichen).toBe(";");
    expect(merkmale.kopfzeile).toBe(true);
    expect(merkmale.zeilen).toBe(4);
    const zellen = [...kinderVon(index, 0)].map((d) => [...kinderVon(index, d)][1]);
    expect(schluessel(index, text, zellen[0])).toBe('Be"schreibung');
    expect(text.slice(index.schluesselVon[zellen[0]], index.schluesselBis[zellen[0]])).toBe('"Be""schreibung"');
    expect(text.slice(index.von[zellen[0]], index.bis[zellen[0]])).toBe('"a;b"');
    expect(text.slice(index.inhaltVon[zellen[0]], index.inhaltBis[zellen[0]])).toBe("a;b");
    expect(index.dekodiert.has(zellen[0])).toBe(false);
    expect(inhalt(index, text, zellen[1])).toBe('sagt "hallo"');
    expect(inhalt(index, text, zellen[2])).toBe("zwei\nZeilen");
    expect(inhalt(index, text, zellen[3])).toBe("");
  });

  it("erkennt Tabulator und Pipe", () => {
    expect(lies("a\tb\n1\t2\n").merkmale.trennzeichen).toBe("\t");
    expect(lies("a|b|c\nx|y|z\n").merkmale.trennzeichen).toBe("|");
  });

  it("bevorzugt Semikolon vor Dezimalkomma", () => {
    const { merkmale, index } = lies("preis;menge\n1,50;2\n3,25;4\n");
    expect(merkmale.trennzeichen).toBe(";");
    expect(merkmale.spalten).toBe(2);
    expect(index.kinder[0]).toBe(2);
  });

  it.each([
    ["lf", "a,b\n1,2\n3,4"],
    ["crlf", "a,b\r\n1,2\r\n3,4\r\n"],
    ["cr", "a,b\r1,2\r3,4\r"],
  ])("erkennt das Zeilenende %s", (art, text) => {
    const { merkmale, index, diagnosen } = lies(text);
    expect(diagnosen).toEqual([]);
    expect(merkmale.zeilenende).toBe(art);
    expect(tabelle(text, index)).toEqual([
      { a: "1", b: "2" },
      { a: "3", b: "4" },
    ]);
  });

  it("liest Zellen in Anführungszeichen mit reinem CR", () => {
    const text = 'a,b\r"x\ry",2\r';
    const { index, merkmale } = lies(text);
    expect(merkmale.zeilenende).toBe("cr");
    expect(tabelle(text, index)).toEqual([{ a: "x\ry", b: "2" }]);
  });

  it("ohne Kopfzeile heißen die Spalten Spalte 1, Spalte 2; der Schlüssel liegt auf der Zelle", () => {
    const text = "1,2\n3,4\n";
    const { index, merkmale } = lies(text);
    expect(merkmale.kopfzeile).toBe(false);
    expect(merkmale.zeilen).toBe(2);
    const zelle = [...kinderVon(index, [...kinderVon(index, 0)][1])][1];
    expect(schluessel(index, text, zelle)).toBe("Spalte 2");
    expect([index.schluesselVon[zelle], index.schluesselBis[zelle]]).toEqual([index.von[zelle], index.bis[zelle]]);
    expect(tabelle(text, index)).toEqual([
      { "Spalte 1": "1", "Spalte 2": "2" },
      { "Spalte 1": "3", "Spalte 2": "4" },
    ]);
  });

  it("Leseoptionen übersteuern Trennzeichen und Kopfzeile", () => {
    const text = "a;b,c\nd;e,f\n";
    const komma = lies(text, { trennzeichen: ",", kopfzeile: false });
    expect(komma.merkmale).toMatchObject({ trennzeichen: ",", kopfzeile: false, zeilen: 2 });
    expect(tabelle(text, komma.index)[0]).toEqual({ "Spalte 1": "a;b", "Spalte 2": "c" });
    expect(lies("x\ty\n1\t2\n", { trennzeichen: "tab" }).merkmale.trennzeichen).toBe("\t");
    expect(lies("1,2\n3,4\n", { kopfzeile: true }).merkmale.zeilen).toBe(1);
    const falsch = lies("a,b\n1,2\n", { trennzeichen: "::" });
    expect(falsch.merkmale.trennzeichen).toBe(",");
    expect(falsch.diagnosen[0].schwere).toBe("warnung");
  });

  it("leere Zellen sind leere Texte, leere Zeilen zählen nicht", () => {
    const text = "a,b,c\n,x,\n\n\n1,,3\n";
    const { index, diagnosen, merkmale } = lies(text);
    expect(diagnosen).toEqual([]);
    expect(merkmale.zeilen).toBe(2);
    expect(tabelle(text, index)).toEqual([
      { a: "", b: "x", c: "" },
      { a: "1", b: "", c: "3" },
    ]);
    for (const d of kinderVon(index, 0)) for (const c of kinderVon(index, d)) expect(index.art[c]).toBe(KnotenArt.text);
  });

  it("Zahlen und Wahrheitswerte bleiben Texte mit Rohtext", () => {
    const text = "plz,betrag,gross,ok\n04109,\"1.234,50\",12345678901234567890,true\n";
    const { index } = lies(text);
    expect(tabelle(text, index)).toEqual([{ plz: "04109", betrag: "1.234,50", gross: "12345678901234567890", ok: "true" }]);
  });

  it("Byte-Order-Mark gehört nicht zum ersten Spaltennamen", () => {
    const text = "﻿name,ort\nA,B\n";
    expect(tabelle(text, lies(text).index)).toEqual([{ name: "A", ort: "B" }]);
  });

  it("zählt Positionen in UTF-16 (Emojis)", () => {
    const text = "tier,laut\n🐄,muh\n";
    const { index } = lies(text);
    const laut = knotenZu(index, text, "/0/laut");
    expect(index.von[laut]).toBe(13);
    expect(text.slice(index.von[laut], index.bis[laut])).toBe("muh");
    const tier = knotenZu(index, text, "/0/tier");
    expect(index.bis[tier] - index.von[tier]).toBe(2);
  });

  it("leerer Text und reine Kopfzeile ergeben eine leere Liste", () => {
    const leer = lies("");
    expect(leer.index.anzahl).toBe(1);
    expect(leer.merkmale).toMatchObject({ zeilen: 0, spalten: 0 });
    const kopf = lies("a,b,c\n");
    expect(kopf.index.kinder[0]).toBe(0);
    expect(kopf.merkmale).toMatchObject({ zeilen: 0, spalten: 3, kopfzeile: true });
  });
});

describe("CSV mit Fehlern", () => {
  it("meldet ein nicht geschlossenes Anführungszeichen und liest weiter", () => {
    const text = 'a,b\n1,"offen\n2,3\n';
    const { index, diagnosen } = lies(text);
    const fehler = diagnosen.filter((d) => d.schwere === "fehler");
    expect(fehler).toHaveLength(1);
    expect(fehler[0].von).toBe(text.indexOf('"'));
    expect(fehler[0].meldung).toContain("Anführungszeichen");
    expect(tabelle(text, index)).toEqual([
      { a: "1", b: '"offen' },
      { a: "2", b: "3" },
    ]);
  });

  it("warnt bei Zeichen nach dem schließenden Anführungszeichen und behält sie", () => {
    const text = 'a,b\n"x"y,2\n';
    const { index, diagnosen } = lies(text);
    expect(diagnosen).toHaveLength(1);
    expect(diagnosen[0].schwere).toBe("warnung");
    expect(tabelle(text, index)).toEqual([{ a: "xy", b: "2" }]);
  });

  it("warnt je Zeile mit abweichender Zellenzahl; fehlende Zellen fehlen, überzählige heißen Spalte n", () => {
    const text = "a,b,c\n1,2\n1,2,3,4\n1,2,3\n";
    const { index, diagnosen } = lies(text);
    expect(diagnosen.map((d) => d.meldung)).toEqual(["Zeile 2 hat 2 Zellen, erwartet sind 3.", "Zeile 3 hat 4 Zellen, erwartet sind 3."]);
    expect(text.slice(diagnosen[0].von, diagnosen[0].bis)).toBe("1,2");
    expect(tabelle(text, index)).toEqual([
      { a: "1", b: "2" },
      { a: "1", b: "2", c: "3", "Spalte 4": "4" },
      { a: "1", b: "2", c: "3" },
    ]);
  });

  it("begrenzt die Warnungen auf 20 und fasst den Rest zusammen", () => {
    const text = "a,b\n" + "1\n".repeat(25) + "1,2\n";
    const { diagnosen } = lies(text);
    expect(diagnosen).toHaveLength(21);
    expect(diagnosen[20].meldung).toBe("5 weitere Zeilen weichen in der Zahl der Zellen ab.");
    expect(diagnosen[19].meldung).toBe("Zeile 21 hat 1 Zelle, erwartet sind 2.");
  });

  it("warnt bei doppelten Spaltennamen", () => {
    const text = "a,b,a\n1,2,3\n";
    const { diagnosen } = lies(text);
    expect(diagnosen).toHaveLength(1);
    expect(diagnosen[0].meldung).toContain('"a"');
    expect(diagnosen[0].von).toBe(4);
  });

  it("wirft nie, auch nicht bei Unsinn", () => {
    for (const t of ['"', '""', ",", "\r", "\n\r\n", '"a""', 'a,"b"c"d', "﻿", ';;;\n"\n']) {
      expect(() => CSV_FORMAT.lesen(t)).not.toThrow();
      expect(CSV_FORMAT.lesen(t).index).not.toBeNull();
    }
  });
});

describe("CSV erkennen", () => {
  it("erkennt mehrere Zeilen mit gleicher Zahl von Trennzeichen", () => {
    expect(CSV_FORMAT.erkennen("a,b,c\n1,2,3\n4,5,6\n")).toBeGreaterThan(0.8);
    expect(CSV_FORMAT.erkennen("a;b\n1;2\n")).toBeGreaterThan(0.8);
  });

  it("gibt wenig für Fließtext und Einzeiler", () => {
    expect(CSV_FORMAT.erkennen("Hallo Welt")).toBe(0);
    expect(CSV_FORMAT.erkennen("Erstens, zweitens.\nDrittens, viertens, fünftens.\nEnde")).toBeLessThan(0.5);
  });

  it("JSON und YAML gelten nicht als CSV", () => {
    expect(CSV_FORMAT.erkennen('[\n1,2,\n3,4\n]')).toBeLessThanOrEqual(0.1);
    expect(CSV_FORMAT.erkennen('  {"a": 1,\n"b": 2,\n"c": 3}')).toBeLessThanOrEqual(0.1);
    expect(CSV_FORMAT.erkennen("farben: rot, grün\nformen: rund, eckig\n")).toBeLessThanOrEqual(0.3);
    expect(CSV_FORMAT.erkennen("- a, b\n- c, d\n")).toBeLessThanOrEqual(0.3);
  });

  it("txt nur mit niedriger Erkennung", () => {
    expect(CSV_FORMAT.erkennen("a,b\n1,2\n", "liste.txt")).toBeLessThanOrEqual(0.6);
    expect(CSV_FORMAT.erkennen("a,b\n1,2\n", "liste.csv")).toBeGreaterThan(0.8);
  });
});

describe("CSV Zeiger", () => {
  it("findet Zellen über zeigerVon und knotenZu, auch mit / und ~ im Spaltennamen", () => {
    const text = '"a/b","c~d",e\n1,2,3\n4,5,6\n';
    const { index } = lies(text);
    const k = knotenZu(index, text, "/1/a~1b");
    expect(inhalt(index, text, k)).toBe("4");
    expect(zeigerVon(index, text, k)).toBe("/1/a~1b");
    const t = knotenZu(index, text, "/0/c~0d");
    expect(inhalt(index, text, t)).toBe("2");
    expect(zeigerVon(index, text, t)).toBe("/0/c~0d");
    expect(knotenZu(index, text, "/2/e")).toBe(KEIN);
  });
});

describe("CSV wertSchreiben", () => {
  /** Setzt den Wert am Zeiger, liest neu und gibt Text, neue Lesung und Änderung zurück. */
  function setzen(text: string, zeiger: string, neu: NeuerWert) {
    const alt = lies(text);
    const k = knotenZu(alt.index, text, zeiger);
    const aenderung = CSV_FORMAT.wertSchreiben(text, alt.index, k, neu, alt.merkmale);
    const neuText = anwenden(text, aenderung);
    const danach = lies(neuText);
    // Der übrige Text bleibt Byte für Byte gleich.
    expect(neuText.slice(0, aenderung.von)).toBe(text.slice(0, aenderung.von));
    expect(neuText.slice(aenderung.von + aenderung.einfuegen.length)).toBe(text.slice(aenderung.bis));
    return { neuText, danach, aenderung, wert: inhalt(danach.index, neuText, knotenZu(danach.index, neuText, zeiger)) };
  }

  it("schreibt einfache Texte roh und ersetzt nur die Zelle", () => {
    const text = "name,ort\nAnna,Leipzig\nBen,Köln\n";
    const r = setzen(text, "/1/ort", { art: "text", wert: "Dresden" });
    expect(r.neuText).toBe("name,ort\nAnna,Leipzig\nBen,Dresden\n");
    expect(r.wert).toBe("Dresden");
  });

  it("Komma-CSV bleibt Komma-CSV, Semikolon bleibt Semikolon", () => {
    const komma = setzen("a,b\n1,2\n3,4\n", "/0/b", { art: "text", wert: "x;y" });
    expect(komma.neuText).toBe("a,b\n1,x;y\n3,4\n");
    expect(komma.danach.merkmale.trennzeichen).toBe(",");
    expect(komma.wert).toBe("x;y");

    const komma2 = setzen("a,b\n1,2\n3,4\n", "/0/b", { art: "text", wert: "x,y" });
    expect(komma2.neuText).toBe('a,b\n1,"x,y"\n3,4\n');
    expect(komma2.danach.merkmale.trennzeichen).toBe(",");
    expect(komma2.wert).toBe("x,y");

    const semi = setzen("a;b\n1;2\n3;4\n", "/0/b", { art: "text", wert: "x,y" });
    expect(semi.neuText).toBe("a;b\n1;x,y\n3;4\n");
    expect(semi.danach.merkmale.trennzeichen).toBe(";");
    expect(semi.wert).toBe("x,y");

    const semi2 = setzen("a;b\n1;2\n3;4\n", "/1/a", { art: "text", wert: "x;y" });
    expect(semi2.neuText).toBe('a;b\n1;2\n"x;y";4\n');
    expect(semi2.danach.merkmale.trennzeichen).toBe(";");

    const tab = setzen("a\tb\n1\t2\n", "/0/a", { art: "text", wert: "x\ty" });
    expect(tab.neuText).toBe('a\tb\n"x\ty"\t2\n');
    expect(tab.danach.merkmale.trennzeichen).toBe("\t");
  });

  it("setzt Anführungszeichen bei Anführungszeichen und Zeilenende und verdoppelt innere", () => {
    const text = "a,b\r\n1,2\r\n";
    const r = setzen(text, "/0/a", { art: "text", wert: 'er sagt "ja"\r\nund geht' });
    expect(r.neuText).toBe('a,b\r\n"er sagt ""ja""\r\nund geht",2\r\n');
    expect(r.wert).toBe('er sagt "ja"\r\nund geht');
    expect(r.danach.merkmale.zeilenende).toBe("crlf");
    expect(r.danach.merkmale.zeilen).toBe(1);
  });

  it("ersetzt eine Zelle samt Anführungszeichen und behält sie bei", () => {
    const text = 'a,b\n"x""y",2\n';
    const r = setzen(text, "/0/a", { art: "text", wert: "neu" });
    expect(r.aenderung).toEqual({ von: 4, bis: 10, einfuegen: '"neu"' });
    expect(r.neuText).toBe('a,b\n"neu",2\n');
    expect(r.wert).toBe("neu");
  });

  it("schreibt Zahl und Wahrheitswert als Text, nichts als leere Zelle", () => {
    const text = "a,b,c\n1,2,3\n";
    expect(setzen(text, "/0/a", { art: "zahl", roh: "12345678901234567890.0" }).wert).toBe("12345678901234567890.0");
    expect(setzen(text, "/0/b", { art: "wahrheitswert", wert: false }).neuText).toBe("a,b,c\n1,false,3\n");
    const nichts = setzen(text, "/0/c", { art: "nichts" });
    expect(nichts.neuText).toBe("a,b,c\n1,2,\n");
    expect(nichts.wert).toBe("");
  });

  it("eine geleerte einzige Zelle bleibt als Datensatz erhalten", () => {
    const r = setzen("a\nx\ny\n", "/0/a", { art: "text", wert: "" });
    expect(r.neuText).toBe('a\n""\ny\n');
    expect(r.danach.merkmale.zeilen).toBe(2);
  });

  it("schreibt Emojis an der richtigen Stelle", () => {
    const r = setzen("tier,laut\n🐄,muh\n", "/0/laut", { art: "text", wert: "🐑" });
    expect(r.neuText).toBe("tier,laut\n🐄,🐑\n");
  });

  it("lehnt Liste und Datensatz mit Formatfehler ab", () => {
    const text = "a,b\n1,2\n";
    const { index, merkmale } = lies(text);
    expect(() => CSV_FORMAT.wertSchreiben(text, index, 0, { art: "text", wert: "x" }, merkmale)).toThrow(Formatfehler);
    expect(() => CSV_FORMAT.wertSchreiben(text, index, 1, { art: "text", wert: "x" }, merkmale)).toThrow(Formatfehler);
  });
});

describe("CSV Leistung", () => {
  leistungstest("liest 5 MB (50.000 Zeilen, 8 Spalten) deutlich unter 2 s", () => {
    const kopf = "id,name,ort,plz,betrag,datum,notiz,aktiv\n";
    const zeilen: string[] = [];
    for (let i = 0; i < 50000; i++) {
      zeilen.push(`${i},Person Nummer ${i},"Leipzig, Sachsen",${String(4000 + (i % 999)).padStart(5, "0")},${(i * 1.37).toFixed(2)},2026-11-${String((i % 28) + 1).padStart(2, "0")},"Notiz mit ""Zitat"" ${i} und etwas mehr Text",${i % 2 === 0}`);
    }
    let text = kopf + zeilen.join("\n") + "\n";
    while (text.length < 5_000_000) text += zeilen.slice(0, 5000).join("\n") + "\n";
    const t0 = performance.now();
    const { index, merkmale, diagnosen } = lies(text);
    const dauer = performance.now() - t0;
    console.log(`CSV: ${(text.length / 1e6).toFixed(1)} MB in ${dauer.toFixed(0)} ms`);
    expect(diagnosen).toEqual([]);
    expect(merkmale.spalten).toBe(8);
    expect(index.kinder[0]).toBe(merkmale.zeilen);
    expect(dauer).toBeLessThan(zeitgrenze(3000));
  });
});
