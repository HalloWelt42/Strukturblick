// Zustand des Werkzeugs "Code erzeugen" je Blatt: Zielsprache, Quelle (aus den Daten abgeleitet oder ein JSON Schema der
// Ablage), Wurzelname, Namensraum, unveränderlich, Dateien und die gezeigte Datei. Der Code wird je Lesestand, Schema und
// Einstellung einmal erzeugt, damit Hauptbereich und Inspektor dasselbe zeigen.

import type { Analyse } from "../../../kern";
import { alsJsonSchema, schemaAbleiten } from "../../../analyse/schema";
import { schemaLesen } from "../../../analyse/validieren";
import { ausJsonSchema } from "../../../analyse/codegen/ausJsonSchema";
import { codeziel } from "../../../analyse/codegen/codeziele";
import { klassenname, type Klassenmodell } from "../../../analyse/codegen/modell";
import type { Codeausgabe, Codeoptionen } from "../../../analyse/codegen/ziele";
import { ablageverwaltung } from "../../../zustand/ablageverwaltung.svelte";
import { FASSUNG } from "../../../zustand/app";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";

export type Codequelle = { readonly art: "daten" } | { readonly art: "dokument"; readonly kennung: string; readonly name: string };

export interface Codeergebnis {
  readonly ok: true;
  readonly modell: Klassenmodell;
  readonly ausgabe: Codeausgabe;
  readonly quelle: string;
}

export class CodeZustand {
  ziel = $state("php");
  quelle = $state<Codequelle>({ art: "daten" });
  schemaText = $state.raw<string | null>(null);
  wurzelname = $state("");
  namensraum = $state("App\\Daten");
  unveraenderlich = $state(true);
  jeKlasse = $state(false);
  datei = $state(0);
  private merk: { schluessel: string; analyse: Analyse | null; ergebnis: Codeergebnis | { ok: false; fehler: string } } | null = null;

  /** Vorgabe des Wurzelnamens: der Dokumentname als Klassenname ("bestellungen.json" wird Bestellungen) */
  wurzel(blatt: Arbeitsblatt): string {
    return this.wurzelname.trim() ? klassenname(this.wurzelname.trim()) : klassenname(blatt.name.replace(/\.[^.]+$/, "").replace(/\.schema$/, ""));
  }

  async dokumentWaehlen(kennung: string, name: string): Promise<void> {
    this.quelle = { art: "dokument", kennung, name };
    const t = await ablageverwaltung.textVon(kennung);
    this.schemaText = t?.text ?? null;
    this.datei = 0;
  }

  datenWaehlen(): void {
    this.quelle = { art: "daten" };
    this.schemaText = null;
    this.datei = 0;
  }

  ergebnis(blatt: Arbeitsblatt): Codeergebnis | { ok: false; fehler: string } | null {
    const a = blatt.analyse;
    const q = this.quelle;
    if (q.art === "daten" && !a?.index) return null;
    const wurzel = this.wurzel(blatt);
    const schluessel = [this.ziel, q.art === "dokument" ? `${q.kennung}:${this.schemaText ?? ""}` : "daten", wurzel, this.namensraum, this.unveraenderlich, this.jeKlasse].join("|");
    if (this.merk && this.merk.schluessel === schluessel && (q.art === "dokument" || this.merk.analyse === a)) return this.merk.ergebnis;
    let schema: unknown;
    let quelle: string;
    if (q.art === "daten") {
      schema = alsJsonSchema(schemaAbleiten(a!.index!, blatt.analyseText), blatt.name);
      quelle = blatt.name;
    } else {
      if (this.schemaText === null) return { ok: false, fehler: `${q.name} wird geladen ...` };
      const s = schemaLesen(this.schemaText);
      if (!s.ok) return { ok: false, fehler: `${q.name}: ${s.fehler}` };
      schema = s.schema;
      quelle = q.name;
    }
    const modell = ausJsonSchema(schema, wurzel);
    const optionen: Codeoptionen = { wurzelname: wurzel, namensraum: this.namensraum.trim(), unveraenderlich: this.unveraenderlich, jeKlasse: this.jeKlasse, kopf: `Erzeugt von Strukturblick ${FASSUNG} aus ${quelle}`, dateistamm: wurzel.replace(/(\p{Ll})(\p{Lu})/gu, "$1_$2").toLowerCase() };
    const ergebnis: Codeergebnis | { ok: false; fehler: string } = modell.klassen.length
      ? { ok: true, modell, ausgabe: codeziel(this.ziel).schreiben(modell, optionen), quelle }
      : { ok: false, fehler: "Keine Objekte im Schema: Code erzeugen braucht mindestens ein Objekt mit Feldern." };
    this.merk = { schluessel, analyse: a, ergebnis };
    return ergebnis;
  }
}

export const codeZustand = (blatt: Arbeitsblatt): CodeZustand => blatt.zustandFuer("code", () => new CodeZustand());
