// Zugriff auf und Darstellung von JSON-Werten anhand von JSON-Pointern.
// Reine Funktionen ohne DOM-Bezug, direkt testbar.

import type { JsonWert } from '../api/typen'
import { segmenteAusPointer } from './pfade'

/** Anzeigename des Werttyps, wie ihn Baum und Inspektor verwenden. */
export type WertTyp = 'objekt' | 'liste' | 'text' | 'zahl' | 'wahrheitswert' | 'null'

/** Löst einen Pointer im Wertebaum auf; undefined, wenn der Pfad nicht existiert. */
export function wertAnPfad(wurzel: JsonWert, pointer: string): JsonWert | undefined {
  let aktuell: JsonWert = wurzel
  for (const segment of segmenteAusPointer(pointer)) {
    if (Array.isArray(aktuell)) {
      if (!/^(0|[1-9][0-9]*)$/.test(segment)) return undefined
      const index = Number(segment)
      if (index >= aktuell.length) return undefined
      aktuell = aktuell[index] as JsonWert
    } else if (aktuell !== null && typeof aktuell === 'object') {
      if (!Object.prototype.hasOwnProperty.call(aktuell, segment)) return undefined
      aktuell = aktuell[segment] as JsonWert
    } else {
      return undefined
    }
  }
  return aktuell
}

export function typVon(wert: JsonWert): WertTyp {
  if (wert === null) return 'null'
  if (Array.isArray(wert)) return 'liste'
  switch (typeof wert) {
    case 'object':
      return 'objekt'
    case 'string':
      return 'text'
    case 'number':
      return 'zahl'
    default:
      return 'wahrheitswert'
  }
}

/** Maximale Länge eines einzelnen Eintrags innerhalb einer Container-Vorschau. */
const MAX_EINTRAG_LAENGE = 24

/** Kompakte Darstellung eines Werts als Eintrag innerhalb einer Vorschau. */
function eintragKompakt(wert: JsonWert): string {
  if (typeof wert === 'string') {
    const voll = JSON.stringify(wert)
    if (voll.length <= MAX_EINTRAG_LAENGE) return voll
    return `${voll.slice(0, MAX_EINTRAG_LAENGE - 4)}..."`
  }
  if (wert !== null && typeof wert === 'object') {
    return Array.isArray(wert) ? '[...]' : '{...}'
  }
  return String(wert)
}

/** Reiht Einträge aneinander, bis das Längenbudget erreicht ist; Rest wird "...". */
function containerVorschau(
  teile: string[],
  auf: string,
  zu: string,
  maxLaenge: number,
): string {
  if (teile.length === 0) return auf + zu
  const restMarke = ', ...'
  let inhalt = ''
  let uebernommen = 0
  for (const teil of teile) {
    const kandidat = inhalt === '' ? teil : `${inhalt}, ${teil}`
    const reserve = uebernommen + 1 < teile.length ? restMarke.length : 0
    const gesamt = auf.length + kandidat.length + reserve + zu.length
    if (gesamt > maxLaenge && uebernommen > 0) break
    inhalt = kandidat
    uebernommen += 1
  }
  const suffix = uebernommen < teile.length ? restMarke : ''
  return auf + inhalt + suffix + zu
}

/**
 * Kurzvorschau eines Werts für Baumzeilen und Inspektor, wie im Mockup:
 * Text in Anführungszeichen (bei Überlänge mit "..." gekürzt), Objekte als
 * {"a": 1, ...}, Listen als ["a", "b", ...].
 */
export function kurzVorschau(wert: JsonWert, maxLaenge = 60): string {
  if (typeof wert === 'string') {
    const voll = JSON.stringify(wert)
    if (voll.length <= maxLaenge) return voll
    return `${voll.slice(0, Math.max(1, maxLaenge - 4))}..."`
  }
  if (wert === null || typeof wert !== 'object') return String(wert)
  const ergebnis = Array.isArray(wert)
    ? containerVorschau(wert.map(eintragKompakt), '[', ']', maxLaenge)
    : containerVorschau(
        Object.entries(wert).map(
          ([schluessel, kind]) => `${JSON.stringify(schluessel)}: ${eintragKompakt(kind)}`,
        ),
        '{',
        '}',
        maxLaenge,
      )
  if (ergebnis.length <= maxLaenge) return ergebnis
  return `${ergebnis.slice(0, Math.max(1, maxLaenge - 3))}...`
}
