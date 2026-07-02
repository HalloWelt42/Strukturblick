// Dokument-Bibliothek in IndexedDB: dauerhaft gespeicherte Dokumente mit
// Inhalt, Format und Zeitstempeln.

import type { FormatId } from '../api/typen'
import { holeDb } from './datenbank'

export interface SpeicherDokument {
  id: string
  titel: string
  format: FormatId | null
  inhalt: string
  /** Größe des Inhalts in Bytes. */
  groesse: number
  angelegtAm: number
  geaendertAm: number
}

/** Eingabe für ein neues Dokument - id und Zeitstempel vergibt der Speicher. */
export type NeuesDokument = Omit<SpeicherDokument, 'id' | 'angelegtAm' | 'geaendertAm'>

function bytesVon(text: string): number {
  return new TextEncoder().encode(text).length
}

/** Alle Dokumente, zuletzt geänderte zuerst. */
export async function alleDokumente(): Promise<SpeicherDokument[]> {
  const db = await holeDb()
  const aufsteigend = await db.getAllFromIndex('dokumente', 'geaendertAm')
  return aufsteigend.reverse()
}

export async function holeDokument(id: string): Promise<SpeicherDokument | null> {
  const db = await holeDb()
  return (await db.get('dokumente', id)) ?? null
}

/** Legt ein neues Dokument mit frischer UUID und Zeitstempeln an. */
export async function speichereDokument(eingabe: NeuesDokument): Promise<SpeicherDokument> {
  const jetzt = Date.now()
  const dokument: SpeicherDokument = {
    ...eingabe,
    id: crypto.randomUUID(),
    angelegtAm: jetzt,
    geaendertAm: jetzt,
  }
  const db = await holeDb()
  await db.put('dokumente', dokument)
  return dokument
}

/** Aktualisiert Inhalt und/oder Titel; geaendertAm und groesse werden nachgeführt. */
export async function aktualisiereDokument(
  id: string,
  aenderung: { inhalt?: string; titel?: string },
): Promise<SpeicherDokument | null> {
  const db = await holeDb()
  const bestand = await db.get('dokumente', id)
  if (bestand === undefined) return null
  const dokument: SpeicherDokument = { ...bestand, geaendertAm: Date.now() }
  if (aenderung.titel !== undefined) {
    dokument.titel = aenderung.titel
  }
  if (aenderung.inhalt !== undefined) {
    dokument.inhalt = aenderung.inhalt
    dokument.groesse = bytesVon(aenderung.inhalt)
  }
  await db.put('dokumente', dokument)
  return dokument
}

export async function loescheDokument(id: string): Promise<void> {
  const db = await holeDb()
  await db.delete('dokumente', id)
}
