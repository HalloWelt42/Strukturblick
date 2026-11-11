// Ein Rezept auf einem Text ausführen: Schritt für Schritt lesen, planen und den geplanten Befehl in einer eigenen
// Sitzung ausführen (dieselben Befehle wie in der Oberfläche, also nur Textstellen, nie neu geschrieben). Das Ergebnis
// ist der neue Text und je Schritt der Plan für die Vorschau. Die Datei selbst bleibt unberührt; was mit dem Text
// geschieht (neues Dokument oder ein Vorgang im Dokument), entscheidet der Aufrufer.

import { Sitzung, type Analyse } from "../../kern";
import type { Format, Leseoptionen } from "../../kern/format";
import { schrittPlanen, rezeptTabelle, type Plan } from "./planen";
import { schrittSpalten, type Rezept } from "./rezept";

export interface Lauf {
  readonly text: string;
  readonly plaene: readonly Plan[];
  /** Geänderte Zellen und entfallene Zeilen über alle Schritte */
  readonly zellen: number;
  readonly zeilen: number;
}

export function rezeptAusfuehren(rezept: Rezept, text: string, format: Format, optionen: Leseoptionen = {}): Lauf {
  let analyse: Analyse | null = null;
  const sitzung = new Sitzung(text, () => analyse);
  const plaene: Plan[] = [];
  for (const schritt of rezept.schritte) {
    if (!schritt.an) {
      plaene.push({ status: "aus" });
      continue;
    }
    const gelesen = format.lesen(sitzung.text, optionen);
    if (!gelesen.index) {
      plaene.push({ status: "uebersprungen", grund: "Die Datei ist an dieser Stelle nicht lesbar." });
      continue;
    }
    analyse = { ...gelesen, revision: sitzung.revision, format };
    const plan = schrittPlanen(schritt, gelesen.index, sitzung.text, format);
    if (plan.status === "ok" && plan.befehl) {
      const e = sitzung.ausfuehren(plan.befehl.kennung, plan.befehl.werte, { ort: "Rezept" });
      if (!e.ok) {
        plaene.push({ status: "uebersprungen", grund: e.fehler });
        continue;
      }
    }
    plaene.push(plan);
  }
  const zaehlen = (f: (p: Extract<Plan, { status: "ok" }>) => number) => plaene.reduce((n, p) => n + (p.status === "ok" ? f(p) : 0), 0);
  return { text: sitzung.text, plaene, zellen: zaehlen((p) => p.zellen), zeilen: zaehlen((p) => p.zeilen) };
}

export interface Spaltenpruefung {
  /** Erwartete Spalten mit Angabe, ob sie da sind, und welche Schritte sie brauchen (Nummern ab 1) */
  readonly erwartet: readonly { readonly spalte: string; readonly da: boolean; readonly schritte: readonly number[] }[];
  /** Spalten der Datei, die das Rezept nicht kennt (bleiben, wie sie sind) */
  readonly zusaetzlich: readonly string[];
  readonly zeilen: number;
}

/** Passt die Datei zum Rezept? Fehlende Spalten überspringen nur ihre Schritte, zusätzliche bleiben. */
export function spaltenPruefen(rezept: Rezept, text: string, format: Format, optionen: Leseoptionen = {}): Spaltenpruefung | null {
  const index = format.lesen(text, optionen).index;
  const t = index ? rezeptTabelle(index, text) : null;
  if (!t) return null;
  const vorhanden = new Set(t.spalten.map((s) => s.name));
  const erwartet = [...new Set([...rezept.spalten, ...rezept.schritte.flatMap(schrittSpalten)])].map((spalte) => ({
    spalte,
    da: vorhanden.has(spalte),
    schritte: rezept.schritte.flatMap((s, i) => (schrittSpalten(s).includes(spalte) ? [i + 1] : [])),
  }));
  const bekannt = new Set(erwartet.map((e) => e.spalte));
  return { erwartet, zusaetzlich: t.spalten.map((s) => s.name).filter((s) => !bekannt.has(s)), zeilen: t.zeilen.length };
}
