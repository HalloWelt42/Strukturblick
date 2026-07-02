// Zentrale Anmeldestelle der Ansichten. Jede Ansicht (Baum, Editor, Tabelle,
// Statistik, Schema, Vergleich, Graph, Lexikon) meldet sich hier über
// registriereAnsicht() aus lib/ansichten/registry.ts an, sobald es sie gibt.
// Der Import in main.ts lädt diese Datei als Seiteneffekt.

import BaumAnsicht from './baum/BaumAnsicht.svelte'
import EditorAnsicht from './editor/EditorAnsicht.svelte'
import { registriereAnsicht } from './registry'

registriereAnsicht({
  id: 'baum',
  titel: 'Baum',
  icon: 'fa-solid fa-folder-tree',
  reihenfolge: 10,
  brauchtAnalyse: true,
  eignung: () => 'geeignet',
  komponente: BaumAnsicht,
})

registriereAnsicht({
  id: 'editor',
  titel: 'Editor',
  icon: 'fa-solid fa-code',
  reihenfolge: 20,
  brauchtAnalyse: false,
  eignung: () => 'geeignet',
  komponente: EditorAnsicht,
})
