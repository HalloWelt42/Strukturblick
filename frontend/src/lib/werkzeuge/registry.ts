// Registry der Werkzeuge (linke Leiste). Jedes Werkzeug meldet sich mit id,
// Titel und Komponente an; die Schale rendert das aktive Werkzeug anhand der
// id aus dem werkzeug-Zustand. Weitere Werkzeuge (Konvertieren, Reparatur,
// Code erzeugen, Testdaten) kommen in späteren Ausbaustufen einfach dazu.
import type { Component } from 'svelte'

import ValidierenWerkzeug from './ValidierenWerkzeug.svelte'

export interface WerkzeugModul {
  id: string
  titel: string
  komponente: Component
}

const WERKZEUGE = new Map<string, WerkzeugModul>()

export function registriereWerkzeug(modul: WerkzeugModul): void {
  WERKZEUGE.set(modul.id, modul)
}

export function werkzeugKomponente(id: string): Component | undefined {
  return WERKZEUGE.get(id)?.komponente
}

registriereWerkzeug({ id: 'validieren', titel: 'Validieren', komponente: ValidierenWerkzeug })
