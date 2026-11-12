// Zustand der Ansicht Schema je Arbeitsblatt (blatt.zustandFuer("schema", ...)): Reiter, aufgeklappte Knoten, Auswahl,
// Suche und Filter der Typen. Die Übersicht (gelesenes Schema, Kennzahlen, Verwendungen) wird je Stand des Dokuments und
// der Schemas im selben Ordner einmal gerechnet, die Kinder im Elementbaum erst beim Aufklappen.

import type { Analyse } from "../../../kern";
import type { Schemadatei } from "../../../analyse/xsd/dateien";
import { kinderVon, wurzeln, type Baumknoten } from "../../../analyse/xsd/elementbaum";
import { istXmlSchema } from "../../../analyse/xsd/erkennen";
import { kennzahlen, verwendungen, type Kennzahlen, type Verwendung } from "../../../analyse/xsd/kennzahlen";
import { xsdLesen } from "../../../analyse/xsd/lesen";
import type { QName, XsdModell } from "../../../analyse/xsd/modell";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
import { schemasDerAblage, schemasImOrdner } from "../../../zustand/schemadateien";

export type Reiter = "baum" | "typen" | "statistik";
export type Typfilter = "alle" | "komplex" | "einfach" | "werte" | "ungenutzt";
export type Schemawahl = { readonly art: "knoten"; readonly kennung: string } | { readonly art: "typ"; readonly schluessel: QName } | null;

export interface Uebersicht {
  readonly modell: XsdModell;
  readonly kennzahlen: Kennzahlen;
  readonly verwendungen: ReadonlyMap<QName, readonly Verwendung[]>;
  readonly wurzeln: readonly Baumknoten[];
  readonly dauer: number;
}

/** Zeigt die Ansicht Schema etwas? Bei Dokumenten, deren Format XML Schema kennt und die eins sind */
export function istSchemaDokument(blatt: Arbeitsblatt): boolean {
  return blatt.analyse?.format.faehigkeiten.schemasprache === "xml-schema" && istXmlSchema(blatt.analyseText);
}

export class SchemaZustand {
  reiter = $state<Reiter>("baum");
  offen = $state.raw<ReadonlySet<string>>(new Set());
  wahl = $state.raw<Schemawahl>(null);
  suche = $state("");
  filter = $state<Typfilter>("alle");
  rollstand = 0;
  /** Die übrigen XSD im Ordner des Dokuments (Kandidaten für Importe) und woraus sie gelesen wurden */
  nachbarn = $state.raw<{ readonly stand: string; readonly dateien: readonly Schemadatei[] } | null>(null);
  private laeuft = false;
  private merk: { analyse: Analyse; nachbarn: SchemaZustand["nachbarn"]; uebersicht: Uebersicht } | null = null;
  private kinderMerk = new Map<string, Baumknoten[]>();

  uebersicht(blatt: Arbeitsblatt): Uebersicht | null {
    const a = blatt.analyse;
    if (!a || !istSchemaDokument(blatt)) return null;
    if (this.merk?.analyse === a && this.merk.nachbarn === this.nachbarn) return this.merk.uebersicht;
    const start = performance.now();
    const modell = xsdLesen({ pfad: blatt.name, text: blatt.analyseText }, this.nachbarn?.dateien ?? []);
    const uebersicht: Uebersicht = { modell, kennzahlen: kennzahlen(modell), verwendungen: verwendungen(modell).nach, wurzeln: wurzeln(modell), dauer: performance.now() - start };
    this.merk = { analyse: a, nachbarn: this.nachbarn, uebersicht };
    this.kinderMerk.clear();
    return uebersicht;
  }

  /** Stand der Schemas im Ordner: ändert sich, wenn eins dazukommt, wegfällt oder gespeichert wird */
  private standDerNachbarn(blatt: Arbeitsblatt): string {
    return `${blatt.ordner}|${schemasDerAblage().filter((d) => d.ordner === blatt.ordner && d.kennung !== blatt.kennung).map((d) => d.kennung).join(",")}`;
  }

  /** Nachbarn (neu) laden, wenn sich der Ordner oder seine Schemas geändert haben */
  async nachbarnLaden(blatt: Arbeitsblatt): Promise<void> {
    const stand = this.standDerNachbarn(blatt);
    if (this.laeuft || this.nachbarn?.stand === stand) return;
    this.laeuft = true;
    try {
      this.nachbarn = { stand, dateien: await schemasImOrdner(blatt.ordner, blatt.kennung) };
    } finally {
      this.laeuft = false;
    }
    if (this.standDerNachbarn(blatt) !== stand) void this.nachbarnLaden(blatt);
  }

  kinder(u: Uebersicht, k: Baumknoten): Baumknoten[] {
    let c = this.kinderMerk.get(k.kennung);
    if (!c) this.kinderMerk.set(k.kennung, (c = kinderVon(u.modell, k)));
    return c;
  }

  /** Sichtbare Zeilen des Elementbaums: Wurzeln und alles unter aufgeklappten Knoten */
  zeilen(u: Uebersicht): Baumknoten[] {
    const aus: Baumknoten[] = [];
    const stapel = [...u.wurzeln].reverse();
    while (stapel.length) {
      const k = stapel.pop()!;
      aus.push(k);
      if (this.offen.has(k.kennung)) stapel.push(...[...this.kinder(u, k)].reverse());
    }
    return aus;
  }

  /** Knoten zu einer Kennung ("0/3/1") über die Kinder suchen */
  knoten(u: Uebersicht, kennung: string): Baumknoten | null {
    const stellen = kennung.split("/").map(Number);
    let k: Baumknoten | undefined = u.wurzeln[stellen[0]];
    for (const s of stellen.slice(1)) k = k ? this.kinder(u, k)[s] : undefined;
    return k ?? null;
  }

  umschalten(kennung: string): void {
    const n = new Set(this.offen);
    if (!n.delete(kennung)) n.add(kennung);
    this.offen = n;
  }

  /** Eine Ebene weiter: alle sichtbaren Knoten mit Kindern aufklappen */
  ebeneWeiter(u: Uebersicht): void {
    const n = new Set(this.offen);
    for (const k of this.zeilen(u)) if (this.kinder(u, k).length) n.add(k.kennung);
    this.offen = n;
  }

  zuklappen(): void {
    this.offen = new Set();
  }
}

export const schemaZustand = (blatt: Arbeitsblatt): SchemaZustand => blatt.zustandFuer("schema", () => new SchemaZustand());
