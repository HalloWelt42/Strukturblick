// Zustand des Werkzeugs "Mit KI" je Blatt (STB-60, entwuerfe/ki.html): Aufgabe, Frage, Zielsprache, der Vorschlag und
// sein Probelauf. Gesendet wird nur der Auszug (Felder, Typen, 20 Beispiele), nie das ganze Dokument; was hinausging,
// steht unter "gesendet". Ein Vorschlag ist eine Vorschau: übernommen wird erst auf Klick, und der Probelauf liest nur.

import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
import type { Adressierbar, Werte } from "../../../zustand/adresse";
import { abfrage, sprachenFuer } from "../../../zustand/abfrage.svelte";
import { ki, type KiVorschlag } from "../../../zustand/ki.svelte";
import { aufgabe, AUFGABEN, type KiAufgabe, type KiSprache } from "../../../analyse/ki/aufgaben";
import { auszugBauen, type Auszugart, type Zusatz } from "../../../analyse/ki/auszug";
import { erzeugerKatalog, spezifikationText } from "../../../analyse/ki/vorschlag";
import { alsJsonSchema, schemaAbleiten } from "../../../analyse/schema";
import { wertAus } from "../../../analyse/wert";
import { jsonText } from "../../../kern/json";
import { testdatenZustand } from "../testdaten/testdatenZustand.svelte";
import { probieren, type Probe } from "./probelauf";
import { kiVerlauf } from "./kiVerlauf.svelte";

const ZIELSPRACHEN: readonly KiSprache[] = ["sql", "jq", "jsonpath", "xpath"];

/** Was zur Leitstelle ging, für den Inspektor */
export interface Gesendet {
  readonly frage: boolean;
  readonly felder: number;
  readonly zeilen: number;
  readonly eintraege: number;
  readonly zeichen: number;
}

const istObjekt = (w: unknown): w is Record<string, unknown> => typeof w === "object" && w !== null && !Array.isArray(w);

export class KiZustand implements Adressierbar {
  aufgabe = $state<KiAufgabe>("abfrage");
  /** Frage je Aufgabe, damit der Wechsel nichts verliert */
  fragenJe = $state<Record<KiAufgabe, string>>({ erklaeren: "", abfrage: "", schema: "", beschreibung: "", testdaten: "" });
  /** Gewählte Sprache; null: die Vorgabe des Formats */
  sprachWahl = $state<KiSprache | null>(null);
  vorschlag = $state.raw<KiVorschlag | null>(null);
  probe = $state.raw<Probe | null>(null);
  gesendet = $state.raw<Gesendet | null>(null);
  laeuft = $state(false);
  fehler = $state<string | null>(null);
  /** Für welche Aufgabe und Sprache der Vorschlag gilt */
  fuer = $state.raw<{ aufgabe: KiAufgabe; sprache: KiSprache | null } | null>(null);

  private steuerung: AbortController | null = null;

  get frage(): string {
    return this.fragenJe[this.aufgabe];
  }

  set frage(f: string) {
    this.fragenJe = { ...this.fragenJe, [this.aufgabe]: f };
  }

  /** Sprachen, in die eine Frage für dieses Dokument übersetzt werden kann */
  sprachen(blatt: Arbeitsblatt): readonly KiSprache[] {
    const da = new Set(sprachenFuer(blatt.analyse?.format.faehigkeiten).map((s) => s.kennung));
    return ZIELSPRACHEN.filter((s) => da.has(s));
  }

  sprache(blatt: Arbeitsblatt): KiSprache {
    const s = this.sprachen(blatt);
    if (this.sprachWahl && s.includes(this.sprachWahl)) return this.sprachWahl;
    return blatt.analyse?.format.faehigkeiten.tabellarisch && s.includes("sql") ? "sql" : (s.find((x) => x === "jq") ?? s[0] ?? "jq");
  }

  /** Das Schema, das "Beschreibung aus Schema" ergänzt: das Dokument selbst, wenn es eins ist, sonst das abgeleitete */
  schemaVorher(blatt: Arbeitsblatt): string {
    const a = blatt.analyse;
    if (!a?.index) return "";
    const w = wertAus(a.index, blatt.analyseText);
    if (istObjekt(w) && ("$schema" in w || "properties" in w)) return jsonText(w, 2);
    return jsonText(alsJsonSchema(schemaAbleiten(a.index, blatt.analyseText), blatt.name.replace(/\.[^.]+$/, "")), 2);
  }

