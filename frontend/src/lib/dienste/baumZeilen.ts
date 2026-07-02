// Baut aus dem Wertebaum die sichtbaren Zeilen des Strukturbaums. Die
// Tiefensuche läuft bewusst über den Wertebaum und NICHT über die
// Parse-Positionen - Formate ohne Positionsangaben müssen trotzdem einen
// vollständigen Baum zeigen. Reine Funktion ohne DOM-Bezug, direkt testbar.

import type { JsonWert, KnotenSpannen } from '../api/typen'
import { elternPointer, kindPointer } from './pfade'
import { kurzVorschau, typVon, type WertTyp } from './wertZugriff'

/** Sicht-Zustand des Baums (strukturkompatibel zu BaumTabZustand). */
export interface BaumSichtZustand {
  aufgeklappt: ReadonlySet<string>
  suchbegriff: string
  nurTreffer: boolean
}

export interface BaumZeileDaten {
  pfad: string
  /** Objekt-Schlüssel (entescaped) oder null bei Wurzel und Listen-Einträgen. */
  schluessel: string | null
  /** Listen-Index oder null bei Wurzel und Objekt-Einträgen. */
  index: number | null
  tiefe: number
  typ: WertTyp
  istContainer: boolean
  kindAnzahl: number
  vorschau: string
  aufgeklappt: boolean
  hatPosition: boolean
  treffer: boolean
}

function kindAnzahlVon(wert: JsonWert): number {
  if (Array.isArray(wert)) return wert.length
  if (wert !== null && typeof wert === 'object') return Object.keys(wert).length
  return 0
}

/** Prüft Schlüssel ODER Wertvorschau auf den Suchbegriff (case-insensitiv). */
function istTreffer(
  begriff: string,
  schluessel: string | null,
  vorschau: string,
): boolean {
  if (begriff === '') return false
  if (schluessel !== null && schluessel.toLowerCase().includes(begriff)) return true
  return vorschau.toLowerCase().includes(begriff)
}

/**
 * Erzeugt die sichtbaren Zeilen: Kinder erscheinen nur unter aufgeklappten
 * Containern. Bei suchbegriff + nurTreffer wird der komplette Baum
 * durchsucht und auf Treffer plus alle ihre Vorfahren reduziert; Vorfahren
 * werden dabei als aufgeklappt erzwungen.
 */
export function baueSichtbareZeilen(
  wurzel: JsonWert,
  positionen: Record<string, KnotenSpannen>,
  zustand: BaumSichtZustand,
): BaumZeileDaten[] {
  const begriff = zustand.suchbegriff.trim().toLowerCase()
  const filtern = begriff !== '' && zustand.nurTreffer
  const zeilen: BaumZeileDaten[] = []

  const sammle = (
    wert: JsonWert,
    pfad: string,
    schluessel: string | null,
    index: number | null,
    tiefe: number,
  ): void => {
    const typ = typVon(wert)
    const istContainer = typ === 'objekt' || typ === 'liste'
    const vorschau = kurzVorschau(wert)
    const aufgeklappt = istContainer && zustand.aufgeklappt.has(pfad)
    zeilen.push({
      pfad,
      schluessel,
      index,
      tiefe,
      typ,
      istContainer,
      kindAnzahl: kindAnzahlVon(wert),
      vorschau,
      aufgeklappt,
      hatPosition: Object.prototype.hasOwnProperty.call(positionen, pfad),
      treffer: istTreffer(begriff, schluessel, vorschau),
    })
    // Im Filter-Modus vollstaendig absteigen, damit auch Treffer in
    // zugeklappten Teilbaeumen gefunden werden.
    if (!istContainer || (!filtern && !aufgeklappt)) return
    if (Array.isArray(wert)) {
      wert.forEach((kind, kindIndex) => {
        sammle(kind, kindPointer(pfad, kindIndex), null, kindIndex, tiefe + 1)
      })
    } else if (wert !== null && typeof wert === 'object') {
      for (const [kindSchluessel, kind] of Object.entries(wert)) {
        sammle(kind, kindPointer(pfad, kindSchluessel), kindSchluessel, null, tiefe + 1)
      }
    }
  }

  sammle(wurzel, '', null, null, 0)
  if (!filtern) return zeilen

  // Zweiter Durchlauf: Treffer behalten, dazu ALLE Vorfahren von Treffern -
  // diese werden aufgeklappt erzwungen, damit der Pfad zum Treffer offen ist.
  const trefferPfade = new Set<string>()
  const vorfahren = new Set<string>()
  for (const zeile of zeilen) {
    if (!zeile.treffer) continue
    trefferPfade.add(zeile.pfad)
    let eltern = elternPointer(zeile.pfad)
    while (eltern !== null && !vorfahren.has(eltern)) {
      vorfahren.add(eltern)
      eltern = elternPointer(eltern)
    }
  }
  return zeilen
    .filter((zeile) => trefferPfade.has(zeile.pfad) || vorfahren.has(zeile.pfad))
    .map((zeile) =>
      vorfahren.has(zeile.pfad) && zeile.istContainer && !zeile.aufgeklappt
        ? { ...zeile, aufgeklappt: true }
        : zeile,
    )
}
