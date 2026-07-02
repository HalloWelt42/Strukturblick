// Flacher Positions-Index über alle Knoten eines Dokuments: bildet Pfade auf
// Quelltext-Offsets ab und findet umgekehrt zum Cursor-Offset den tiefsten
// umschließenden Knoten. Grundlage der Kopplung Editor <-> Baum.
// Reine Funktionen ohne DOM-Bezug, direkt testbar.

import type { KnotenSpannen } from '../api/typen'

export interface PfadIndexEintrag {
  pfad: string
  von: number
  bis: number
}

/** Nach von (wert.start.offset) aufsteigend sortiertes, flaches Array. */
export type PfadIndex = PfadIndexEintrag[]

/** Baut den Index aus den Parse-Positionen; Einträge ohne Offset entfallen. */
export function baueIndex(positionen: Record<string, KnotenSpannen>): PfadIndex {
  const eintraege: PfadIndexEintrag[] = []
  for (const [pfad, spannen] of Object.entries(positionen)) {
    const von = spannen.wert.start.offset
    if (von < 0) continue
    const endOffset = spannen.wert.ende.offset
    eintraege.push({ pfad, von, bis: endOffset >= von ? endOffset : von })
  }
  eintraege.sort((a, b) => a.von - b.von)
  return eintraege
}

export function pfadZuSpanne(index: PfadIndex, pfad: string): PfadIndexEintrag | null {
  return index.find((eintrag) => eintrag.pfad === pfad) ?? null
}

/**
 * Tiefster Knoten, der den Offset umschließt (von <= offset <= bis).
 * Binäre Suche auf von, dann rückwärts der erste umschließende Eintrag -
 * bei aufsteigender Sortierung ist das der mit dem größten von, also der
 * tiefste Knoten.
 */
export function pfadAnOffset(index: PfadIndex, offset: number): PfadIndexEintrag | null {
  let links = 0
  let rechts = index.length - 1
  let letzter = -1
  while (links <= rechts) {
    const mitte = (links + rechts) >> 1
    const eintrag = index[mitte]
    if (eintrag !== undefined && eintrag.von <= offset) {
      letzter = mitte
      links = mitte + 1
    } else {
      rechts = mitte - 1
    }
  }
  for (let i = letzter; i >= 0; i -= 1) {
    const eintrag = index[i]
    if (eintrag !== undefined && eintrag.bis >= offset) return eintrag
  }
  return null
}
