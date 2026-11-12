// Konvertieren: Ziele, CSV mit drei Wegen für Listen, ehrliche Verlustkarte, Rundreise über das Format.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { format } from "../../formate/registrierung";
import { umwandeln, VORGABEN, zieleFuer, zielname, type Quelle } from "./konvertieren";
import { tabellieren } from "./tabellieren";
import { xlsxLesen } from "../../formate/xlsx/lesen";

const TEXT = `{
  "shop": "Hofladen Lindenhof",
  "stand": "2026-11-10T08:15:00+01:00",
  "bestellungen": [
    {"nr": "B-1", "kunde": {"name": "Jonas Brandt", "plz": "01067"}, "positionen": [{"artikel": "Honig", "menge": 1, "preis": 7.5}, {"artikel": "Saft", "menge": 2, "preis": 2.49}], "bezahlt": true, "notiz": "Samstag"},
    {"nr": "B-2", "kunde": {"name": "Marta Kowalski", "plz": "04109"}, "positionen": [{"artikel": "Käse", "menge": 1, "preis": 6.9}], "bezahlt": false, "notiz": null}
  ]
}`;

function quelle(text: string, f = "json"): Quelle {
  const r = format(f as "json").lesen(text);
  return { index: r.index!, text, format: f, formatName: f.toUpperCase(), kommentare: r.merkmale.kommentare === true, fehler: r.diagnosen.filter((d) => d.schwere === "fehler").length, datumswerte: Number(r.merkmale.datumswerte ?? 0), typen: format(f as "json").faehigkeiten.typen };
}

describe("Tabellieren", () => {
  const eintraege = (JSON.parse(TEXT) as { bestellungen: unknown[] }).bestellungen;

  it("eine Zeile je Position, Objekte als Spalten, Reihenfolge wie im Eintrag", () => {
    const t = tabellieren(eintraege, "spalten", "zeilen");
    expect(t.spalten.map((s) => `${s.name}:${s.herkunft}`)).toEqual(["nr:eintrag", "kunde.name:objekt", "kunde.plz:objekt", "positionen.artikel:liste", "positionen.menge:liste", "positionen.preis:liste", "bezahlt:eintrag", "notiz:eintrag"]);
    expect(t.zeilen).toHaveLength(3);
    expect(t.zeilen[1]).toEqual(["B-1", "Jonas Brandt", "01067", "Saft", 2, 2.49, true, "Samstag"]);
  });

  it("spätere Spalten stehen bei ihresgleichen", () => {
    const t = tabellieren([{ a: 1, l: [1] }, { a: 2, l: [1, 2, 3], z: 9 }], "spalten", "spalten");
    expect(t.spalten.map((x) => x.name)).toEqual(["a", "l.0", "l.1", "l.2", "z"]);
  });

  it("Spalten je Position und Liste als JSON-Text", () => {
    const s = tabellieren(eintraege, "spalten", "spalten");
    expect(s.zeilen).toHaveLength(2);
    expect(s.spalten.map((x) => x.name)).toEqual(["nr", "kunde.name", "kunde.plz", "positionen.0.artikel", "positionen.0.menge", "positionen.0.preis", "positionen.1.artikel", "positionen.1.menge", "positionen.1.preis", "bezahlt", "notiz"]);
    const j = tabellieren(eintraege, "json", "json");
    expect(j.spalten.map((x) => x.name)).toEqual(["nr", "kunde", "positionen", "bezahlt", "notiz"]);
    expect(j.zeilen[1][1]).toBe('{"name":"Marta Kowalski","plz":"04109"}');
  });
});

