// Analyse-Endpunkte: Schema-Inferenz, Validierung, Statistik, Mustererkennung.

import { requestJson } from './http'
import type {
  MusterAnfrage,
  MusterAntwort,
  ProfilAnfrage,
  ProfilAntwort,
  SchemaAnfrage,
  SchemaAntwort,
  StatistikAnfrage,
  StatistikAntwort,
  TypModellAnfrage,
  TypModellAntwort,
  ValidierungsAnfrage,
  ValidierungsAntwort,
} from './typen'

export function schemaAbleiten(anfrage: SchemaAnfrage): Promise<SchemaAntwort> {
  return requestJson<SchemaAntwort>('/api/analyse/schema', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}

export function validieren(anfrage: ValidierungsAnfrage): Promise<ValidierungsAntwort> {
  return requestJson<ValidierungsAntwort>('/api/analyse/validieren', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}

export function statistikBerechnen(anfrage: StatistikAnfrage): Promise<StatistikAntwort> {
  return requestJson<StatistikAntwort>('/api/analyse/statistik', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}

export function musterErkennen(anfrage: MusterAnfrage): Promise<MusterAntwort> {
  return requestJson<MusterAntwort>('/api/analyse/muster', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}

export function profilLaden(anfrage: ProfilAnfrage): Promise<ProfilAntwort> {
  return requestJson<ProfilAntwort>('/api/analyse/profil', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}

export function typmodellLaden(anfrage: TypModellAnfrage): Promise<TypModellAntwort> {
  return requestJson<TypModellAntwort>('/api/analyse/typmodell', {
    method: 'POST',
    body: JSON.stringify(anfrage),
  })
}
