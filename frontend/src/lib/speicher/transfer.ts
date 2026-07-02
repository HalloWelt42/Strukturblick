// Arbeitsstand sichern und wiederherstellen: bündelt die gesamte lokale
// Ablage (Dokumente, offene Tabs, Einstellungen, Abfrage-Verlauf) in eine
// einzelne JSON-Datei und liest sie wieder ein. Zwei Einspiel-Modi:
// "ersetzen" wirft den bestehenden Stand weg, "zusammenfuehren" fügt nur die
// Dokumente (mit frischen UUIDs) und den Verlauf hinzu.

import type { HistorieEintrag } from './abfrageHistorie'
import type { Arbeitsstand } from './arbeitsstand'
import { holeDb } from './datenbank'
import type { SpeicherDokument } from './dokumente'
import type { EinstellungsEintrag } from './einstellungenSpeicher'

/** Kennung und Fassungsnummer, damit sich fremde oder veraltete Dateien erkennen lassen. */
const PAKET_KENNUNG = 'strukturblick-arbeitsstand'
const PAKET_FASSUNG = 1

export interface TransferPaket {
  kennung: typeof PAKET_KENNUNG
  fassung: number
  erstelltAm: number
  dokumente: SpeicherDokument[]
  arbeitsstand: Arbeitsstand | null
  einstellungen: EinstellungsEintrag[]
  abfrageHistorie: HistorieEintrag[]
}

export type EinspielModus = 'ersetzen' | 'zusammenfuehren'

/** Liest den gesamten lokalen Stand aus IndexedDB in ein Transfer-Paket. */
export async function baueTransferPaket(): Promise<TransferPaket> {
  const db = await holeDb()
  const [dokumente, arbeitsstaende, einstellungen, abfrageHistorie] = await Promise.all([
    db.getAll('dokumente'),
    db.getAll('arbeitsstand'),
    db.getAll('einstellungen'),
    db.getAll('abfrageHistorie'),
  ])
  return {
    kennung: PAKET_KENNUNG,
    fassung: PAKET_FASSUNG,
    erstelltAm: Date.now(),
    dokumente,
    arbeitsstand: arbeitsstaende[0] ?? null,
    einstellungen,
    abfrageHistorie,
  }
}

/** Serialisiert das Paket als eingerückten JSON-Text zum Herunterladen. */
export async function exportiereAlsText(): Promise<string> {
  const paket = await baueTransferPaket()
  return JSON.stringify(paket, null, 2)
}

/**
 * Prüft eine geladene Datei auf die erwartete Struktur und gibt ein typisiertes
 * Paket zurück. Wirft mit klarer Meldung, wenn die Datei nicht passt.
 */
export function lesePaket(roh: unknown): TransferPaket {
  if (typeof roh !== 'object' || roh === null) {
    throw new Error('Die Datei enthält keinen gültigen Arbeitsstand.')
  }
  const kandidat = roh as Record<string, unknown>
  if (kandidat.kennung !== PAKET_KENNUNG) {
    throw new Error('Die Datei ist kein Strukturblick-Arbeitsstand.')
  }
  if (typeof kandidat.fassung !== 'number' || kandidat.fassung > PAKET_FASSUNG) {
    throw new Error('Die Datei stammt aus einer neueren Fassung und kann nicht gelesen werden.')
  }
  if (!Array.isArray(kandidat.dokumente)) {
    throw new Error('Die Datei enthält keine Dokumentliste.')
  }
  return {
    kennung: PAKET_KENNUNG,
    fassung: kandidat.fassung,
    erstelltAm: typeof kandidat.erstelltAm === 'number' ? kandidat.erstelltAm : Date.now(),
    dokumente: kandidat.dokumente as SpeicherDokument[],
    arbeitsstand: (kandidat.arbeitsstand as Arbeitsstand | null) ?? null,
    einstellungen: Array.isArray(kandidat.einstellungen)
      ? (kandidat.einstellungen as EinstellungsEintrag[])
      : [],
    abfrageHistorie: Array.isArray(kandidat.abfrageHistorie)
      ? (kandidat.abfrageHistorie as HistorieEintrag[])
      : [],
  }
}

/**
 * Spielt ein Paket ein. "ersetzen" leert alle Speicher und schreibt den Stand
 * der Datei; "zusammenfuehren" belässt den aktuellen Stand und ergänzt nur die
 * Dokumente (mit frischen UUIDs) und die Verlaufseinträge.
 */
export async function spieleEin(paket: TransferPaket, modus: EinspielModus): Promise<void> {
  const db = await holeDb()

  if (modus === 'ersetzen') {
    const transaktion = db.transaction(
      ['dokumente', 'arbeitsstand', 'einstellungen', 'abfrageHistorie'],
      'readwrite',
    )
    await Promise.all([
      transaktion.objectStore('dokumente').clear(),
      transaktion.objectStore('arbeitsstand').clear(),
      transaktion.objectStore('einstellungen').clear(),
      transaktion.objectStore('abfrageHistorie').clear(),
    ])
    for (const dokument of paket.dokumente) {
      await transaktion.objectStore('dokumente').put(dokument)
    }
    if (paket.arbeitsstand !== null) {
      await transaktion.objectStore('arbeitsstand').put(paket.arbeitsstand)
    }
    for (const eintrag of paket.einstellungen) {
      await transaktion.objectStore('einstellungen').put(eintrag)
    }
    for (const eintrag of paket.abfrageHistorie) {
      await transaktion.objectStore('abfrageHistorie').put(eintrag)
    }
    await transaktion.done
    return
  }

  // Zusammenführen: nur Dokumente und Verlauf ergänzen, aktuellen Stand wahren.
  const transaktion = db.transaction(['dokumente', 'abfrageHistorie'], 'readwrite')
  for (const dokument of paket.dokumente) {
    await transaktion.objectStore('dokumente').put({ ...dokument, id: crypto.randomUUID() })
  }
  for (const eintrag of paket.abfrageHistorie) {
    await transaktion.objectStore('abfrageHistorie').put({ ...eintrag, id: crypto.randomUUID() })
  }
  await transaktion.done
}

export interface SpeicherSchaetzung {
  verwendetBytes: number
  kontingentBytes: number
  /** Anteil des Kontingents zwischen 0 und 1 (0, falls unbekannt). */
  anteil: number
}

/** Schätzt den Speicherverbrauch der App über die Storage-Schnittstelle des Browsers. */
export async function speicherSchaetzung(): Promise<SpeicherSchaetzung | null> {
  if (!navigator.storage?.estimate) return null
  const schaetzung = await navigator.storage.estimate()
  const verwendetBytes = schaetzung.usage ?? 0
  const kontingentBytes = schaetzung.quota ?? 0
  const anteil = kontingentBytes > 0 ? verwendetBytes / kontingentBytes : 0
  return { verwendetBytes, kontingentBytes, anteil }
}
