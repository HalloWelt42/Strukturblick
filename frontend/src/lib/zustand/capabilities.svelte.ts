// Capabilities des Backends (Formate, Konvertierungsmatrix, Limits):
// werden einmal beim Start geladen. Solange daten und fehler beide null
// sind, läuft die Anfrage noch.

import { getCapabilities } from '../api/system'
import type { CapabilitiesAntwort } from '../api/typen'

export const capabilities = $state<{
  daten: CapabilitiesAntwort | null
  fehler: string | null
}>({
  daten: null,
  fehler: null,
})

let gestartet = false

/** Lädt die Capabilities genau einmal; weitere Aufrufe sind wirkungslos. */
export function ladeCapabilities(): void {
  if (gestartet) return
  gestartet = true
  getCapabilities()
    .then((antwort) => {
      capabilities.daten = antwort
      capabilities.fehler = null
    })
    .catch((grund: unknown) => {
      capabilities.fehler = grund instanceof Error ? grund.message : String(grund)
    })
}
