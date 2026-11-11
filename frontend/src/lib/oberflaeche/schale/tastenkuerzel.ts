// Globale Tastenkürzel: Rückgängig und Wiederholen außerhalb des Editors (der Editor hat seine eigenen, die über
// dieselbe Sitzung laufen). In Eingabefeldern bleibt die Taste beim Feld.

import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";

const imFeld = (e: KeyboardEvent): boolean => {
  const z = e.target as HTMLElement | null;
  return !!z && (z.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(z.tagName) || !!z.closest(".cm-editor"));
};

export function tastenkuerzel(blatt: () => Arbeitsblatt | null): () => void {
  const taste = (e: KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey) || imFeld(e)) return;
    const b = blatt();
    if (!b) return;
    if (e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); b.rueckgaengig(); }
    else if ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y") { e.preventDefault(); b.wiederholen(); }
  };
  window.addEventListener("keydown", taste);
  return () => window.removeEventListener("keydown", taste);
}
