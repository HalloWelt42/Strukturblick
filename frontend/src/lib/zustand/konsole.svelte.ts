// Zustand der Abfragekonsole: offen/zu, gewählte Sprache und Ausdruck sowie
// das jüngste Ergebnis. Das Ergebnis ist an den Tab gebunden, gegen den die
// Abfrage lief (tabId) - beim Tab-Wechsel blendet die Komponente es aus.
//
// Der Aufruf referenziert das Dokument zuerst per Hash und wiederholt bei 410
// (dokument_nicht_im_cache) EINMAL mit dem vollen Inhalt - dasselbe Muster wie
// bei den Zusatz-Analysen. Fachliche Fehler des Backends (Syntaxfehler,
// unmögliche Konvertierung) landen als Klartext in fehler.

import { fuehreAbfrage } from '../api/abfrage'
import { ApiError } from '../api/http'
import type { AbfrageAntwort, AbfrageSprache, DokumentReferenz } from '../api/typen'
import { haengeAn } from '../speicher/abfrageHistorie'
import type { DokumentTab } from './tabs.svelte'

export const konsole = $state<{
  offen: boolean
  sprache: AbfrageSprache
  ausdruck: string
  nurSchluessel: boolean
  laeuft: boolean
  ergebnis: AbfrageAntwort | null
  fehler: string | null
  /** Tab, zu dem das aktuelle Ergebnis gehört. */
  tabId: string | null
}>({
  offen: false,
  sprache: 'jsonpath',
  ausdruck: '',
  nurSchluessel: false,
  laeuft: false,
  ergebnis: null,
  fehler: null,
  tabId: null,
})

export function umschalten(): void {
  konsole.offen = !konsole.offen
}

export function oeffne(): void {
  konsole.offen = true
}

/** Die Abfragesprachen, die die Konsole tatsächlich ausführen kann. */
const KONSOLE_SPRACHEN: readonly AbfrageSprache[] = ['jsonpath', 'xpath', 'volltext', 'regex']

function alsAbfrageSprache(sprache: string): AbfrageSprache {
  const klein = sprache.trim().toLowerCase()
  return (KONSOLE_SPRACHEN as readonly string[]).includes(klein)
    ? (klein as AbfrageSprache)
    : 'jsonpath'
}

/**
 * Übernimmt einen KI-Abfrage-Vorschlag: setzt Sprache und Ausdruck und klappt
 * die Konsole auf. Kennt die Konsole die Sprache nicht (z. B. "spaltenfilter"),
 * fällt sie auf JSONPath zurück. Das Ergebnis wird verworfen, damit der Nutzer
 * die Abfrage selbst startet (nie Auto-Apply).
 */
export function setzeAbfrage(sprache: string, ausdruck: string): void {
  konsole.sprache = alsAbfrageSprache(sprache)
  konsole.ausdruck = ausdruck
  konsole.ergebnis = null
  konsole.fehler = null
  konsole.tabId = null
  konsole.offen = true
}

/** Ruft die Abfrage mit dem Hash auf; bei 410 einmal mit vollem Inhalt. */
async function mitCacheWiederholung(
  tab: DokumentTab,
  rufe: (dokument: DokumentReferenz) => Promise<AbfrageAntwort>,
): Promise<AbfrageAntwort> {
  const hash = tab.analyse?.dokument_hash
  if (hash === undefined) {
    return rufe({ inhalt_text: tab.inhalt, dateiname: tab.titel })
  }
  try {
    return await rufe({ dokument_hash: hash })
  } catch (grund: unknown) {
    if (grund instanceof ApiError && grund.code === 'dokument_nicht_im_cache') {
      return rufe({ inhalt_text: tab.inhalt, dateiname: tab.titel })
    }
    throw grund
  }
}

/** Fachliche Fehler kommen als Klartext in die Anzeige, alles andere als Meldung. */
function fehlerText(grund: unknown): string {
  if (grund instanceof ApiError) return grund.meldung
  return grund instanceof Error ? grund.message : String(grund)
}

/** Führt die Abfrage gegen den Tab aus und pflegt Ergebnis und Verlauf ein. */
export async function fuehreAus(tab: DokumentTab): Promise<void> {
  const ausdruck = konsole.ausdruck.trim()
  if (ausdruck === '' || konsole.laeuft) return
  konsole.laeuft = true
  konsole.fehler = null
  konsole.tabId = tab.id
  const sprache = konsole.sprache
  const nurSchluessel = sprache === 'volltext' || sprache === 'regex' ? konsole.nurSchluessel : false
  try {
    const antwort = await mitCacheWiederholung(tab, (dokument) =>
      fuehreAbfrage({ dokument, sprache, ausdruck, nur_schluessel: nurSchluessel }),
    )
    konsole.ergebnis = antwort
    konsole.fehler = null
    void haengeAn({
      ausdruck,
      sprache,
      dokumentId: tab.dokumentId,
      trefferAnzahl: antwort.anzahl,
    }).catch((grund: unknown) => {
      console.error('Abfrage-Verlauf konnte nicht gesichert werden:', grund)
    })
  } catch (grund: unknown) {
    konsole.ergebnis = null
    konsole.fehler = fehlerText(grund)
  } finally {
    konsole.laeuft = false
  }
}

/** Setzt Ergebnis, Fehler und Ausdruck zurück (nicht den offen-Zustand). */
export function leere(): void {
  konsole.ausdruck = ''
  konsole.ergebnis = null
  konsole.fehler = null
  konsole.tabId = null
}
