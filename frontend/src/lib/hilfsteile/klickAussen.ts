// Svelte-Aktion: ruft `beiAussen` auf, sobald ausserhalb des Elements geklickt
// wird. Damit klappen schwebende Menüs und Popover bei einem Klick daneben zu.
//
// Der Listener wird erst im nächsten Tick gesetzt, damit der oeffnende Klick
// (der das Menue gerade eingeblendet hat) es nicht sofort wieder schliesst.

export function klickAussen(node: HTMLElement, beiAussen: () => void) {
  let behandeln = beiAussen

  function beiKlick(ereignis: MouseEvent): void {
    if (!node.contains(ereignis.target as Node)) behandeln()
  }

  const zeitgeber = setTimeout(() => document.addEventListener('click', beiKlick), 0)

  return {
    update(neu: () => void): void {
      behandeln = neu
    },
    destroy(): void {
      clearTimeout(zeitgeber)
      document.removeEventListener('click', beiKlick)
    },
  }
}
