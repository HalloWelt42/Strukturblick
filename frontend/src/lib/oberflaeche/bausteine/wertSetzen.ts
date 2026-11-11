// Direktes Bearbeiten eines einzelnen Werts aus Baum oder Inspektor: die Eingabe wird nach der Art des alten Werts zum
// neuen Wert und läuft als Befehl "wert.setzen" über das Blatt (ein Weg für jede Änderung, mit Meldung und Rückgängig).

import type { Ergebnis } from "../../kern";
import { neuerWertAus } from "../../analyse/werteingabe";
import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";

export type Bearbeitungsort = "Baum" | "Tabelle" | "Inspektor";

export function wertSetzen(blatt: Arbeitsblatt, zeiger: string, alteArt: number, eingabe: string, ort: Bearbeitungsort): Promise<Ergebnis> {
  return blatt.ausfuehrenMitMeldung("wert.setzen", { zeiger, neu: neuerWertAus(alteArt, eingabe, blatt.analyse?.format.faehigkeiten.typen ?? true) }, { ort });
}
