// Gesten des Editors: Tippen in einem Zug ist ein Verlaufsschritt. Eine neue Geste beginnt nach einer Pause, nach einem
// Cursorsprung (abbrechen) und bei Einfügen, Ablegen oder Ausschneiden (einzeln, auch das Tippen danach beginnt neu).

export const GESTE_PAUSE_MS = 1000;

export class Gesten {
  private kennung: string | null = null;
  private zuletzt = 0;

  constructor(
    private readonly pause = GESTE_PAUSE_MS,
    private readonly neueKennung: () => string = () => globalThis.crypto.randomUUID(),
  ) {}

  /** Kennung für eine Änderung zur Zeit `jetzt` (ms); `einzeln` heißt: eigene Geste. */
  fuer(jetzt: number, einzeln: boolean): string {
    if (einzeln) {
      this.kennung = null;
      return this.neueKennung();
    }
    if (this.kennung === null || jetzt - this.zuletzt > this.pause) this.kennung = this.neueKennung();
    this.zuletzt = jetzt;
    return this.kennung;
  }

  abbrechen(): void {
    this.kennung = null;
  }
}
