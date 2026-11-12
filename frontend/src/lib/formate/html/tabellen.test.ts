// HTML-Tabellen einlesen: nachsichtig (fehlende Enden), Namen aus caption oder Überschrift, Entities, colspan, Fehler
// ohne Tabelle.

import { describe, expect, it } from "vitest";
import { EinlesenFehler } from "../einlesen/tabellen";
import { einleserFuer } from "../einlesen/registrierung";
import { HTML_EINLESER, htmlTabellenLesen } from "./tabellen";

const SEITE = `<!doctype html>
<html><head><title>Hofladen</title><style>td { color: red }</style></head>
<body>
<h2>Bestellungen <small>November</small></h2>
<!-- <table><tr><td>auskommentiert</td></tr></table> -->
<table>
  <thead><tr><th>Nr</th><th>Kunde</th><th>Betrag</th></tr></thead>
  <tbody>
    <tr><td>B-1<td>Ida &amp; Ole<br>Wendt<td>7,50&nbsp;&euro;
    <tr><td>B-2</td><td colspan="2">storniert</td></tr>
  </tbody>
</table>
<table><caption>Öffnungszeiten</caption>
  <tr><td>Di</td><td>9 &ndash; 18</td></tr>
</table>
</body></html>`;

describe("HTML-Tabellen", () => {
  it("liest Tabellen nachsichtig, mit Namen, Entities und colspan", () => {
    const r = htmlTabellenLesen(SEITE);
    expect(r.tabellen.map((t) => t.name)).toEqual(["Bestellungen November", "Öffnungszeiten"]);
    expect(r.tabellen[0]).toMatchObject({ kopf: true, zeilen: [["Nr", "Kunde", "Betrag"], ["B-1", "Ida & Ole\nWendt", "7,50 \u20ac"], ["B-2", "storniert", ""]] });
    expect(r.tabellen[1]).toMatchObject({ kopf: false, zeilen: [["Di", "9 \u2013 18"]] });
    expect(r.hinweise).toContain("1 Zelle reicht über mehrere Spalten: der Wert steht in der ersten, die übrigen sind leer");
  });

  it("öffnet als JSON-Dokument; ohne Tabelle eine verständliche Meldung", () => {
    const d = HTML_EINLESER.einlesen(new TextEncoder().encode(SEITE), "laden.html");
    expect(d.name).toBe("laden.json");
    expect(JSON.parse(d.text)).toEqual({
      "Bestellungen November": [{ Nr: "B-1", Kunde: "Ida & Ole\nWendt", Betrag: "7,50 \u20ac" }, { Nr: "B-2", Kunde: "storniert", Betrag: null }],
      Öffnungszeiten: [{ A: "Di", B: "9 \u2013 18" }],
    });
    expect(d.meldung).toMatch(/^laden\.html als JSON geöffnet: 2 Tabellen, 3 Zeilen; Werte sind Text/);
    expect(() => HTML_EINLESER.einlesen(new TextEncoder().encode("<p>Nur Text</p>"), "x.html")).toThrow(EinlesenFehler);
  });

  it("die Einleser kennen ihre Endungen", () => {
    expect(einleserFuer("A.HTM")?.name).toBe("HTML-Seite");
    expect(einleserFuer("umsatz.xlsx")?.name).toBe("Tabellendatei");
    expect(einleserFuer("daten.json")).toBeNull();
  });
});
