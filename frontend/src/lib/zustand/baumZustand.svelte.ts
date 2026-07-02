// Anzeige-Zustand des Strukturbaums je Tab: aufgeklappte Pfade, Suchbegriff
// und der Filter "nur Treffer". Der Zustand lebt getrennt von den Tabs, weil
// er rein visuell ist und nicht persistiert werden muss.

import { SvelteSet } from 'svelte/reactivity'

import type { KnotenSpannen } from '../api/typen'
import { elternPointer, segmenteAusPointer } from '../dienste/pfade'

export interface BaumTabZustand {
  /** Aufgeklappte Container-Pfade; die Wurzel "" ist initial auf. */
  aufgeklappt: SvelteSet<string>
  suchbegriff: string
  nurTreffer: boolean
}

const zustaende = new Map<string, BaumTabZustand>()

/** Liefert den (reaktiven) Baum-Zustand des Tabs; legt ihn bei Bedarf an. */
export function zustandFuer(tabId: string): BaumTabZustand {
  const vorhanden = zustaende.get(tabId)
  if (vorhanden !== undefined) return vorhanden
  const neu = $state<BaumTabZustand>({
    aufgeklappt: new SvelteSet(['']),
    suchbegriff: '',
    nurTreffer: false,
  })
  zustaende.set(tabId, neu)
  return neu
}

/** Klappt einen einzelnen Pfad um (auf <-> zu). */
export function klappe(tabId: string, pfad: string): void {
  const zustand = zustandFuer(tabId)
  if (zustand.aufgeklappt.has(pfad)) {
    zustand.aufgeklappt.delete(pfad)
  } else {
    zustand.aufgeklappt.add(pfad)
  }
}

/** Alle Unterpfade eines Pfads (Präfix pfad + "/") aus den Parse-Positionen. */
function unterPfade(pfad: string, positionen: Record<string, KnotenSpannen>): string[] {
  const praefix = `${pfad}/`
  return Object.keys(positionen).filter((kandidat) => kandidat.startsWith(praefix))
}

/** Klappt den Pfad samt aller Unterpfade um; Richtung folgt dem Pfad selbst. */
export function klappeRekursiv(
  tabId: string,
  pfad: string,
  positionen: Record<string, KnotenSpannen>,
): void {
  const zustand = zustandFuer(tabId)
  const aufklappen = !zustand.aufgeklappt.has(pfad)
  const betroffen = [pfad, ...unterPfade(pfad, positionen)]
  for (const kandidat of betroffen) {
    if (aufklappen) {
      zustand.aufgeklappt.add(kandidat)
    } else {
      zustand.aufgeklappt.delete(kandidat)
    }
  }
}

export function klappeAlleAuf(
  tabId: string,
  positionen: Record<string, KnotenSpannen>,
): void {
  const zustand = zustandFuer(tabId)
  zustand.aufgeklappt.add('')
  for (const pfad of Object.keys(positionen)) {
    zustand.aufgeklappt.add(pfad)
  }
}

export function klappeAlleZu(
  tabId: string,
  positionen: Record<string, KnotenSpannen>,
): void {
  const zustand = zustandFuer(tabId)
  zustand.aufgeklappt.delete('')
  for (const pfad of Object.keys(positionen)) {
    zustand.aufgeklappt.delete(pfad)
  }
}

/** Pfade mit Tiefe < ebene auf, Rest zu; Tiefe = Segmentanzahl (Wurzel 0). */
export function klappeBisEbene(
  tabId: string,
  positionen: Record<string, KnotenSpannen>,
  ebene: number,
): void {
  const zustand = zustandFuer(tabId)
  const alle = ['', ...Object.keys(positionen)]
  for (const pfad of alle) {
    const tiefe = segmenteAusPointer(pfad).length
    if (tiefe < ebene) {
      zustand.aufgeklappt.add(pfad)
    } else {
      zustand.aufgeklappt.delete(pfad)
    }
  }
}

/** Klappt alle Vorfahren des Pfads auf, damit seine Zeile sichtbar wird. */
export function oeffnePfadZu(tabId: string, pfad: string): void {
  const zustand = zustandFuer(tabId)
  let vorfahr = elternPointer(pfad)
  while (vorfahr !== null) {
    zustand.aufgeklappt.add(vorfahr)
    vorfahr = elternPointer(vorfahr)
  }
}
