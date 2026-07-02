// Arbeitsstand (Sitzung): offene Tabs samt Inhalt, damit die App nach einem
// Neustart genau dort weitermacht. Analyse-Ergebnisse werden bewusst nicht
// gesichert - sie lassen sich jederzeit neu berechnen.

import type { FormatId } from '../api/typen'
import { holeDb } from './datenbank'

/** Persistierbarer Anteil eines Tabs (ohne Analyse-Felder). */
export interface TabPersist {
  id: string
  titel: string
  format: FormatId | null
  /** Vom Nutzer festgelegtes Format (null/fehlend = automatische Erkennung). */
  formatGewaehlt?: FormatId | null
  inhalt: string
  dokumentId: string | null
  aktiveAnsicht: string
  geaendert: boolean
  /** true, wenn inhalt eine Base64-Zeichenkette eines binären Dokuments ist. */
  istBinaer?: boolean
}

export interface Arbeitsstand {
  id: 'aktuell'
  tabs: TabPersist[]
  aktiveTabId: string | null
}

const ARBEITSSTAND_ID = 'aktuell'

export async function speichereArbeitsstand(
  tabs: TabPersist[],
  aktiveTabId: string | null,
): Promise<void> {
  const db = await holeDb()
  await db.put('arbeitsstand', { id: ARBEITSSTAND_ID, tabs, aktiveTabId })
}

export async function ladeArbeitsstand(): Promise<Arbeitsstand | null> {
  const db = await holeDb()
  return (await db.get('arbeitsstand', ARBEITSSTAND_ID)) ?? null
}