  private zusatz(blatt: Arbeitsblatt): Zusatz[] {
    if (this.aufgabe === "beschreibung") return [{ titel: "JSON Schema", text: this.schemaVorher(blatt) }];
    if (this.aufgabe === "testdaten") {
      const s = testdatenZustand(blatt).spezifikation(blatt);
      return s ? [{ titel: "Bisheriger Vorschlag", text: spezifikationText(s) }, { titel: "Erzeuger", text: erzeugerKatalog() }] : [];
    }
    return [];
  }

  private auszugArt(blatt: Arbeitsblatt): Auszugart {
    if (this.aufgabe === "abfrage" && this.sprache(blatt) === "sql") return "sql";
    return blatt.analyse?.format.faehigkeiten.xpath ? "xml" : "werte";
  }

  async fragen(blatt: Arbeitsblatt, anders = false): Promise<void> {
    const a = blatt.analyse;
    if (!a?.index || this.laeuft) return;
    const eintrag = aufgabe(this.aufgabe);
    const frage = this.frage.trim();
    if (eintrag.frage === "pflicht" && !frage) {
      this.fehler = "Erst die Frage schreiben.";
      return;
    }
    const sprache = this.aufgabe === "abfrage" ? this.sprache(blatt) : null;
    const auszug = auszugBauen({ name: blatt.name, format: a.format.name, typen: a.format.faehigkeiten.typen, index: a.index, text: blatt.analyseText }, this.auszugArt(blatt), this.zusatz(blatt));
    const vorher = anders ? (this.vorschlag?.ergebnis ?? null) : null;
    this.steuerung?.abort();
    const steuerung = (this.steuerung = new AbortController());
    this.gesendet = { frage: frage.length > 0, felder: auszug.felder, zeilen: auszug.zeilen, eintraege: auszug.eintraege, zeichen: auszug.text.length };
    this.laeuft = true;
    this.fehler = null;
    this.probe = null;
    if (!anders) this.vorschlag = null;
    try {
      const v = await ki.vorschlagen({ aufgabe: this.aufgabe, frage, auszug: auszug.text, sprache, vorher }, steuerung.signal);
      if (steuerung.signal.aborted) return;
      this.vorschlag = v;
      this.fuer = { aufgabe: this.aufgabe, sprache };
      kiVerlauf.merken({ frage: frage || eintrag.titel, aufgabe: this.aufgabe, sprache, dokument: blatt.name });
      this.probe = await probieren(blatt, this.aufgabe, sprache, v.ergebnis, this.schemaVorher.bind(this));
    } catch (f) {
      if (!steuerung.signal.aborted) this.fehler = (f as Error).message;
    } finally {
      if (this.steuerung === steuerung) {
        this.laeuft = false;
        this.steuerung = null;
      }
    }
  }

  /** Warten abbrechen oder den Vorschlag wegwerfen; nichts war übernommen */
  verwerfen(): void {
    this.steuerung?.abort();
    this.steuerung = null;
    this.laeuft = false;
    this.vorschlag = null;
    this.probe = null;
    this.fehler = null;
  }

  aufgabeWaehlen(k: KiAufgabe): void {
    if (k === this.aufgabe) return;
    this.verwerfen();
    this.aufgabe = k;
  }

  /** Den Abfragevorschlag in die Konsole übernehmen */
  inAbfrage(): void {
    const p = this.probe;
    if (p?.art === "abfrage") abfrage.uebernehmen(p.sprache, p.ausdruck);
  }

  adresseWerte(): Werte {
    return { aufgabe: this.aufgabe, ...(this.sprachWahl ? { sprache: this.sprachWahl } : {}) };
  }

  adresseUebernehmen(w: Werte): void {
    const a = AUFGABEN.find((x) => x.kennung === w.aufgabe);
    if (a) this.aufgabe = a.kennung;
    this.sprachWahl = ZIELSPRACHEN.find((s) => s === w.sprache) ?? null;
  }
}

export const kiZustand = (blatt: Arbeitsblatt): KiZustand => blatt.zustandFuer("ki", () => new KiZustand());
