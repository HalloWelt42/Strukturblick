// KI-Endpunkte: Status prüfen und die fünf KI-Funktionen aufrufen. Feldnamen
// exakt wie im Backend (backend/app/modelle/ki.py). Jede POST-Anfrage trägt den
// KiKontext (basis_url, modell, temperatur) mit.

import { requestJson } from './http'
import type {
  AbfrageVorschlag,
  AbfrageVorschlagAnfrage,
  Erklaerung,
  ErklaerenAnfrage,
  KiStatus,
  SchemaAusText,
  SchemaAusTextAnfrage,
  Spezifikation,
  Testdaten,
  TestdatenAnfrage,
  TestdatenSpezifikationAnfrage,
  TextAusSchema,
  TextAusSchemaAnfrage,
} from './typen'

/**
 * Prüft, ob unter basisUrl ein lokales Sprachmodell erreichbar ist. Der
 * Endpunkt wirft nie, sondern liefert erreichbar=false samt Fehlertext.
 */
export function getKiStatus(basisUrl: string, modell?: string | null): Promise<KiStatus> {
  const parameter = new URLSearchParams({ basis_url: basisUrl })
  if (modell !== undefined && modell !== null && modell !== '') {
    parameter.set('modell', modell)
  }
  return requestJson<KiStatus>(`/api/ki/status?${parameter.toString()}`)
}

export function schlageAbfrageVor(anfrage: AbfrageVorschlagAnfrage): Promise<AbfrageVorschlag> {
  return requestJson<AbfrageVorschlag>('/api/ki/abfrage-vorschlag', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}

export function erklaereDokument(anfrage: ErklaerenAnfrage): Promise<Erklaerung> {
  return requestJson<Erklaerung>('/api/ki/erklaeren', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}

export function schemaAusText(anfrage: SchemaAusTextAnfrage): Promise<SchemaAusText> {
  return requestJson<SchemaAusText>('/api/ki/schema-aus-text', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}

export function textAusSchema(anfrage: TextAusSchemaAnfrage): Promise<TextAusSchema> {
  return requestJson<TextAusSchema>('/api/ki/text-aus-schema', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}

export function erzeugeTestdaten(anfrage: TestdatenAnfrage): Promise<Testdaten> {
  return requestJson<Testdaten>('/api/ki/testdaten', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}

/** Lässt die KI für ein Dokument eine Generator-Spezifikation vorschlagen. */
export function schlageTestdatenSpezifikationVor(
  anfrage: TestdatenSpezifikationAnfrage,
): Promise<Spezifikation> {
  return requestJson<Spezifikation>('/api/ki/testdaten-spezifikation', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}
