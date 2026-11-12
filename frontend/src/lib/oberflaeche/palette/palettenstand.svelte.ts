// Ob die Trefferliste des Befehlsfelds im Kopf offen ist, das Feld selbst (⌘ K springt hinein) und wohin der Fokus nach
// dem Schließen zurückgeht.

class Palettenstand {
  offen = $state(false);
  private feld: HTMLInputElement | null = null;
  private vorher: HTMLElement | null = null;

  feldSetzen(feld: HTMLInputElement | null): void {
    this.feld = feld;
  }

  /** Öffnet die Liste und setzt den Fokus ins Feld; merkt, woher er kam (Editor, Baum, Tabelle) */
  oeffnen(): void {
    const aktiv = document.activeElement;
    if (aktiv instanceof HTMLElement && aktiv !== this.feld && !this.offen) this.vorher = aktiv;
    this.offen = true;
    if (this.feld && document.activeElement !== this.feld) {
      this.feld.focus();
      this.feld.select();
    }
  }

  /** Schließt; mit `zurueck` geht der Fokus an die Stelle, von der aus geöffnet wurde. */
  schliessen(zurueck = true): void {
    if (!this.offen) return;
    this.offen = false;
    const ziel = this.vorher;
    this.vorher = null;
    if (!zurueck) return;
    if (ziel?.isConnected) ziel.focus({ preventScroll: true });
    else this.feld?.blur();
  }

  umschalten(): void {
    if (this.offen) this.schliessen();
    else this.oeffnen();
  }
}

export const palette = new Palettenstand();
