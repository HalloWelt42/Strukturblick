// Verlauf der Abfragekonsole: jede ausgeführte Abfrage wird als Eintrag
// gesichert, damit sie sich später wieder einsetzen lässt. Der Verlauf ist
// auf die neuesten Einträge gekappt - älteste werden beim Anhängen entfernt.

import type { AbfrageSprache } from '../api/typen'
import { holeDb } from './datenbank'

export interface HistorieEintrag {
  id: string
  ausdruck: string
  sprache: AbfrageSprache
  dokumentId: string | null
  trefferAnzahl: number
  zeitpunkt: number
}

/** Höchstzahl gespeicherter Verlaufseinträge; darüber entfernen wir die ältesten. */
const MAX_EINTRAEGE = 200

/** Hängt einen Verlaufseintrag an und kappt den Verlauf auf MAX_EINTRAEGE. */
export async function haengeAn(eintrag: Omit<HistorieEintrag, 'id' | 'zeitpunkt'>): Promise<void> {
  const db = await holeDb()
  const voll: HistorieEintrag = {
    ...eintrag,
    id: crypto.randomUUID(),
    zeitpunkt: Date.now(),
  }
  const transaktion = db.transaction('abfrageHistorie', 'readwrite')
  const store = transaktion.objectStore('abfrageHistorie')
  await store.put(voll)
  // Älteste zuerst durchlaufen und entfernen, bis die Grenze eingehalten ist.
  let ueberzahl = (await store.count()) - MAX_EINTRAEGE
  if (ueberzahl > 0) {
    let zeiger = await store.index('zeitpunkt').openCursor(null, 'next')
    while (zeiger !== null && ueberzahl > 0) {
      await zeiger.delete()
      ueberzahl -= 1
      zeiger = await zeiger.continue()
    }
  }
  await transaktion.done
}

/** Liest den Verlauf, neueste zuerst. */
export async function lies(): Promise<HistorieEintrag[]> {
  const db = await holeDb()
  const eintraege = await db.getAllFromIndex('abfrageHistorie', 'zeitpunkt')
  return eintraege.reverse()
}

/** Leert den gesamten Verlauf. */
export async function leere(): Promise<void> {
  const db = await holeDb()
  await db.clear('abfrageHistorie')
}
