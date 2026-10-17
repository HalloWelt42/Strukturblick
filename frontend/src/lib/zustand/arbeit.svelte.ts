// Was gerade in Arbeit ist und durch ein Neuladen der Seite verloren ginge. Die
// Fassungsprüfung (zustand/fassung.svelte.ts) fragt das ab, bevor sie die Seite von
// selbst neu lädt. Der Arbeitsstand der Tabs (Inhalt, aktiver Tab, Ansicht) zählt nicht
// dazu: er wird vor jedem Neuladen gesichert und danach wiederhergestellt.

import { SvelteSet } from 'svelte/reactivity'

import { tabellenAnsichtMitEingaben } from '../ansichten/tabelle/tabellenAnsichtZustand.svelte'
import { tabellenAenderungenOffen } from '../ansichten/tabelle/tabellenBearbeitung.svelte'
import { kiAufgabe } from '../ki/kiAufgaben.svelte'
import { konsole } from './konsole.svelte'
import { werkzeug } from './werkzeug.svelte'

const offen = new SvelteSet<() => boolean>()

/**
 * Beim Aufbau einer Komponente aufrufen: solange `istOffen()` wahr ist, wartet ein
 * Neuladen; mit der Komponente endet es (etwa ein offenes Modal).
 */
export function haeltNeuladen(istOffen: () => boolean): void {
  $effect(() => {
    offen.add(istOffen)
    return () => offen.delete(istOffen)
  })
}

/** Nichts in Arbeit, das ein Neuladen abbräche. */
export function ruhig(): boolean {
  return (
    // Offenes Werkzeug: Eingaben und Ergebnisse leben nur dort
    werkzeug.aktiv === null &&
    // KI rechnet oder ihre Vorschau wartet aufs Übernehmen
    !kiAufgabe.laeuft &&
    kiAufgabe.ergebnis === null &&
    !konsole.laeuft &&
    // Tabellen-Änderungen als Vorschau, Anzeigenamen und Wert-Übersetzungen
    !tabellenAenderungenOffen() &&
    !tabellenAnsichtMitEingaben() &&
    // Offene Modale und andere angemeldete Bearbeitungen
    ![...offen].some((istOffen) => istOffen())
  )
}
