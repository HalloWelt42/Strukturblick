// Verschachtelungstiefe eines JSON-Wertebaums, gemessen in Container-Ebenen.
// Reine Funktion ohne DOM-Bezug, direkt testbar. Die Tiefe zaehlt genau wie
// klappeBisEbene in baumZustand.svelte.ts: die Wurzel (Objekt oder Liste) hat
// Tiefe 0, ihre direkten Container-Kinder Tiefe 1, deren Container-Kinder
// Tiefe 2 und so fort. Nicht-Container (Text, Zahl, Wahrheitswert, null)
// zaehlen nicht als eigene Ebene.

import type { JsonWert } from '../api/typen'

/** Ein Wert ist ein Container, wenn er ein Objekt oder eine Liste ist. */
function istContainer(wert: JsonWert): boolean {
  return wert !== null && typeof wert === 'object'
}

/**
 * Maximale Container-Tiefe des Wertebaums. Ein Wert ohne Container-Kinder hat
 * Tiefe 0 (ein flaches Objekt oder eine flache Liste ebenso). Jede weitere
 * Verschachtelungsstufe erhoeht die Tiefe um 1. Ist die Wurzel selbst kein
 * Container, ist die Tiefe 0.
 *
 * Iterativ statt rekursiv, damit sehr tief verschachtelte Dokumente den
 * Aufrufstapel nicht sprengen.
 */
export function maxContainerTiefe(wurzel: JsonWert): number {
  if (!istContainer(wurzel)) return 0
  let maximum = 0
  // Stapel aus (Wert, Tiefe)-Paaren; die Wurzel liegt auf Tiefe 0.
  const stapel: { wert: JsonWert; tiefe: number }[] = [{ wert: wurzel, tiefe: 0 }]
  while (stapel.length > 0) {
    const { wert, tiefe } = stapel.pop() as { wert: JsonWert; tiefe: number }
    if (tiefe > maximum) maximum = tiefe
    const kinder: JsonWert[] = Array.isArray(wert)
      ? wert
      : Object.values(wert as { [schluessel: string]: JsonWert })
    for (const kind of kinder) {
      if (istContainer(kind)) stapel.push({ wert: kind, tiefe: tiefe + 1 })
    }
  }
  return maximum
}

/** Kleinste und groesste sinnvolle Ebenen-Zahl fuer die Falt-Knoepfe. */
const MIN_EBENEN = 1
const MAX_EBENEN = 9

/**
 * Anzahl sinnvoller Ebenen-Knoepfe zu einem Wertebaum: die Container-Tiefe,
 * mindestens 1 und hoechstens 9. Ein flaches Objekt ergibt so genau einen
 * Knopf ("Ebene 1" = alles auf/zu), tiefere Strukturen entsprechend mehr.
 */
export function ebenenAnzahl(wurzel: JsonWert): number {
  const tiefe = maxContainerTiefe(wurzel)
  return Math.min(MAX_EBENEN, Math.max(MIN_EBENEN, tiefe))
}
