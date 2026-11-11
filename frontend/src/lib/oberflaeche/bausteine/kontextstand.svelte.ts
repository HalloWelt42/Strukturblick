// Eigene Kontextmenüs (STB-36): ein Menü zur Zeit, geöffnet per Rechtsklick, Kontextmenü-Taste oder Umschalt+F10 an
// Elementen mit der Aktion `kontext`. Die Einträge baut, wer das Element kennt (aktionen/kontextmenues.ts); hier liegen
// nur Stand und Öffnen. In Eingabefeldern und im Editor bleibt das Menü des Browsers (Kopieren, Einfügen).

export interface Menuepunkt {
  readonly titel: string;
  readonly symbol: string;
  /** Kürzel zur Anzeige ("⌘ K") */
  readonly kuerzel?: string;
  /** Rot: entfernt oder verwirft etwas */
  readonly gefahr?: boolean;
  /** Ausgegraut, mit Grund als Erklärung */
  readonly gesperrt?: string;
  readonly ausfuehren?: () => void;
  /** Untermenü (eine Ebene) */
  readonly unter?: readonly Menueeintrag[];
}

export type Menueeintrag = Menuepunkt | "trenner";

export interface Menuestand {
  readonly x: number;
  readonly y: number;
  readonly titel: string;
  readonly eintraege: readonly Menueeintrag[];
  /** Element, das nach dem Schließen den Fokus zurückbekommt */
  readonly herkunft: HTMLElement | null;
}

class Kontextmenue {
  stand = $state.raw<Menuestand | null>(null);

  oeffnen(x: number, y: number, titel: string, eintraege: readonly Menueeintrag[], herkunft: HTMLElement | null): void {
    this.stand = { x, y, titel, eintraege, herkunft };
  }

  schliessen(fokusZurueck = true): void {
    const h = this.stand?.herkunft;
    this.stand = null;
    if (fokusZurueck && h?.isConnected) h.focus({ preventScroll: true });
  }
}

export const kontextmenue = new Kontextmenue();

/** Was ein Element anbietet: Überschrift und Einträge, beim Öffnen gebaut (immer der aktuelle Stand) */
export type Kontextquelle = () => { readonly titel: string; readonly eintraege: readonly Menueeintrag[] } | null;

/**
 * Svelte-Aktion: Rechtsklick, Kontextmenü-Taste und Umschalt+F10 am Element öffnen das eigene Menü. Mit der Tastatur
 * geöffnet, steht es unter dem Element.
 */
export function kontext(element: HTMLElement, quelle: Kontextquelle) {
  let holen = quelle;
  const oeffnen = (x: number, y: number): boolean => {
    const m = holen();
    if (!m) return false;
    kontextmenue.oeffnen(x, y, m.titel, m.eintraege, element);
    return true;
  };
  const rechtsklick = (e: MouseEvent) => {
    if (oeffnen(e.clientX, e.clientY)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  const taste = (e: KeyboardEvent) => {
    if (e.key !== "ContextMenu" && !(e.key === "F10" && e.shiftKey)) return;
    const r = element.getBoundingClientRect();
    if (oeffnen(r.left + Math.min(24, r.width / 2), r.bottom)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  element.addEventListener("contextmenu", rechtsklick);
  element.addEventListener("keydown", taste);
  return {
    update(neu: Kontextquelle) {
      holen = neu;
    },
    destroy() {
      element.removeEventListener("contextmenu", rechtsklick);
      element.removeEventListener("keydown", taste);
    },
  };
}
