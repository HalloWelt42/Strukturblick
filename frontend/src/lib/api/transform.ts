// Transformations-Endpunkte: konvertieren, struktureller Diff, JSON reparieren.
// Feldnamen exakt wie im Backend (backend/app/modelle/transform.py).

import { requestJson } from './http'
import type {
  DiffAnfrage,
  DiffAntwort,
  KonvertierAnfrage,
  KonvertierAntwort,
  ReparaturAnfrage,
  ReparaturAntwort,
} from './typen'

export function konvertiere(anfrage: KonvertierAnfrage): Promise<KonvertierAntwort> {
  return requestJson<KonvertierAntwort>('/api/transform/konvertieren', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}

export function berechneDiff(anfrage: DiffAnfrage): Promise<DiffAntwort> {
  return requestJson<DiffAntwort>('/api/transform/diff', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}

export function repariere(anfrage: ReparaturAnfrage): Promise<ReparaturAntwort> {
  return requestJson<ReparaturAntwort>('/api/transform/reparatur', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}
