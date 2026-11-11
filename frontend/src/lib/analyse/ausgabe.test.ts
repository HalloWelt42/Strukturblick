// Export der sichtbaren Tabellenzeilen und der Treffer im Baum: genau das, was zu sehen ist, in der gezeigten Folge.

import { describe, expect, it } from "vitest";
import { format } from "../formate/registrierung";
import { knotenWerte, sichtWerte, werteAusgeben } from "./ausgabe";
import { suchen } from "./baumsuche";
import { sichtBerechnen, tabelleBauen } from "./tabelle";

describe("Export nach Filtern", () => {
  const csv = "name;ort;umsatz\nOle;Leipzig;12\nKarl;Dresden;7\nInes;leipzig;30\nJan;Halle;5\n";
  const index = format("csv").lesen(csv).index!;
  const tabelle = tabelleBauen(index, csv, 0);

  it("nimmt nur die gefilterten Zeilen in der angezeigten Sortierung", () => {
    const sicht = sichtBerechnen(tabelle, index, csv, { filter: "leipzig", sortierung: { spalte: "umsatz", selbst: false, richtung: "ab" } });
    expect(werteAusgeben(sichtWerte(tabelle, index, csv, sicht), "csv")).toBe("name;ort;umsatz\r\nInes;leipzig;30\r\nOle;Leipzig;12\r\n");
    expect(JSON.parse(werteAusgeben(sichtWerte(tabelle, index, csv, sicht), "json"))).toHaveLength(2);
  });

  it("gibt die Treffer im Baum als Werte aus", () => {
    const json = '{"a": {"stadt": "Leipzig"}, "b": [{"stadt": "Halle"}, {"stadt": "Leipzig"}]}';
    const ix = format("json").lesen(json).index!;
    const treffer = suchen(ix, json, "leipzig")!;
    expect(werteAusgeben(knotenWerte(ix, json, treffer.knoten), "csv")).toBe("pfad;wert\r\n.a.stadt;Leipzig\r\n.b[1].stadt;Leipzig\r\n");
    // ausgewählte Einträge (alle Objekte) bleiben, wie sie sind
    expect(knotenWerte(ix, json, [ix.erstesKind[0]])).toEqual([{ stadt: "Leipzig" }]);
  });
});
