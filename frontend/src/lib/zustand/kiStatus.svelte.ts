// Erreichbarkeit des lokalen Sprachmodells: prüft die in kiEinstellungen
// hinterlegte Adresse beim Start, danach alle 30 Sekunden sowie bei jedem
// Fensterfokus. erreichbar === null bedeutet: die erste Prüfung läuft noch
// (dezenter, neutraler Status-Punkt). Der Status-Endpunkt wirft nie.

import { getKiStatus } from '../api/ki'
import { kiEinstellungen } from './kiEinstellungen.svelte'

const POLL_INTERVALL_MS = 30_000

export const kiStatus = $state<{
  erreichbar: boolean | null
  modelle: string[]
  fehler: string | null
}>({
  erreichbar: null,
  modelle: [],
  fehler: null,
})

let laeuftGerade = false

/** Prüft die aktuell eingestellte Adresse; überspringt parallele Aufrufe. */
export async function pruefe(): Promise<void> {
  if (laeuftGerade) return
  laeuftGerade = true
  try {
    const antwort = await getKiStatus(kiEinstellungen.basisUrl, kiEinstellungen.modell)
    kiStatus.erreichbar = antwort.erreichbar
    kiStatus.modelle = antwort.modelle
    kiStatus.fehler = antwort.fehler
  } catch (grund: unknown) {
    kiStatus.erreichbar = false
    kiStatus.modelle = []
    kiStatus.fehler = grund instanceof Error ? grund.message : String(grund)
  } finally {
    laeuftGerade = false
  }
}

let gestartet = false

/** Startet die Überwachung genau einmal; weitere Aufrufe sind wirkungslos. */
export function starteKiUeberwachung(): void {
  if (gestartet) return
  gestartet = true
  void pruefe()
  setInterval(() => {
    void pruefe()
  }, POLL_INTERVALL_MS)
  window.addEventListener('focus', () => {
    void pruefe()
  })
}
