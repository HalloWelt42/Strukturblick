// Backend-Erreichbarkeit: pollt den Health-Endpunkt beim Start und danach
// alle 30 Sekunden. erreichbar === null bedeutet: erste Prüfung läuft noch.

import { getHealth } from '../api/system'

const POLL_INTERVALL_MS = 30_000

export const backendStatus = $state<{
  erreichbar: boolean | null
  version: string | null
}>({
  erreichbar: null,
  version: null,
})

/** Prüft die Erreichbarkeit des Backends einmalig; auch manuell aufrufbar. */
export async function pruefeBackend(): Promise<void> {
  try {
    const antwort = await getHealth()
    backendStatus.erreichbar = true
    backendStatus.version = antwort.version
  } catch {
    backendStatus.erreichbar = false
    backendStatus.version = null
  }
}

let gestartet = false

/** Startet die Überwachung genau einmal; weitere Aufrufe sind wirkungslos. */
export function starteBackendUeberwachung(): void {
  if (gestartet) return
  gestartet = true
  void pruefeBackend()
  setInterval(() => {
    void pruefeBackend()
  }, POLL_INTERVALL_MS)
}
