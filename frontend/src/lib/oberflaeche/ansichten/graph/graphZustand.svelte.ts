// Zustand der Ansicht Graph je Arbeitsblatt (blatt.zustandFuer("graph", ...)): Fokus (Zeiger, "" ist die Wurzel) und
// Tiefe. Der Ausschnitt wird je Lesestand, Fokus und Tiefe einmal gerechnet, damit Ansicht und Inspektor dasselbe zeigen.

import { KEIN, knotenZu, type Analyse } from "../../../kern";
import { graphAusschnitt, type Ausschnitt } from "../../../analyse/graph";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";

export const TIEFEN = [1, 2, 3] as const;

export class GraphZustand {
  fokus = $state("");
  tiefe = $state(2);
  private merk: { analyse: Analyse; fokus: string; tiefe: number; ausschnitt: Ausschnitt } | null = null;

  /** Fokusknoten im aktuellen Index; gibt es den Zeiger nicht mehr, die Wurzel */
  fokusKnoten(blatt: Arbeitsblatt): number {
    const index = blatt.analyse?.index;
    if (!index) return KEIN;
    const k = knotenZu(index, blatt.analyseText, this.fokus);
    return k === KEIN ? 0 : k;
  }

  ausschnitt(blatt: Arbeitsblatt): Ausschnitt | null {
    const a = blatt.analyse;
    if (!a?.index || a.index.anzahl === 0) return null;
    const m = this.merk;
    if (m && m.analyse === a && m.fokus === this.fokus && m.tiefe === this.tiefe) return m.ausschnitt;
    const ausschnitt = graphAusschnitt(a.index, blatt.analyseText, this.fokusKnoten(blatt), this.tiefe);
    this.merk = { analyse: a, fokus: this.fokus, tiefe: this.tiefe, ausschnitt };
    return ausschnitt;
  }
}

export const graphZustand = (blatt: Arbeitsblatt): GraphZustand => blatt.zustandFuer("graph", () => new GraphZustand());
