// Zusatz-Analysen (Statistik, Mustererkennung) als Cache je Dokument-Hash.
// Der Cache lebt getrennt von den Tabs: gleicher Inhalt = gleicher Hash =
// gleiche Ergebnisse, egal in wie vielen Tabs er offen ist. Die Einträge sind
// bewusst unveränderliche Objekte in einer SvelteMap - jede Änderung ERSETZT
// den Eintrag (set), damit die Reaktivität am Map-Schlüssel hängt und nicht
// an einem Proxy, der womöglich innerhalb einer $derived-Auswertung entsteht.
// Die Anfragen referenzieren das Dokument per Hash; antwortet das Backend mit
// 410 (dokument_nicht_im_cache), wird EINMAL transparent mit dem vollen
// Inhalt wiederholt - das Backend legt ihn dabei wieder in seinen Cache.

import { SvelteMap } from 'svelte/reactivity'

import { musterErkennen, statistikBerechnen } from '../api/analyse'
import { ApiError } from '../api/http'
import type { DokumentReferenz, MusterAntwort, StatistikAntwort } from '../api/typen'
import type { DokumentTab } from './tabs.svelte'

export interface AnalyseExtras {
  statistik?: StatistikAntwort
  muster?: MusterAntwort
  laed: boolean
  fehler: string | null
}

type ExtrasArt = 'statistik' | 'muster'

const cache = new SvelteMap<string, AnalyseExtras>()
/** Laufende Anfragen als "hash:art" - verhindert doppelte Requests. */
const laufend = new Set<string>()

/** Reaktive Sicht auf den Extras-Eintrag zum Hash (undefined vor dem Laden). */
export function extrasFuer(dokumentHash: string): AnalyseExtras | undefined {
  return cache.get(dokumentHash)
}

/** Ersetzt den Eintrag durch eine aktualisierte Kopie (Reaktivität via set). */
function aktualisiere(dokumentHash: string, aenderung: Partial<AnalyseExtras>): void {
  const alt = cache.get(dokumentHash) ?? { laed: false, fehler: null }
  cache.set(dokumentHash, { ...alt, ...aenderung })
}

function fehlerText(grund: unknown): string {
  if (grund instanceof ApiError) return grund.meldung
  return grund instanceof Error ? grund.message : String(grund)
}

/** Ruft den Endpunkt mit dem Hash auf; bei 410 einmal mit vollem Inhalt. */
async function mitCacheWiederholung<T>(
  tab: DokumentTab,
  dokumentHash: string,
  rufe: (dokument: DokumentReferenz) => Promise<T>,
): Promise<T> {
  try {
    return await rufe({ dokument_hash: dokumentHash })
  } catch (grund: unknown) {
    if (grund instanceof ApiError && grund.code === 'dokument_nicht_im_cache') {
      return await rufe({ inhalt_text: tab.inhalt, dateiname: tab.titel })
    }
    throw grund
  }
}

async function lade(tab: DokumentTab, art: ExtrasArt, erzwingen: boolean): Promise<void> {
  if (tab.analyse === null) return
  const hash = tab.analyse.dokument_hash
  if (!erzwingen && cache.get(hash)?.[art] !== undefined) return
  const schluessel = `${hash}:${art}`
  if (laufend.has(schluessel)) return
  laufend.add(schluessel)
  aktualisiere(hash, { laed: true, fehler: null })
  try {
    if (art === 'statistik') {
      const antwort = await mitCacheWiederholung(tab, hash, (dokument) =>
        statistikBerechnen({ dokument }),
      )
      aktualisiere(hash, { statistik: antwort })
    } else {
      const antwort = await mitCacheWiederholung(tab, hash, (dokument) =>
        musterErkennen({ dokument }),
      )
      aktualisiere(hash, { muster: antwort })
    }
  } catch (grund: unknown) {
    aktualisiere(hash, { fehler: fehlerText(grund) })
  } finally {
    laufend.delete(schluessel)
    aktualisiere(hash, {
      laed: laufend.has(`${hash}:statistik`) || laufend.has(`${hash}:muster`),
    })
  }
}

/** Lädt die Statistik zum Tab-Dokument (übersprungen, wenn schon im Cache). */
export function ladeStatistik(tab: DokumentTab, erzwingen = false): Promise<void> {
  return lade(tab, 'statistik', erzwingen)
}

/** Lädt die Muster-Funde zum Tab-Dokument (übersprungen, wenn schon im Cache). */
export function ladeMuster(tab: DokumentTab, erzwingen = false): Promise<void> {
  return lade(tab, 'muster', erzwingen)
}
