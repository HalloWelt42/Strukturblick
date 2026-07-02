// Ansichts-Registry: Jede Ansicht (Baum, Editor, Tabelle, ...) meldet sich
// als AnsichtsModul an, die Schale rendert die Reiter aus dieser Liste.
// Die Props der Ansichts-Komponenten kommen in Phase 0.3 - das Interface
// bleibt bis dahin bewusst schlank.

import type { Component } from 'svelte'

export type Eignung = 'geeignet' | 'eingeschraenkt' | 'ungeeignet'

export interface AnsichtsModul {
  id: string
  titel: string
  /** Icon-Klasse ohne Stil-Präfix, zum Beispiel "fa-folder-tree". */
  icon: string
  /** Sortierposition in der Ansichtswahl (aufsteigend). */
  reihenfolge: number
  /** Ob die Ansicht das Analyse-Ergebnis des Backends braucht. */
  brauchtAnalyse: boolean
  /** Wie gut die Ansicht zum aktuellen Dokument passt. */
  eignung: () => Eignung
  komponente: Component
}

const registrierte: AnsichtsModul[] = []

export function registriereAnsicht(modul: AnsichtsModul): void {
  const index = registrierte.findIndex((eintrag) => eintrag.id === modul.id)
  if (index !== -1) {
    registrierte[index] = modul
    return
  }
  registrierte.push(modul)
}

/** Alle angemeldeten Ansichten, sortiert nach reihenfolge. */
export function ansichten(): AnsichtsModul[] {
  return [...registrierte].sort((a, b) => a.reihenfolge - b.reihenfolge)
}

export function komponenteFuer(id: string): Component | undefined {
  return registrierte.find((eintrag) => eintrag.id === id)?.komponente
}