describe("Umwandeln", () => {
  it("CSV: Text, Verlustkarte mit Listenwahl, Typen, null und fehlende Felder", () => {
    const u = umwandeln(quelle(TEXT), "csv");
    expect(u.text.split("\r\n")[0]).toBe("nr;kunde.name;kunde.plz;positionen.artikel;positionen.menge;positionen.preis;bezahlt;notiz");
    expect(u.text.split("\r\n")[3]).toBe("B-2;Marta Kowalski;04109;Käse;1;6.9;false;");
    expect(u.tabelle?.zeilen).toBe(3);
    expect(u.verluste.map((v) => v.satz)).toEqual([
      "`positionen` sind Listen: 3 Möglichkeiten",
      "Typen gehen verloren: Zahlen werden Text",
      "null und leer sehen gleich aus",
      "`shop` und `stand` fehlen",
    ]);
    expect(u.verluste[0].wahl?.wege.map((w) => w.text)).toEqual([
      "3 Zeilen; nr, kunde und bezahlt und weitere wiederholen sich",
      "2 Zeilen; positionen.0.artikel bis positionen.1.preis, 6 Spalten",
      "2 Zeilen; vollständig, aber nicht mehr rechenbar",
    ]);
    expect(u.verluste[1].text).toContain("`01067` in `kunde.plz`");
    expect(u.verluste[2].text).toBe("`notiz` ist in 1 von 3 Zeilen `null` und wird zur leeren Zelle, wie ein leerer Text.");
  });

  it("CSV-Optionen: Komma, ohne Kopfzeile, Felder mit Trennzeichen in Anführungszeichen", () => {
    const u = umwandeln(quelle('[{"a": "x,y", "b": 1}]'), "csv", { ...VORGABEN, trennzeichen: ",", kopfzeile: false });
    expect(u.text).toBe('"x,y",1\r\n');
    expect(u.verluste.map((v) => v.satz)).toContain("Ohne Kopfzeile fehlen die Namen");
  });

  it("JSON Lines nimmt die Hauptliste und sagt, was fehlt; zurückgelesen gleich", () => {
    const u = umwandeln(quelle(TEXT), "ndjson");
    expect(u.datensaetze).toBe(2);
    expect(u.verluste.map((v) => v.satz)).toEqual(["`shop` und `stand` fehlen"]);
    const r = format("ndjson").lesen(u.text);
    expect(r.diagnosen).toEqual([]);
  });

  it("YAML und JSON verlieren nichts; Kommentare werden gemeldet", () => {
    const y = umwandeln(quelle(TEXT), "yaml");
    expect(y.verluste).toEqual([]);
    expect(format("yaml").lesen(y.text).diagnosen.filter((d) => d.schwere === "fehler")).toEqual([]);
    const mitKommentar = umwandeln(quelle('{\n  // Hinweis\n  "a": 1\n}'), "yaml");
    expect(mitKommentar.verluste.map((v) => v.satz)).toEqual(["Kommentare gehen verloren"]);
    expect(mitKommentar.text).toBe("a: 1\n");
  });

  it("meldet nicht lesbare Stellen", () => {
    const u = umwandeln(quelle('{"a":1}\n{"a" 2}\n', "ndjson"), "csv");
    expect(u.verluste[0].satz).toBe("1 Stelle ist nicht lesbar");
  });

  it("YAML: Texte, die wie Wahrheitswert, Datum oder Zahl aussehen, bleiben Text", () => {
    const text = '{"ja": "yes", "an": "on", "datum": "2026-11-01", "plz": "01067", "n": 3, "wahr": true}';
    const y = umwandeln(quelle(text), "yaml");
    const zurueck = umwandeln(quelle(y.text, "yaml"), "json");
    expect(JSON.parse(zurueck.text)).toEqual(JSON.parse(text));
  });

  it("aus CSV: Werte bleiben Text", () => {
    const csv = "nr;menge\nB-1;2\n";
    const u = umwandeln(quelle(csv, "csv"), "json");
    expect(JSON.parse(u.text)).toEqual([{ nr: "B-1", menge: "2" }]);
    expect(u.verluste.map((v) => v.satz)).toEqual(["Werte bleiben Text"]);
  });

  it("Beispiel bestellungen.json nach CSV: eine Zeile je Position", () => {
    const text = readFileSync(new URL("../../../../pruefdaten/bestellungen.json", import.meta.url), "utf8");
    const u = umwandeln(quelle(text), "csv");
    expect(u.tabelle!.zeilen).toBeGreaterThan(128);
    expect(format("csv").lesen(u.text).diagnosen.filter((d) => d.schwere === "fehler")).toEqual([]);
  });

  it("Ziele und Namen", () => {
    expect(zieleFuer("json").map((z) => z.kennung)).toEqual(["csv", "ndjson", "yaml", "toml", "xml", "markdown", "html", "xlsx"]);
    expect(zielname("bestellungen.json", "csv")).toBe("bestellungen.csv");
  });
});

