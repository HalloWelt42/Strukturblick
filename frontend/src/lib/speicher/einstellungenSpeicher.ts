// Nutzer-Einstellungen als Schlüssel-Wert-Paare in IndexedDB.

import { holeDb } from './datenbank'

export interface EinstellungsEintrag {
  schluessel: string
  wert: unknown
}

/** Liest eine Einstellung; fehlt sie, kommt der übergebene Standard zurück. */
export async function holeEinstellung<T>(schluessel: string, standard: T): Promise<T> {
  const db = await holeDb()
  const eintrag = await db.get('einstellungen', schluessel)
  if (eintrag === undefined) return standard
  return eintrag.wert as T
}

export async function setzeEinstellung(schluessel: string, wert: unknown): Promise<void> {
  const db = await holeDb()
  await db.put('einstellungen', { schluessel, wert })
}

// Grenzen für Dateigrößen beim Öffnen: ab warnungAbBytes wird gewarnt,
// ab ablehnungAbBytes wird das Dokument gar nicht erst geladen.

export const SCHLUESSEL_WARNUNG_AB_BYTES = 'warnungAbBytes'
export const SCHLUESSEL_ABLEHNUNG_AB_BYTES = 'ablehnungAbBytes'

const STANDARD_WARNUNG_AB_BYTES = 10 * 1024 * 1024 // 10 MiB
const STANDARD_ABLEHNUNG_AB_BYTES = 50 * 1024 * 1024 // 50 MiB

export function warnungAbBytes(): Promise<number> {
  return holeEinstellung(SCHLUESSEL_WARNUNG_AB_BYTES, STANDARD_WARNUNG_AB_BYTES)
}

export function ablehnungAbBytes(): Promise<number> {
  return holeEinstellung(SCHLUESSEL_ABLEHNUNG_AB_BYTES, STANDARD_ABLEHNUNG_AB_BYTES)
}
