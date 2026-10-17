// Neue Fassung auf dem Server: nie ein hartes Neuladen verlangen (Muster aus Orbit).
// Die Startseite kommt ohne Zwischenspeicher. Meldet das Backend (Health, abgefragt von
// backendStatus beim Start, alle 30 Sekunden und hier, wenn das Fenster nach vorn kommt)
// eine andere Fassung als die eingebaute, lädt die Seite von selbst neu: in den ersten
// Sekunden nach dem Start sofort, später beim nächsten Ortswechsel (anderer Tab, andere
// Ansicht, Werkzeug geschlossen) oder wenn das Fenster wieder nach vorn kommt. Nie, solange
// etwas in Arbeit ist (zustand/arbeit.svelte.ts); vor dem Neuladen wird der Arbeitsstand
// gesichert. Dazwischen steht ein Band mit Knopf (schale/NeueFassung.svelte). Je Fassung des
// Backends nur ein selbsttätiger Versuch (Merker in der Sitzung), damit ein hängender
// Zwischenspeicher keine Schleife auslöst.

import { tick, untrack } from 'svelte'

import { ruhig } from './arbeit.svelte'
import { backendStatus, pruefeBackend } from './backendStatus.svelte'
import { sichereArbeitsstandJetzt, tabs } from './tabs.svelte'
import { werkzeug } from './werkzeug.svelte'

export const OBERFLAECHE_FASSUNG = __APP_VERSION__
const MERKER = 'strukturblick.neu_geladen'
const START_FENSTER_MS = 10_000

export const fassung = $state<{ neu: string | null }>({ neu: null })

export type Anlass = 'start' | 'takt' | 'ortswechsel' | 'sichtbar'

function erlaubt(neu: string): boolean {
  try {
    if (sessionStorage.getItem(MERKER) === neu) return false
    sessionStorage.setItem(MERKER, neu)
  } catch {
    // ohne Sitzungsspeicher kein Merker: dann lieber einmal laden als nie
  }
  return true
}

/** Lädt neu, nachdem der Arbeitsstand geschrieben ist (auch für den Knopf im Band). */
export async function jetztNeuLaden(): Promise<void> {
  await sichereArbeitsstandJetzt()
  location.reload()
}

export async function vielleichtNeuLaden(anlass: Anlass): Promise<void> {
  const neu = fassung.neu
  if (neu === null || anlass === 'takt' || !ruhig()) return
  if (anlass === 'start' && performance.now() > START_FENSTER_MS) return
  if (erlaubt(neu)) await jetztNeuLaden()
}

/** Wo der Nutzer gerade ist: aktiver Tab, dessen Ansicht und ein offenes Werkzeug. */
function ort(): string {
  const aktiv = tabs.liste.find((tab) => tab.id === tabs.aktiveTabId)
  return `${tabs.aktiveTabId ?? ''}|${aktiv?.aktiveAnsicht ?? ''}|${werkzeug.aktiv ?? ''}`
}

function sichtbar(): void {
  if (document.visibilityState !== 'visible') return
  void pruefeBackend().then(() => vielleichtNeuLaden('sichtbar'))
}

/** Einmal beim Start der Oberfläche (nach starteBackendUeberwachung); gibt das Aufräumen zurück. */
export function fassungVerfolgen(): () => void {
  const beenden = $effect.root(() => {
    // Jede Antwort des Backends vergleichen; ohne Verbindung (null) bleibt der Stand.
    $effect(() => {
      const server = backendStatus.version
      if (server === null) return
      fassung.neu = server !== OBERFLAECHE_FASSUNG ? server : null
      untrack(() => void vielleichtNeuLaden(performance.now() < START_FENSTER_MS ? 'start' : 'takt'))
    })
    // Ortswechsel: erst prüfen, wenn der neue Ort steht.
    let letzterOrt = untrack(ort)
    $effect(() => {
      const jetzt = ort()
      if (jetzt === letzterOrt) return
      letzterOrt = jetzt
      void tick().then(() => vielleichtNeuLaden('ortswechsel'))
    })
  })
  document.addEventListener('visibilitychange', sichtbar)
  return () => {
    beenden()
    document.removeEventListener('visibilitychange', sichtbar)
  }
}
