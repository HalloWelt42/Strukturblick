// Tastatur der ganzen App: ein Lauscher erkennt die Kürzel aus dem Register der Aktionen und das Kürzel der
// Befehlspalette. In Eingabefeldern und im Editor bleibt eine Taste beim Feld, außer die Aktion gilt überall.

import { istMac, kappen, kuerzelText, passt, type Tasten } from "../palette/tasten";
import { palette } from "../palette/palettenstand.svelte";
import { AKTIONEN, type Aktion } from "./aktionen";

export const MAC = istMac(navigator.platform);

/** Befehlspalette öffnen und schließen; gilt überall, auch im Editor */
export const PALETTE_TASTEN: Tasten = { taste: "k", befehl: true };

/** Tastenkappen des ersten Kürzels einer Aktion (für Palette und Knöpfe) */
export const aktionKappen = (a: Aktion): string[] => (a.tasten?.[0] ? kappen(a.tasten[0], MAC) : []);
export const paletteKappen = (): string[] => kappen(PALETTE_TASTEN, MAC);

/** Titel eines Knopfs mit Kürzel: "Rückgängig: Wert geändert (⌘ Z)" */
export function knopfTitel(a: Aktion, text = a.titel): string {
  return a.tasten?.[0] ? `${text} (${kuerzelText(a.tasten[0], MAC)})` : text;
}

const imFeld = (ziel: EventTarget | null): boolean => {
  const z = ziel as HTMLElement | null;
  return !!z && (z.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(z.tagName) || !!z.closest?.(".cm-editor"));
};

export function tastaturAnmelden(): () => void {
  const taste = (e: KeyboardEvent) => {
    if (e.isComposing) return;
    if (passt(PALETTE_TASTEN, e, MAC)) {
      e.preventDefault();
      e.stopPropagation();
      palette.umschalten();
      return;
    }
    if (palette.offen) return;                 // die Palette bedient ihre Tasten selbst
    const feld = imFeld(e.target);
    for (const a of AKTIONEN) {
      if (!a.tasten?.some((t) => passt(t, e, MAC)) || (feld && !a.ueberall)) continue;
      e.preventDefault();
      e.stopPropagation();
      if (a.verfuegbar()) a.ausfuehren();
      return;
    }
  };
  // In der Einfangphase, damit Felder ein Kürzel wie ⌘ S nicht vorher verschlucken
  window.addEventListener("keydown", taste, { capture: true });
  return () => window.removeEventListener("keydown", taste, { capture: true });
}
