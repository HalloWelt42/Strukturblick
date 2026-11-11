// Ob die Befehlspalette offen ist, und wohin der Fokus nach dem Schließen zurückgeht.

class Palettenstand {
  offen = $state(false);
  private vorher: HTMLElement | null = null;

  oeffnen(): void {
    if (this.offen) return;
    this.vorher = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    this.offen = true;
  }

  /** Schließt und gibt den Fokus an die Stelle zurück, von der aus geöffnet wurde (Editor, Baum, Tabelle). */
  schliessen(): void {
    if (!this.offen) return;
    this.offen = false;
    const ziel = this.vorher;
    this.vorher = null;
    if (ziel?.isConnected) ziel.focus({ preventScroll: true });
  }

  umschalten(): void {
    if (this.offen) this.schliessen();
    else this.oeffnen();
  }
}

export const palette = new Palettenstand();
