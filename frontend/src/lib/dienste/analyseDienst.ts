// Analyse-Dienst: schickt Tab-Inhalte an das Backend und pflegt das Ergebnis
// in den Tab-Zustand ein. Debounced je Tab, damit beim Tippen nicht jede
// Taste eine Anfrage auslöst; eine Laufnummer je Tab verwirft veraltete
// Antworten, wenn inzwischen eine neuere Analyse gestartet wurde.

import { dokumentParsen } from '../api/dokumente'
import { ApiError } from '../api/http'
import type { FehlerDetail } from '../api/typen'
import { planeArbeitsstandSicherung, tabs, type DokumentTab } from '../zustand/tabs.svelte'

const ANALYSE_VERZOEGERUNG_MS = 400

const timerJeTab = new Map<string, ReturnType<typeof setTimeout>>()
const laufJeTab = new Map<string, number>()

function holeTab(tabId: string): DokumentTab | null {
  return tabs.liste.find((tab) => tab.id === tabId) ?? null
}

/** Formt einen beliebigen Fehler in das FehlerDetail-Modell für die Diagnose-Anzeige. */
function alsFehlerDetail(grund: unknown): FehlerDetail {
  if (grund instanceof ApiError && grund.detail !== null) {
    return grund.detail
  }
  if (grund instanceof ApiError) {
    return {
      code: grund.code,
      meldung: grund.meldung,
      pfad: null,
      position: null,
      details: {},
      request_id: '',
    }
  }
  return {
    code: 'netzwerk',
    meldung: grund instanceof Error ? grund.message : String(grund),
    pfad: null,
    position: null,
    details: {},
    request_id: '',
  }
}

async function fuehreAnalyseDurch(tabId: string): Promise<void> {
  const tab = holeTab(tabId)
  if (tab === null) return
  const lauf = (laufJeTab.get(tabId) ?? 0) + 1
  laufJeTab.set(tabId, lauf)
  tab.analyseStand = 'laeuft'
  try {
    // format_id bewusst nicht mitsenden - die Backend-Erkennung entscheidet.
    // Der Dateiname dient ihr nur als Hinweis.
    const antwort = await dokumentParsen({ inhalt_text: tab.inhalt, dateiname: tab.titel })
    if (laufJeTab.get(tabId) !== lauf) return
    const aktuell = holeTab(tabId)
    if (aktuell === null) return
    aktuell.analyse = antwort
    aktuell.format = antwort.format_id
    aktuell.analyseStand = 'frisch'
    aktuell.analyseFehler = null
    // Das übernommene Format ist Teil des Arbeitsstands.
    planeArbeitsstandSicherung()
  } catch (grund: unknown) {
    if (laufJeTab.get(tabId) !== lauf) return
    const aktuell = holeTab(tabId)
    if (aktuell === null) return
    aktuell.analyseStand = 'fehler'
    aktuell.analyseFehler = alsFehlerDetail(grund)
  }
}

/** Analysiert den Tab debounced (400 ms) - für Aufrufe während des Tippens. */
export function analysiere(tabId: string): void {
  const timer = timerJeTab.get(tabId)
  if (timer !== undefined) clearTimeout(timer)
  timerJeTab.set(
    tabId,
    setTimeout(() => {
      timerJeTab.delete(tabId)
      void fuehreAnalyseDurch(tabId)
    }, ANALYSE_VERZOEGERUNG_MS),
  )
}

/** Analysiert sofort ohne Debounce - für den ersten Aufruf nach dem Öffnen. */
export function sofortAnalysieren(tabId: string): Promise<void> {
  const timer = timerJeTab.get(tabId)
  if (timer !== undefined) {
    clearTimeout(timer)
    timerJeTab.delete(tabId)
  }
  return fuehreAnalyseDurch(tabId)
}
