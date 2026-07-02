// Zentrale Anmeldestelle der Ansichten. Jede Ansicht (Baum, Editor, Tabelle,
// Statistik, Schema, Vergleich, Graph, Lexikon) meldet sich hier über
// registriereAnsicht() aus lib/ansichten/registry.ts an, sobald es sie gibt.
// Der Import in main.ts lädt diese Datei als Seiteneffekt.

import { istTabellarisch } from '../dienste/tabellenModell'
import { aktiverTab } from '../zustand/tabs.svelte'
import BaumAnsicht from './baum/BaumAnsicht.svelte'
import EditorAnsicht from './editor/EditorAnsicht.svelte'
import { registriereAnsicht } from './registry'
import StatistikAnsicht from './statistik/StatistikAnsicht.svelte'
import TabellenAnsicht from './tabelle/TabellenAnsicht.svelte'

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

registriereAnsicht({
  id: 'tabelle',
  titel: 'Tabelle',
  icon: 'fa-solid fa-table',
  reihenfolge: 30,
  brauchtAnalyse: true,
  eignung: () => {
    const tab = aktiverTab()
    if (tab?.analyse == null) return 'ungeeignet'
    return istTabellarisch(tab.analyse.wurzel) ? 'geeignet' : 'ungeeignet'
  },
  komponente: TabellenAnsicht,
})

registriereAnsicht({
  id: 'statistik',
  titel: 'Statistik',
  icon: 'fa-solid fa-chart-column',
  reihenfolge: 40,
  brauchtAnalyse: true,
  eignung: () => 'geeignet',
  komponente: StatistikAnsicht,
})
