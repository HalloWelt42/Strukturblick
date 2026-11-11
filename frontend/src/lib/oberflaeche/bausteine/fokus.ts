// Feld beim Erscheinen fokussieren und seinen Inhalt markieren (Tippen ersetzt), auch wenn es nach einem Klick auf einen
// Knopf entsteht, der den Fokus sonst behält. Als Svelte-Aktion: <input use:fokussieren />.

export function fokussieren(feld: HTMLInputElement): void {
  requestAnimationFrame(() => {
    feld.focus();
    feld.select();
  });
}
