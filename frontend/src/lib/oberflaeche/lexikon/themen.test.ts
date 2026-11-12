// Prüfung aller Lexikon-Themen ohne Browser: vollständiger Kopf, gültiger Bereich, Verweise auf Themen, Abschnitte,
// Ansichten und Werkzeuge treffen, keine typografischen Sonderzeichen und kein doppelter Bindestrich im Text, Beispiele
// nur in bekannten Sprachen. Was hier scheitert, wäre im Fenster ein toter Link oder ein Verstoß gegen die Hausregeln.

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ankerAus } from "./anker";

const ORDNER = new URL("./themen/", import.meta.url);
/** Gedankenstriche und typografische Anführungszeichen, als Zeichencodes (die Zeichen selbst sind im Repo verboten) */
const TYPOGRAFISCH = new RegExp(`[${[0x2013, 0x2014, 0x201c, 0x201d, 0x201e, 0x2018, 0x2019, 0x201a, 0xab, 0xbb].map((c) => String.fromCharCode(c)).join("")}]`);
const BEREICHE = ["Anfang", "Arbeitsplatz", "Pfade und Abfragen", "Formate", "Prüfen", "Ansichten", "Werkzeuge", "Begriffe"];
const ANSICHTEN = ["baum", "editor", "tabelle", "statistik", "struktur", "graph", "vergleich", "schema"];
const WERKZEUGE = ["validieren", "bereinigen", "reparieren", "konvertieren", "rezepte", "code", "testdaten", "ki"];
const SPRACHEN = ["jq", "jsonpath", "sql", "xpath", "suche", "json", "csv", "yaml", "toml", "xml", "text", "php", "python", "typescript", "ndjson", "markdown", "html", "sh", "bash"];

interface Datei {
  readonly anker: string;
  readonly meta: Record<string, string>;
  readonly rumpf: string;
  readonly abschnitte: ReadonlySet<string>;
}

const dateien: Datei[] = readdirSync(ORDNER)
  .filter((n) => n.endsWith(".md"))
  .map((n) => {
    const quelle = readFileSync(new URL(n, ORDNER), "utf8");
    const t = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(quelle);
    const meta: Record<string, string> = {};
    for (const zeile of (t?.[1] ?? "").split(/\r?\n/)) {
      const i = zeile.indexOf(":");
      if (i > 0) meta[zeile.slice(0, i).trim()] = zeile.slice(i + 1).trim();
    }
    const rumpf = t?.[2] ?? quelle;
    const ohneCode = rumpf.replace(/```[\s\S]*?```/g, "");
    const abschnitte = new Set([...ohneCode.matchAll(/^#{2,3} (.+)$/gm)].map((m) => ankerAus(m[1].replace(/`/g, ""))));
    return { anker: n.replace(/\.md$/, ""), meta, rumpf, abschnitte };
  });
const nach = new Map(dateien.map((d) => [d.anker, d]));

describe("Lexikon-Themen", () => {
  it("gibt es", () => expect(dateien.length).toBeGreaterThan(0));

  for (const d of dateien) {
    describe(d.anker, () => {
      it("hat einen vollständigen Kopf", () => {
        for (const feld of ["titel", "unterzeile", "bereich", "symbol", "stichworte", "reihenfolge"]) expect(d.meta[feld], feld).toBeTruthy();
        expect(BEREICHE).toContain(d.meta.bereich);
        expect(d.meta.symbol).toMatch(/^fa-[a-z0-9-]+$/);
        expect(Number(d.meta.reihenfolge)).toBeGreaterThan(0);
        // Keine Überschrift erster Ebene (den Titel setzt das Fenster); # in Codeblöcken ist Kommentar oder Beispiel
        expect(d.rumpf.replace(/```[\s\S]*?```/g, "")).not.toMatch(/^# /m);
      });

      it("verweist nur auf Vorhandenes", () => {
        const ohneCode = d.rumpf.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
        for (const [, ziel] of ohneCode.matchAll(/\]\(#([^)]+)\)/g)) {
          const [art, kennung] = ziel.split(":");
          if (kennung !== undefined) {
            expect(art === "ansicht" ? ANSICHTEN : art === "werkzeug" ? WERKZEUGE : [], `${d.anker}: #${ziel}`).toContain(kennung);
            continue;
          }
          const [anker, abschnitt] = ziel.split("/");
          const t = nach.get(anker || d.anker);
          expect(t, `${d.anker}: Thema #${ziel}`).toBeTruthy();
          if (abschnitt) expect([...(t?.abschnitte ?? [])], `${d.anker}: Abschnitt #${ziel}`).toContain(abschnitt);
        }
      });

      it("schreibt ohne typografische Sonderzeichen und ohne doppelten Bindestrich im Text", () => {
        const text = `${Object.values(d.meta).join("\n")}\n${d.rumpf}`;
        expect(text, "Gedankenstrich oder typografische Anführungszeichen").not.toMatch(TYPOGRAFISCH);
        const prosa = d.rumpf.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "").replace(/^\|?\s*-{3,}.*$/gm, "");
        expect(prosa, "doppelter Bindestrich").not.toMatch(/(^|[^-])--([^-]|$)/);
        expect(prosa, "Abkürzungen").not.toMatch(/\b(z\. ?B\.|bzw\.|ggf\.|usw\.|d\. ?h\.)/);
      });

      it("nimmt für Beispiele nur bekannte Sprachen", () => {
        for (const [, sprache] of d.rumpf.matchAll(/^```([a-z]*)\s*$/gm)) if (sprache) expect(SPRACHEN, `${d.anker}: ${sprache}`).toContain(sprache);
      });
    });
  }
});
