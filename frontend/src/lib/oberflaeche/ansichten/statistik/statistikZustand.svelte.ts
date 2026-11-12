// Zustand der Statistik je Arbeitsblatt (blatt.zustandFuer("statistik", ...)): welche Liste profiliert wird (bleibt,
// auch wenn die Wahl in eine verschachtelte Liste springt) und welches Feld gewählt ist.

import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
import type { Adressierbar, Werte } from "../../../zustand/adresse";

export class StatistikZustand implements Adressierbar {
  /** Zeiger der profilierten Liste */
  basis = $state<string | null>(null);
  /** Musterpfad des gewählten Felds */
  feld = $state<string | null>(null);

  adresseWerte(): Werte {
    return { ...(this.basis !== null ? { liste: this.basis } : {}), ...(this.feld !== null ? { feld: this.feld } : {}) };
  }

  adresseUebernehmen(w: Werte): void {
    this.basis = w.liste ?? null;
    this.feld = w.feld ?? null;
  }
}

export const statistikZustand = (blatt: Arbeitsblatt): StatistikZustand => blatt.zustandFuer("statistik", () => new StatistikZustand());
