// Zustand des Werkzeugs Validieren je Blatt: woher das Schema kommt (ein Dokument der Ablage oder aus den Daten
// abgeleitet), sein Text, Filter und gewählter Befund. Die Prüfung wird je Analyse und Schematext gemerkt, damit
// Hauptbereich und Inspektor dasselbe Ergebnis teilen.

import type { Analyse } from "../../../kern";
import { alsJsonSchema, schemaAbleiten } from "../../../analyse/schema";
import { pruefen, schemaLesen, type Pruefung } from "../../../analyse/validieren";
import { ablageverwaltung } from "../../../zustand/ablageverwaltung.svelte";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";

export type Schemaquelle = { readonly art: "daten" } | { readonly art: "dokument"; readonly kennung: string; readonly name: string };
export type Befundfilter = "alle" | "fehler" | "warnung";

export class ValidierenZustand {
  quelle = $state<Schemaquelle>({ art: "daten" });
  /** Text des gewählten Schemadokuments (geladen beim Wählen und bei "Erneut prüfen") */
  schemaText = $state.raw<string | null>(null);
  ladefehler = $state<string | null>(null);
  filter = $state<Befundfilter>("alle");
  gewaehlt = $state(0);
  private merk: { analyse: Analyse; schluessel: string; pruefung: Pruefung; schema: Record<string, unknown> | null } | null = null;

  async dokumentWaehlen(kennung: string, name: string): Promise<void> {
    this.quelle = { art: "dokument", kennung, name };
    await this.neuLaden();
  }

  datenWaehlen(): void {
    this.quelle = { art: "daten" };
    this.schemaText = null;
    this.ladefehler = null;
    this.gewaehlt = 0;
  }

  /** Schemadokument neu holen (nach einer Änderung am Schema) */
  async neuLaden(): Promise<void> {
    const q = this.quelle;
    if (q.art !== "dokument") return;
    const t = await ablageverwaltung.textVon(q.kennung);
    this.schemaText = t?.text ?? null;
    this.ladefehler = t ? null : `${q.name} gibt es in der Ablage nicht mehr`;
    this.gewaehlt = 0;
  }

  /** Prüfung zur aktuellen Analyse des Blatts; null, solange nichts zu prüfen ist */
  pruefung(blatt: Arbeitsblatt): { pruefung: Pruefung; schema: Record<string, unknown> | null } | null {
    const a = blatt.analyse;
    if (!a?.index) return null;
    const q = this.quelle;
    const schluessel = q.art === "daten" ? "daten" : `dokument:${this.schemaText ?? ""}`;
    if (this.merk?.analyse === a && this.merk.schluessel === schluessel) return this.merk;
    let schema: Record<string, unknown> | null = null;
    let pruefung: Pruefung;
    if (q.art === "daten") {
      schema = alsJsonSchema(schemaAbleiten(a.index, blatt.analyseText), blatt.name);
      pruefung = pruefen(a.index, blatt.analyseText, schema);
    } else if (this.schemaText === null) {
      pruefung = { ok: false, fehler: this.ladefehler ?? "Das Schema wird geladen ..." };
    } else {
      const s = schemaLesen(this.schemaText);
      schema = s.ok ? s.schema : null;
      pruefung = s.ok ? pruefen(a.index, blatt.analyseText, s.schema) : { ok: false, fehler: s.fehler };
    }
    this.merk = { analyse: a, schluessel, pruefung, schema };
    return this.merk;
  }
}

export const validierenZustand = (blatt: Arbeitsblatt): ValidierenZustand => blatt.zustandFuer("validieren", () => new ValidierenZustand());
