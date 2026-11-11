// Zustand der Baumansicht je Blatt: Ebene, umgeschaltete Behälter, Suche und Rollstand. Behälter merken wir uns als
// JSON Pointer, nicht als Knotennummer; so überdauert das Aufgeklappte das Neulesen nach einer Änderung.

import { ALLE_EBENEN } from "../../../analyse/baumzeilen";

export type Ebene = 1 | 2 | 3 | 4 | "alle";

export const EBENEN: readonly Ebene[] = [1, 2, 3, 4, "alle"];

export class BaumZustand {
  ebene = $state<Ebene>(3);
  /** Behälter, die gegen die Ebene umgeschaltet sind (JSON Pointer) */
  umgeschaltet = $state.raw<ReadonlySet<string>>(new Set());
  suche = $state("");
  nurTreffer = $state(false);
  rollstand = $state(0);

  /** Ebene als Zahl für die Rechnung (Alle: unendlich) */
  get ebeneZahl(): number {
    return this.ebene === "alle" ? ALLE_EBENEN : this.ebene;
  }

  /** Neue Ebene; einzelne Umschaltungen gelten dann nicht mehr. */
  ebeneSetzen(e: Ebene): void {
    this.ebene = e;
    this.umgeschaltet = new Set();
  }

  /** Behälter gegen die Ebene umschalten (auf- oder zuklappen). */
  umschalten(...zeiger: string[]): void {
    const neu = new Set(this.umgeschaltet);
    for (const z of zeiger) {
      if (neu.has(z)) neu.delete(z);
      else neu.add(z);
    }
    this.umgeschaltet = neu;
  }
}