describe("Ziel TOML", () => {
  it("null fällt weg und wird gemeldet; zurückgelesen gleich bis auf null", () => {
    const u = umwandeln(quelle(TEXT), "toml");
    expect(u.verluste.map((v) => v.satz)).toEqual(["TOML kennt kein null"]);
    expect(u.verluste[0].text).toContain("1 Stelle fällt weg");
    expect(u.text).toContain("[[bestellungen]]");
    const zurueck = format("toml").lesen(u.text);
    expect(zurueck.diagnosen).toEqual([]);
    const w = umwandeln({ ...quelle(u.text, "toml") }, "json");
    const erwartet = JSON.parse(TEXT);
    delete erwartet.bestellungen[1].notiz;
    expect(JSON.parse(w.text)).toEqual(erwartet);
  });

  it("eine Liste oben steht unter eintraege", () => {
    const u = umwandeln(quelle('[{"a": 1}, {"a": 2}]'), "toml");
    expect(u.verluste[0].satz).toBe("TOML braucht oben ein Objekt");
    expect(u.text).toBe("[[eintraege]]\na = 1\n\n[[eintraege]]\na = 2\n");
  });
});

describe("Quelle TOML", () => {
  it("nennt Kommentare und Datumswerte, die Text werden", () => {
    const u = umwandeln(quelle('# Kopf\nstand = 2026-11-10\nab = 08:00:00\nn = 1\n', "toml"), "json");
    expect(u.verluste.map((v) => v.satz)).toEqual(["Kommentare gehen verloren", "Datum und Zeit werden Text"]);
    expect(u.verluste[1].text).toBe("TOML hat für 2 Werte einen eigenen Typ für Datum oder Zeit; JSON schreibt sie als Text. Der Inhalt bleibt gleich.");
    expect(JSON.parse(u.text)).toEqual({ stand: "2026-11-10", ab: "08:00:00", n: 1 });
  });
});

describe("XML", () => {
  it("nach XML: Wurzel, Attribute aus @, Listen als Wiederholung, Verluste genannt; zurückgelesen fehlerfrei", () => {
    const u = umwandeln(quelle(TEXT), "xml");
    expect(u.verluste.map((v) => v.satz)).toEqual(["XML braucht genau ein Wurzelelement", "Typen gehen verloren: Zahlen werden Text", "null wird ein leeres Element"]);
    expect(u.text).toContain("<daten>\n  <shop>Hofladen Lindenhof</shop>");
    expect(u.text).toContain("    <positionen>\n      <artikel>Saft</artikel>");
    expect(format("xml").lesen(u.text).diagnosen).toEqual([]);
  });

  it("Attribute, Text und Namen, die XML nicht erlaubt", () => {
    const u = umwandeln(quelle('{"a": {"@id": "x<1", "#text": "T & U", "1. Wahl": [], "b c": 2}}'), "xml");
    expect(u.text).toBe('<?xml version="1.0" encoding="UTF-8"?>\n<a id="x&lt;1">T &amp; U\n  <b_c>2</b_c>\n</a>\n');
    expect(u.verluste.map((v) => v.satz)).toEqual(["Typen gehen verloren: Zahlen werden Text", "Leere Listen fallen weg", "2 Namen sind in XML nicht erlaubt"]);
  });

  it("aus XML: mal Liste, mal einzeln; Attribute als Felder; Werte bleiben Text", () => {
    const x = "<l><e n=\"1\"><p>a</p><p>b</p></e><e n=\"2\"><p>c</p></e></l>";
    const u = umwandeln(quelle(x, "xml"), "json");
    expect(u.verluste.map((v) => v.satz)).toEqual(["`p` ist mal Liste, mal einzeln", "Attribute werden Felder", "Werte bleiben Text"]);
    expect(JSON.parse(u.text)).toEqual({ l: { e: [{ "@n": "1", p: ["a", "b"] }, { "@n": "2", p: "c" }] } });
  });
});

