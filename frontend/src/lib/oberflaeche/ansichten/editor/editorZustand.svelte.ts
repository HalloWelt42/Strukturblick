// Zustand des Editors je Arbeitsblatt (blatt.zustandFuer("editor")): Cursor und Rollstand überleben den Wechsel der
// Ansicht, dazu der Suchtext und die Anzeige unter dem Editor (Cursorstelle, Befunde der letzten Analyse).

import type { Schwere } from "../../../kern";

export interface Befund {
  readonly nummer: number;               // Stelle in der Diagnoseliste der Analyse
  readonly schwere: Schwere;
  readonly meldung: string;
  readonly zeile: number;
  readonly spalte: number;
}

export interface Befundzahlen {
  readonly fehler: number;
  readonly warnungen: number;
  readonly hinweise: number;
}

export class EditorZustand {
  anker = $state(0);
  kopf = $state(0);
  /** Anfang der obersten sichtbaren Zeile, als Stelle im Text */
  oben = $state(0);
  /** Das Gewählte, als der Editor zuletzt offen war; ändert es sich inzwischen, springt der Cursor dorthin */
  zeiger = $state<string | null>(null);
  suche = $state("");

  zeile = $state(1);
  spalte = $state(1);
  befunde = $state.raw<readonly Befund[]>([]);
  zahlen = $state.raw<Befundzahlen>({ fehler: 0, warnungen: 0, hinweise: 0 });
}
