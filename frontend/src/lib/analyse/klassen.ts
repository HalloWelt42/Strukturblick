// Zahlen in runde Klassen teilen (Histogramm in Statistik, Verteilung in den Facetten): Schritt 1, 2 oder 5 mal einer
// Zehnerpotenz, so dass etwa `ziel` Klassen entstehen. Ohne Spread über große Felder (Stapelüberlauf ab etwa 100.000).

export interface Klasse {
  readonly von: number;
  readonly bis: number;
  readonly anzahl: number;
}

export interface Klassen {
  readonly klassen: readonly Klasse[];
  readonly schritt: number;
}

/** Ein runder Schritt für etwa `ziel` Klassen (1, 2, 5 mal Zehnerpotenz) */
export function schrittFuer(spanne: number, ziel: number): number {
  if (spanne <= 0) return 1;
  const roh = spanne / ziel;
  const p = 10 ** Math.floor(Math.log10(roh));
  return [1, 2, 5, 10].map((f) => f * p).find((s) => s >= roh) ?? 10 * p;
}

/** Kleinster und größter Wert in einem Durchgang */
export function spanne(zahlen: ArrayLike<number>): { min: number; max: number } | null {
  if (!zahlen.length) return null;
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < zahlen.length; i++) {
    if (zahlen[i] < min) min = zahlen[i];
    if (zahlen[i] > max) max = zahlen[i];
  }
  return { min, max };
}

/** `ganz`: nur ganze Zahlen, dann ist der Schritt mindestens 1 (sonst entstehen leere halbe Klassen) */
export function klassenBilden(zahlen: ArrayLike<number>, ziel = 12, ganz = false): Klassen {
  const s = spanne(zahlen);
  if (!s) return { klassen: [], schritt: 1 };
  const roh = schrittFuer(s.max - s.min, ziel);
  const schritt = ganz ? Math.max(1, roh) : roh;
  const anfang = Math.floor(s.min / schritt) * schritt;
  const anzahl = Math.max(1, Math.floor((s.max - anfang) / schritt) + 1);
  const zaehler = new Array<number>(anzahl).fill(0);
  for (let i = 0; i < zahlen.length; i++) zaehler[Math.min(anzahl - 1, Math.floor((zahlen[i] - anfang) / schritt))]++;
  return { klassen: zaehler.map((n, j) => ({ von: anfang + j * schritt, bis: anfang + (j + 1) * schritt, anzahl: n })), schritt };
}
