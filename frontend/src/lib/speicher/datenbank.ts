// Zentrale IndexedDB-Anbindung über idb. Alle Speicher-Module holen ihre
// Datenbank-Instanz ausschließlich über holeDb() - die Verbindung wird lazy
// und genau einmal geöffnet.

import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

import type { HistorieEintrag } from './abfrageHistorie'
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
  abfrageHistorie: {
    key: string
    value: HistorieEintrag
    indexes: { zeitpunkt: number }
  }
}

export type StrukturblickDb = IDBPDatabase<StrukturblickSchema>

const DB_NAME = 'strukturblick'
const DB_VERSION = 2

let dbVersprechen: Promise<StrukturblickDb> | null = null

/** Öffnet die Datenbank genau einmal (lazy) und liefert danach immer dieselbe Instanz. */
export function holeDb(): Promise<StrukturblickDb> {
  dbVersprechen ??= openDB<StrukturblickSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, alteVersion) {
      // Version 1: die Grundstores. Bei einer frischen Datenbank ist
      // alteVersion 0, beim Aufstieg von v1 auf v2 ist sie 1.
      if (alteVersion < 1) {
        const dokumente = db.createObjectStore('dokumente', { keyPath: 'id' })
        dokumente.createIndex('geaendertAm', 'geaendertAm')
        db.createObjectStore('arbeitsstand', { keyPath: 'id' })
        db.createObjectStore('einstellungen', { keyPath: 'schluessel' })
      }
      // Version 2: Verlauf der Abfragekonsole.
      if (alteVersion < 2) {
        const historie = db.createObjectStore('abfrageHistorie', { keyPath: 'id' })
        historie.createIndex('zeitpunkt', 'zeitpunkt')
      }
    },
  })
  return dbVersprechen
}
