// Kurzmeldungen (Toasts): reaktive Liste, Eintraege verschwinden nach 4 s.

export type MeldungsArt = 'info' | 'erfolg' | 'fehler'

export interface Meldung {
  id: string
  text: string
  art: MeldungsArt
  // Optionale zweite Zeile, z. B. der kopierte Wert - wird monospace angezeigt.
  detail?: string
}

const ANZEIGE_DAUER_MS = 4000

export const toaster = $state<{ meldungen: Meldung[] }>({ meldungen: [] })

export function zeige(text: string, art: MeldungsArt = 'info', detail?: string): void {
  const id = crypto.randomUUID()
  toaster.meldungen.push({ id, text, art, detail })
  setTimeout(() => entferne(id), ANZEIGE_DAUER_MS)
}

export function entferne(id: string): void {
  const index = toaster.meldungen.findIndex((meldung) => meldung.id === id)
  if (index !== -1) toaster.meldungen.splice(index, 1)
}
