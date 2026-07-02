// Status des gerade laufenden Vergleichs als reaktiver Modul-Zustand. Die
// Tab-Leiste liest ihn, um die beiden am Vergleich beteiligten Dokument-Tabs
// hervorzuheben. linksTabId ist der aktive Tab (linke Seite); rechtsTabId ist
// nur gesetzt, wenn die rechte Seite ein offener Tab ist - bei gespeicherten
// Dokumenten (ohne eigenen Tab) bleibt sie null.

export const vergleichStatus = $state<{
  aktiv: boolean
  linksTabId: string | null
  rechtsTabId: string | null
}>({
  aktiv: false,
  linksTabId: null,
  rechtsTabId: null,
})

/** Markiert einen laufenden Vergleich zwischen den beiden Tabs (rechts optional). */
export function setzeVergleich(linksTabId: string, rechtsTabId: string | null): void {
  vergleichStatus.aktiv = true
  vergleichStatus.linksTabId = linksTabId
  vergleichStatus.rechtsTabId = rechtsTabId
}

/** Beendet den Vergleich und hebt die Tab-Hervorhebung wieder auf. */
export function beendeVergleich(): void {
  vergleichStatus.aktiv = false
  vergleichStatus.linksTabId = null
  vergleichStatus.rechtsTabId = null
}
