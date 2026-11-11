// Zustand der Statistik je Arbeitsblatt (blatt.zustandFuer("statistik", ...)): welche Liste profiliert wird (bleibt,
// auch wenn die Wahl in eine verschachtelte Liste springt) und welches Feld gewählt ist.

export class StatistikZustand {
  /** Zeiger der profilierten Liste */
  basis = $state<string | null>(null);
  /** Musterpfad des gewählten Felds */
  feld = $state<string | null>(null);
}
