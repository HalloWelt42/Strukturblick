// Feld beim Erscheinen fokussieren und seinen Inhalt markieren (Tippen ersetzt), auch wenn es nach einem Klick auf einen
// Knopf entsteht, der den Fokus sonst behält. Als Svelte-Aktion: <input use:fokussieren />.
//
// Sofort, nicht erst nach dem nächsten Bild: wer ein Feld per Taste öffnet (⌘ K) und gleich tippt, verliert sonst die
// ersten Buchstaben. Nimmt der Klick, der das Feld erzeugt hat, den Fokus danach noch zurück, holt ihn das nächste Bild.

function setzen(feld: HTMLInputElement): void {
  feld.focus();
  feld.select();
}

export function fokussieren(feld: HTMLInputElement): void {
  setzen(feld);
  requestAnimationFrame(() => {
    if (feld.isConnected && document.activeElement !== feld) setzen(feld);
  });
}
