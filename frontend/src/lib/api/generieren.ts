// Generierungs-Endpunkte: Code aus einem Dokument erzeugen, Beispieldaten aus
// einem Schema erzeugen. Feldnamen exakt wie im Backend
// (backend/app/modelle/generieren.py).

import { requestJson } from './http'
import type {
  BeispieldatenAnfrage,
  BeispieldatenAntwort,
  CodegenAnfrage,
  CodegenAntwort,
  DokumentReferenz,
  Spezifikation,
  TestdatenGeneratorAnfrage,
  TestdatenGeneratorAntwort,
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

/** Leitet aus einem Dokument heuristisch eine Generator-Spezifikation ab. */
export function leiteSpezifikationAb(dokument: DokumentReferenz): Promise<Spezifikation> {
  return requestJson<Spezifikation>('/api/generieren/testdaten/spezifikation', {
    method: 'POST',
    body: JSON.stringify({ dokument }),
  })
}

/** Erzeugt aus einer Spezifikation deterministisch einen Block von Datensätzen. */
export function erzeugeTestdaten(
  anfrage: TestdatenGeneratorAnfrage,
): Promise<TestdatenGeneratorAntwort> {
  return requestJson<TestdatenGeneratorAntwort>('/api/generieren/testdaten', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}
