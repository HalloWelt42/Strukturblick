// Generierungs-Endpunkte: Code aus einem Dokument erzeugen, Beispieldaten aus
// einem Schema erzeugen. Feldnamen exakt wie im Backend
// (backend/app/modelle/generieren.py).

import { requestJson } from './http'
import type {
  BeispieldatenAnfrage,
  BeispieldatenAntwort,
  CodegenAnfrage,
  CodegenAntwort,
} from './typen'

export function erzeugeCode(anfrage: CodegenAnfrage): Promise<CodegenAntwort> {
  return requestJson<CodegenAntwort>('/api/transform/codegen', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}

export function erzeugeBeispieldaten(
  anfrage: BeispieldatenAnfrage,
): Promise<BeispieldatenAntwort> {
  return requestJson<BeispieldatenAntwort>('/api/generieren/beispieldaten', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}
