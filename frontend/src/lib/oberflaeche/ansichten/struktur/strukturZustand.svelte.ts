// Zustand der Struktur je Arbeitsblatt (blatt.zustandFuer("struktur", ...)): gewählter Typ und Zoom. Das Schema wird
// je gelesener Analyse einmal abgeleitet und gemerkt, damit Ansicht und Inspektor dasselbe zeigen, ohne doppelt zu rechnen.

import type { Analyse } from "../../../kern";
import { schemaAbleiten, type Schema } from "../../../analyse/schema";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";

export const ZOOM_STUFEN = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5] as const;

export class StrukturZustand {
  /** Name des gewählten Typs; null: die Wurzel */
  typ = $state<string | null>(null);
  zoom = $state(1);
  private merk: { analyse: Analyse; schema: Schema } | null = null;

  schema(blatt: Arbeitsblatt): Schema | null {
    const a = blatt.analyse;
    if (!a?.index) return null;
    if (this.merk?.analyse !== a) this.merk = { analyse: a, schema: schemaAbleiten(a.index, blatt.analyseText) };
    return this.merk.schema;
  }
}

export const strukturZustand = (blatt: Arbeitsblatt): StrukturZustand => blatt.zustandFuer("struktur", () => new StrukturZustand());
