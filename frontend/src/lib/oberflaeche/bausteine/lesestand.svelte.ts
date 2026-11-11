// Lesestand eines Blatts für die Anzeige: die letzte Analyse zusammen mit dem Text, aus dem sie stammt (das Blatt
// führt beide als Paar). Solange neu gelesen wird, bleibt dieses Paar stehen; so passen Positionen und Text immer
// zueinander, auch wenn `blatt.text` schon weiter ist. `aktuell` sagt, ob Bearbeitungen mit Positionen gerade erlaubt sind.

import type { Analyse } from "../../kern";
import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";

export interface Lesestand {
  readonly analyse: Analyse;
  readonly text: string;
  /** Die Analyse gehört zur aktuellen Revision */
  readonly aktuell: boolean;
}

export interface Lesestandquelle {
  readonly stand: Lesestand | null;
}

/** Beim Anlegen einer Komponente aufrufen; `stand` folgt dem Blatt. */
export function lesestand(blatt: () => Arbeitsblatt): Lesestandquelle {
  const stand = $derived.by((): Lesestand | null => {
    const b = blatt();
    return b.analyse ? { analyse: b.analyse, text: b.analyseText, aktuell: b.aktuell } : null;
  });
  return {
    get stand() {
      return stand;
    },
  };
}
