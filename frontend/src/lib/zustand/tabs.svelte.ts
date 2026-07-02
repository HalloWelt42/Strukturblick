// Offene Dokument-Tabs als reaktiver Modul-Zustand. Jede Änderung wird
// debounced (400 ms) als Arbeitsstand in IndexedDB gesichert - die
// Analyse-Felder bleiben dabei außen vor, sie sind jederzeit neu berechenbar.

import type { FehlerDetail, FormatId, ParseAntwort } from '../api/typen'
import {
  ladeArbeitsstand,
  speichereArbeitsstand,
  type TabPersist,
} from '../speicher/arbeitsstand'

export type AnalyseStand = 'frisch' | 'laeuft' | 'veraltet' | 'fehler'

export interface DokumentTab {
  id: string
  titel: string
  format: FormatId | null
  inhalt: string
  geaendert: boolean
  dokumentId: string | null
  analyse: ParseAntwort | null
  analyseStand: AnalyseStand
  analyseFehler: FehlerDetail | null
  aktiveAnsicht: string
}

export const tabs = $state<{
  liste: DokumentTab[]
  aktiveTabId: string | null
}>({
  liste: [],
  aktiveTabId: null,
})

const PERSISTENZ_VERZOEGERUNG_MS = 400

let persistenzTimer: ReturnType<typeof setTimeout> | null = null

/** Persistierbarer Anteil eines Tabs als reines Objekt (kein $state-Proxy). */
function alsPersist(tab: DokumentTab): TabPersist {
  return {
    id: tab.id,
    titel: tab.titel,
    format: tab.format,
    inhalt: tab.inhalt,
    dokumentId: tab.dokumentId,
    aktiveAnsicht: tab.aktiveAnsicht,
    geaendert: tab.geaendert,
  }
}

/** Plant die Sicherung des Arbeitsstands (debounced, 400 ms). */
export function planeArbeitsstandSicherung(): void {
  if (persistenzTimer !== null) clearTimeout(persistenzTimer)
  persistenzTimer = setTimeout(() => {
    persistenzTimer = null
    speichereArbeitsstand(tabs.liste.map(alsPersist), tabs.aktiveTabId).catch(
      (grund: unknown) => {
        console.error('Arbeitsstand konnte nicht gesichert werden:', grund)
      },
    )
  }, PERSISTENZ_VERZOEGERUNG_MS)
}

function holeTab(id: string): DokumentTab | null {
  return tabs.liste.find((tab) => tab.id === id) ?? null
}

/** Öffnet einen neuen Tab, macht ihn aktiv und gibt seine id zurück. */
export function oeffneTab(eingabe: {
  titel: string
  inhalt: string
  format?: FormatId | null
  dokumentId?: string | null
}): string {
  const id = crypto.randomUUID()
  tabs.liste.push({
    id,
    titel: eingabe.titel,
    format: eingabe.format ?? null,
    inhalt: eingabe.inhalt,
    geaendert: false,
    dokumentId: eingabe.dokumentId ?? null,
    analyse: null,
    analyseStand: 'veraltet',
    analyseFehler: null,
    aktiveAnsicht: 'baum',
  })
  tabs.aktiveTabId = id
  planeArbeitsstandSicherung()
  return id
}

/** Schließt den Tab; war er aktiv, wird der rechte, sonst der linke Nachbar aktiv. */
export function schliesseTab(id: string): void {
  const index = tabs.liste.findIndex((tab) => tab.id === id)
  if (index === -1) return
  tabs.liste.splice(index, 1)
  if (tabs.aktiveTabId === id) {
    const nachbar: DokumentTab | undefined = tabs.liste[index] ?? tabs.liste[index - 1]
    tabs.aktiveTabId = nachbar !== undefined ? nachbar.id : null
  }
  planeArbeitsstandSicherung()
}

export function setzeAktiv(id: string): void {
  if (holeTab(id) === null) return
  tabs.aktiveTabId = id
  planeArbeitsstandSicherung()
}

/** Übernimmt neuen Inhalt; markiert den Tab als geändert und die Analyse als veraltet. */
export function setzeInhalt(id: string, text: string): void {
  const tab = holeTab(id)
  if (tab === null) return
  tab.inhalt = text
  tab.geaendert = true
  tab.analyseStand = 'veraltet'
  planeArbeitsstandSicherung()
}

export function setzeAnsicht(id: string, ansichtId: string): void {
  const tab = holeTab(id)
  if (tab === null) return
  tab.aktiveAnsicht = ansichtId
  planeArbeitsstandSicherung()
}

export function aktiverTab(): DokumentTab | null {
  if (tabs.aktiveTabId === null) return null
  return holeTab(tabs.aktiveTabId)
}

/** Nach dem Speichern in die Bibliothek: Tab mit Dokument verknüpfen. */
export function markiereGespeichert(id: string, dokumentId: string, titel?: string): void {
  const tab = holeTab(id)
  if (tab === null) return
  tab.geaendert = false
  tab.dokumentId = dokumentId
  if (titel !== undefined) tab.titel = titel
  planeArbeitsstandSicherung()
}

/** Stellt beim App-Start den zuletzt gesicherten Arbeitsstand wieder her. */
export async function stelleWieder(): Promise<void> {
  const stand = await ladeArbeitsstand()
  if (stand === null) return
  tabs.liste = stand.tabs.map(
    (tab): DokumentTab => ({
      id: tab.id,
      titel: tab.titel,
      format: tab.format,
      inhalt: tab.inhalt,
      geaendert: tab.geaendert,
      dokumentId: tab.dokumentId,
      analyse: null,
      analyseStand: 'veraltet',
      analyseFehler: null,
      aktiveAnsicht: tab.aktiveAnsicht,
    }),
  )
  const aktivGueltig = stand.aktiveTabId !== null && holeTab(stand.aktiveTabId) !== null
  tabs.aktiveTabId = aktivGueltig ? stand.aktiveTabId : (tabs.liste[0]?.id ?? null)
}
