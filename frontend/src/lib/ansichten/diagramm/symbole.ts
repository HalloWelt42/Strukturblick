// Icon-Zuordnung für die Knoten-Karten der Diagramme. Reine Funktionen ohne
// DOM-Bezug. Schema und Graph wählen so konsistente Font-Awesome-Symbole:
// im Schema anhand des Typnamens (Wurzel, Objekt-Typen), im Graph anhand des
// Werttyps eines Knotens.

import type { WertTyp } from '../../dienste/wertZugriff'

/** Vollständige Icon-Klasse je Werttyp (Graph-Knoten). */
const ICON_JE_TYP: Record<WertTyp, string> = {
  objekt: 'fa-solid fa-cube',
  liste: 'fa-solid fa-list',
  text: 'fa-solid fa-font',
  zahl: 'fa-solid fa-hashtag',
  wahrheitswert: 'fa-solid fa-toggle-on',
  null: 'fa-solid fa-ban',
}

/** Icon eines Graph-Knotens anhand seines Werttyps. */
export function iconFuerTyp(typ: WertTyp): string {
  return ICON_JE_TYP[typ]
}

/** Icon eines Schema-Typs: die Wurzel als Würfel, jeder benannte Typ als Baustein. */
export function iconFuerSchemaTyp(istWurzel: boolean): string {
  return istWurzel ? 'fa-solid fa-cube' : 'fa-solid fa-diagram-project'
}
