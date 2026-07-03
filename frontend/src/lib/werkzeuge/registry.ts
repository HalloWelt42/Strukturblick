// Registry der Werkzeuge (linke Leiste). Jedes Werkzeug meldet sich mit id,
// Titel und Komponente an; die Schale rendert das aktive Werkzeug anhand der
// id aus dem werkzeug-Zustand. Weitere Werkzeuge (Code erzeugen, Testdaten)
// kommen in späteren Ausbaustufen einfach dazu.
import type { Component } from 'svelte'

import CodegenWerkzeug from './CodegenWerkzeug.svelte'
import DokumenteVerwaltung from './DokumenteVerwaltung.svelte'
import KonvertierenWerkzeug from './KonvertierenWerkzeug.svelte'
import ReparaturWerkzeug from './ReparaturWerkzeug.svelte'
import TestdatenWerkzeug from './TestdatenWerkzeug.svelte'
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

registriereWerkzeug({ id: 'konvertieren', titel: 'Konvertieren', komponente: KonvertierenWerkzeug })
registriereWerkzeug({ id: 'validieren', titel: 'Validieren', komponente: ValidierenWerkzeug })
registriereWerkzeug({ id: 'reparatur', titel: 'Reparatur', komponente: ReparaturWerkzeug })
registriereWerkzeug({ id: 'codegen', titel: 'Code erzeugen', komponente: CodegenWerkzeug })
registriereWerkzeug({ id: 'testdaten', titel: 'Testdaten', komponente: TestdatenWerkzeug })
registriereWerkzeug({
  id: 'dokumente',
  titel: 'Dokumente verwalten',
  komponente: DokumenteVerwaltung,
})
