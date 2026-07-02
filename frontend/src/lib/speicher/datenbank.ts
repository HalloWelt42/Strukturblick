// Zentrale IndexedDB-Anbindung über idb. Alle Speicher-Module holen ihre
// Datenbank-Instanz ausschließlich über holeDb() - die Verbindung wird lazy
// und genau einmal geöffnet.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type { Arbeitsstand } from './arbeitsstand'
import type { SpeicherDokument } from './dokumente'
import type { EinstellungsEintrag } from './einstellungenSpeicher'

interface StrukturblickSchema extends DBSchema {
  dokumente: {
    key: string
    value: SpeicherDokument
    indexes: { geaendertAm: number }
  }
  arbeitsstand: {
    key: string
    value: Arbeitsstand
  }
  einstellungen: {
    key: string
    value: EinstellungsEintrag
  }
}

export type StrukturblickDb = IDBPDatabase<StrukturblickSchema>

const DB_NAME = 'strukturblick'
const DB_VERSION = 1

let dbVersprechen: Promise<StrukturblickDb> | null = null

/** Öffnet die Datenbank genau einmal (lazy) und liefert danach immer dieselbe Instanz. */
export function holeDb(): Promise<StrukturblickDb> {
  dbVersprechen ??= openDB<StrukturblickSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      const dokumente = db.createObjectStore('dokumente', { keyPath: 'id' })
      dokumente.createIndex('geaendertAm', 'geaendertAm')
      db.createObjectStore('arbeitsstand', { keyPath: 'id' })
      db.createObjectStore('einstellungen', { keyPath: 'schluessel' })
    },
  })
  return dbVersprechen
}
