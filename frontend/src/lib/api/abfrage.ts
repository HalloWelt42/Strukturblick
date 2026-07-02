// Abfrage-Endpunkt: sucht Knoten in einem Dokument (JSONPath, XPath, Volltext, Regex).

import { requestJson } from './http'
import type { AbfrageAnfrage, AbfrageAntwort } from './typen'

export function fuehreAbfrage(anfrage: AbfrageAnfrage): Promise<AbfrageAntwort> {
  return requestJson<AbfrageAntwort>('/api/abfrage', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}
