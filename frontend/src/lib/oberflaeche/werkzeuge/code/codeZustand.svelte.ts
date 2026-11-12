// Zustand des Werkzeugs "Code erzeugen" je Blatt: Zielsprache, Quelle (aus den Daten abgeleitet oder ein JSON Schema der
// Ablage), Wurzelname, Namensraum, unveränderlich, Dateien und die gezeigte Datei. Der Code wird je Lesestand, Schema und
// Einstellung einmal erzeugt, damit Hauptbereich und Inspektor dasselbe zeigen.

import type { Analyse } from "../../../kern";
import { alsJsonSchema, schemaAbleiten } from "../../../analyse/schema";
import { schemaLesen } from "../../../analyse/validieren";
import { ausJsonSchema } from "../../../analyse/codegen/ausJsonSchema";
import { CODEZIELE, codeziel } from "../../../analyse/codegen/codeziele";
import { klassenname, type Klassenmodell } from "../../../analyse/codegen/modell";
import type { Codeausgabe, Codedatei, Codeoptionen } from "../../../analyse/codegen/ziele";
import { wertAus } from "../../../analyse/wert";
import { jsonText } from "../../../kern/json";
import { ablageverwaltung } from "../../../zustand/ablageverwaltung.svelte";
import { FASSUNG, URHEBER } from "../../../zustand/app";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
import type { Adressierbar, Adresskontext, Werte } from "../../../zustand/adresse";

export type Codequelle = { readonly art: "daten" } | { readonly art: "dokument"; readonly kennung: string; readonly name: string };

export interface Codeergebnis {
  readonly ok: true;
  readonly modell: Klassenmodell;
  readonly ausgabe: Codeausgabe;
  readonly quelle: string;
  /** Fassung des Quellschemas aus $schema ("JSON Schema 2020-12", "JSON Schema Draft-07") */
  readonly schemafassung: string;
  readonly optionen: Codeoptionen;
}

/** Fassung eines JSON Schemas nach seiner $schema-Angabe */
function schemafassung(schema: unknown): string {
  const s = typeof schema === "object" && schema !== null ? (schema as Record<string, unknown>).$schema : undefined;
  if (typeof s !== "string") return "JSON Schema ohne Fassungsangabe";
  const m = /draft\/(\d{4}-\d{2})|draft-0?(\d+)/.exec(s);
  return m ? `JSON Schema ${m[1] ?? `Draft-${m[2].padStart(2, "0")}`}` : "JSON Schema";
}

const VORGABE_NAMENSRAUM = "App\\Daten";

export class CodeZustand implements Adressierbar {
  ziel = $state("php");
  quelle = $state<Codequelle>({ art: "daten" });
  schemaText = $state.raw<string | null>(null);
  wurzelname = $state("");
  namensraum = $state(VORGABE_NAMENSRAUM);
  unveraenderlich = $state(true);
  jeKlasse = $state(false);
  /** Grenzen als Attribute (nur wo das Ziel es kennt) */
  attribute = $state(false);
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

  private optionen(wurzel: string, quelle: string): Codeoptionen {
    return {
      wurzelname: wurzel,
      namensraum: this.namensraum.trim(),
      unveraenderlich: this.unveraenderlich,
      jeKlasse: this.jeKlasse,
      kopf: `Erzeugt von Strukturblick ${FASSUNG} (${URHEBER.name}, ${URHEBER.webseite}) aus ${quelle}`,
      dateistamm: wurzel.replace(/(\p{Ll})(\p{Lu})/gu, "$1_$2").toLowerCase(),
      attribute: this.attribute && codeziel(this.ziel).attribute,
    };
  }

  /** Lauffähiges Miniprojekt zum aktuellen Ergebnis; die Daten sind das Dokument, als JSON */
  miniprojekt(blatt: Arbeitsblatt): Codedatei[] | null {
    const e = this.ergebnis(blatt);
    const a = blatt.analyse;
    if (!e?.ok || !a?.index) return null;
    const daten = { name: `${blatt.name.replace(/\.[^.]+$/, "")}.json`, text: `${jsonText(wertAus(a.index, blatt.analyseText, 0), 2)}\n` };
    return codeziel(this.ziel).miniprojekt(e.modell, e.optionen, daten);
  }

  /** Für die Adresse: Ziel, Quelle, Namen und Schalter, soweit sie von der Vorgabe abweichen */
  adresseWerte(k: Adresskontext): Werte {
    const w: Record<string, string> = {};
    if (this.ziel !== CODEZIELE[0].kennung) w.ziel = this.ziel;
    if (this.quelle.art === "dokument") w.schema = k.kurz(this.quelle.kennung);
    if (this.wurzelname.trim()) w.wurzel = this.wurzelname.trim();
    if (this.namensraum !== VORGABE_NAMENSRAUM) w.namensraum = this.namensraum;
    if (!this.unveraenderlich) w.klassen = "veraenderbar";
    if (this.attribute) w.grenzen = "attribute";
    if (this.jeKlasse) w.dateien = "je-klasse";
    return w;
  }

  async adresseUebernehmen(w: Werte, k: Adresskontext): Promise<void> {
    this.ziel = CODEZIELE.some((z) => z.kennung === w.ziel) ? w.ziel : CODEZIELE[0].kennung;
    this.wurzelname = w.wurzel ?? "";
    this.namensraum = w.namensraum ?? VORGABE_NAMENSRAUM;
    this.unveraenderlich = w.klassen !== "veraenderbar";
    this.attribute = w.grenzen === "attribute";
    this.jeKlasse = w.dateien === "je-klasse";
    const schema = w.schema ? k.dokument(w.schema) : null;
    if (!schema) this.datenWaehlen();
    else if (this.quelle.art !== "dokument" || this.quelle.kennung !== schema.kennung) await this.dokumentWaehlen(schema.kennung, schema.name);
  }

  ergebnis(blatt: Arbeitsblatt): Codeergebnis | { ok: false; fehler: string } | null {
    const a = blatt.analyse;
    const q = this.quelle;
    if (q.art === "daten" && !a?.index) return null;
    const wurzel = this.wurzel(blatt);
    const schluessel = [this.ziel, q.art === "dokument" ? `${q.kennung}:${this.schemaText ?? ""}` : "daten", wurzel, this.namensraum, this.unveraenderlich, this.jeKlasse, this.attribute].join("|");
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
    const optionen = this.optionen(wurzel, quelle);
    const ergebnis: Codeergebnis | { ok: false; fehler: string } = modell.klassen.length
      ? { ok: true, modell, ausgabe: codeziel(this.ziel).schreiben(modell, optionen), quelle, schemafassung: schemafassung(schema), optionen }
      : { ok: false, fehler: "Keine Objekte im Schema: Code erzeugen braucht mindestens ein Objekt mit Feldern." };
    this.merk = { schluessel, analyse: a, ergebnis };
    return ergebnis;
  }
}

export const codeZustand = (blatt: Arbeitsblatt): CodeZustand => blatt.zustandFuer("code", () => new CodeZustand());