describe("Ziel XLSX", () => {
  it("Tabellendatei mit Typen; Felder außerhalb der Liste auf dem Blatt Angaben; Karte ohne Typverlust", () => {
    const u = umwandeln(quelle(TEXT), "xlsx");
    expect(u.daten).toBeInstanceOf(Uint8Array);
    expect(u.verluste.map((v) => v.satz)).toEqual(["`positionen` sind Listen: 3 Möglichkeiten", "null und leer sehen gleich aus"]);
    const m = xlsxLesen(u.daten!);
    expect(m.blaetter.map((b) => b.name)).toEqual(["bestellungen", "Angaben"]);
    expect(m.blaetter[0].zeilen[1]).toEqual(["B-1", "Jonas Brandt", "01067", "Honig", 1, 7.5, true, "Samstag"]);
    expect(m.blaetter[1].zeilen).toEqual([["Feld", "Wert"], ["shop", "Hofladen Lindenhof"], ["stand", "2026-11-10T08:15:00+01:00"]]);
    expect(u.tabelle?.zeilen).toBe(3);
  });
});

describe("Ziele Markdown und HTML", () => {
  it("Markdown: Hauptliste und Angaben als Tabellen mit Überschrift; zurückgelesen dieselben Werte als Text", () => {
    const u = umwandeln(quelle(TEXT), "markdown");
    expect(u.verluste.map((v) => v.satz)).toEqual(["`positionen` sind Listen: 3 Möglichkeiten", "Typen gehen verloren: Zahlen werden Text", "null und leer sehen gleich aus"]);
    expect(u.text.split("\n").slice(0, 4)).toEqual([
      "## bestellungen",
      "",
      "| nr  | kunde.name     | kunde.plz | positionen.artikel | positionen.menge | positionen.preis | bezahlt | notiz   |",
      "|-----|----------------|-----------|--------------------|-----------------:|-----------------:|---------|---------|",
    ]);
    const r = format("markdown").lesen(u.text);
    expect(r.diagnosen).toEqual([]);
    const zurueck = JSON.parse(umwandeln({ ...quelle(u.text, "markdown") }, "json").text);
    expect(zurueck.bestellungen[1]).toEqual({ nr: "B-1", "kunde.name": "Jonas Brandt", "kunde.plz": "01067", "positionen.artikel": "Saft", "positionen.menge": "2", "positionen.preis": "2.49", bezahlt: "true", notiz: "Samstag" });
    expect(zurueck.Angaben).toEqual([{ Feld: "shop", Wert: "Hofladen Lindenhof" }, { Feld: "stand", Wert: "2026-11-10T08:15:00+01:00" }]);
  });

  it("HTML: eigene Seite mit Tabellen, als Datei; liest sich als HTML-Tabelle wieder ein", async () => {
    const u = umwandeln({ ...quelle(TEXT), titel: "Hofladen" }, "html");
    expect(u.daten).toBeInstanceOf(Uint8Array);
    expect(u.text).toContain("<title>Hofladen</title>");
    expect(u.text).toContain('<td class="zahl">7.5</td>');
    const { htmlTabellenLesen } = await import("../../formate/html/tabellen");
    expect(htmlTabellenLesen(u.text).tabellen.map((t) => [t.name, t.zeilen.length])).toEqual([["bestellungen", 4], ["Angaben", 3]]);
  });
});
