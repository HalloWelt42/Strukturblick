// Dokument-Endpunkte: Erkennen, Parsen, Cache-Status.

import { requestJson } from './http'
import type {
  CacheStatusAntwort,
  DokumentReferenz,
  ErkennungsAntwort,
  ParseAntwort,
} from './typen'

export function dokumentParsen(referenz: DokumentReferenz): Promise<ParseAntwort> {
  return requestJson<ParseAntwort>('/api/dokumente/parsen', {
    method: 'POST',
    body: JSON.stringify(referenz),
  })
}

export function dokumentErkennen(referenz: DokumentReferenz): Promise<ErkennungsAntwort> {
  return requestJson<ErkennungsAntwort>('/api/dokumente/erkennen', {
    method: 'POST',
    body: JSON.stringify(referenz),
  })
}

export function dokumentStatus(hash: string): Promise<CacheStatusAntwort> {
  return requestJson<CacheStatusAntwort>(`/api/dokumente/${hash}/status`)
}
