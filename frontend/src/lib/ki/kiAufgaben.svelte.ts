// Verwaltet die aktuell laufende KI-Aufgabe der rechten Leiste. Immer nur eine
// zur Zeit: art benennt die Funktion, laeuft/fehler den Verlauf, ergebnis das
// (validierte) Resultat. Jede Aktion ruft den passenden Endpunkt mit dem
// aktiven Tab als Dokument-Referenz (ausser schema_aus_text, das braucht keinen
// Tab) und dem KiKontext auf. Es gilt strikt: Ergebnis erscheint als VORSCHAU,
// nie automatisch angewendet - das Anwenden geschieht erst in KiVorschau.

import {
  erklaereDokument,
  erzeugeTestdaten,
  schemaAusText,
  schlageAbfrageVor,
  textAusSchema,
} from '../api/ki'
import { ApiError } from '../api/http'
import type {
  AbfrageVorschlag,
  Erklaerung,
  SchemaAusText,
  Testdaten,
  TextAusSchema,
} from '../api/typen'
import { mitRetry } from '../dienste/dokumentReferenz'
import { aktiverTab } from '../zustand/tabs.svelte'
import { kontext } from '../zustand/kiEinstellungen.svelte'

export type KiAufgabenArt =
  | 'erklaeren'
  | 'abfrage'
  | 'schema_text'
  | 'text_schema'
  | 'testdaten'

/** Das Ergebnis je Aufgabenart als unterscheidbare Variante für die Vorschau. */
export type KiErgebnis =
  | { art: 'erklaeren'; daten: Erklaerung }
  | { art: 'abfrage'; daten: AbfrageVorschlag }
  | { art: 'schema_text'; daten: SchemaAusText }
  | { art: 'text_schema'; daten: TextAusSchema }
  | { art: 'testdaten'; daten: Testdaten }

export const kiAufgabe = $state<{
  art: KiAufgabenArt | null
  laeuft: boolean
  fehler: string | null
  ergebnis: KiErgebnis | null
}>({
  art: null,
  laeuft: false,
  fehler: null,
  ergebnis: null,
})

/** Fachliche Fehler des Backends als Klartext, alles andere als Meldung. */
function fehlerText(grund: unknown): string {
  if (grund instanceof ApiError) return grund.meldung
  return grund instanceof Error ? grund.message : String(grund)
}

/** Setzt die Aufgabe zurück (schliesst die Vorschau). */
export function verwerfeAufgabe(): void {
  kiAufgabe.art = null
  kiAufgabe.laeuft = false
  kiAufgabe.fehler = null
  kiAufgabe.ergebnis = null
}

/** Gemeinsamer Rahmen: Zustand setzen, Aufruf ausführen, Ergebnis/Fehler pflegen. */
async function fuehreAus(art: KiAufgabenArt, ruf: () => Promise<KiErgebnis>): Promise<void> {
  if (kiAufgabe.laeuft) return
  kiAufgabe.art = art
  kiAufgabe.laeuft = true
  kiAufgabe.fehler = null
  kiAufgabe.ergebnis = null
  try {
    kiAufgabe.ergebnis = await ruf()
  } catch (grund: unknown) {
    kiAufgabe.fehler = fehlerText(grund)
  } finally {
    kiAufgabe.laeuft = false
  }
}

/** Erklärt den Aufbau des aktiven Tab-Dokuments in Alltagssprache. */
export function starteErklaeren(): void {
  const tab = aktiverTab()
  if (tab === null) return
  void fuehreAus('erklaeren', async () => {
    const daten = await mitRetry(tab, (dokument) =>
      erklaereDokument({ ki: kontext(), dokument }),
    )
    return { art: 'erklaeren', daten }
  })
}

/** Übersetzt eine Alltagsfrage in einen Abfrage-Ausdruck (mit Probelauf). */
export function starteAbfrage(frage: string): void {
  const tab = aktiverTab()
  if (tab === null) return
  void fuehreAus('abfrage', async () => {
    const daten = await mitRetry(tab, (dokument) =>
      schlageAbfrageVor({ ki: kontext(), dokument, frage }),
    )
    return { art: 'abfrage', daten }
  })
}

/** Erzeugt aus einer Prosa-Beschreibung ein JSON Schema (kein Tab nötig). */
export function starteSchemaAusText(beschreibung: string): void {
  void fuehreAus('schema_text', async () => {
    const daten = await schemaAusText({ ki: kontext(), beschreibung })
    return { art: 'schema_text', daten }
  })
}

/** Beschreibt das aktive Tab-Dokument in Alltagssprache. */
export function starteTextAusSchema(): void {
  const tab = aktiverTab()
  if (tab === null) return
  void fuehreAus('text_schema', async () => {
    const daten = await mitRetry(tab, (dokument) =>
      textAusSchema({ ki: kontext(), dokument }),
    )
    return { art: 'text_schema', daten }
  })
}

/** Erzeugt zur Struktur des aktiven Tabs passende Beispiel-Datensätze. */
export function starteTestdaten(): void {
  const tab = aktiverTab()
  if (tab === null) return
  void fuehreAus('testdaten', async () => {
    const daten = await mitRetry(tab, (dokument) =>
      erzeugeTestdaten({ ki: kontext(), dokument }),
    )
    return { art: 'testdaten', daten }
  })
}
