// Treffer-Anzeige zum Such-Panel: eine kleine Zeile unter der Suchleiste, die
// die Anzahl der aktuellen Suchtreffer im gesamten Dokument zeigt. Sie wird nur
// eingeblendet, solange das Such-Panel offen ist, und aktualisiert sich bei
// Dokument- und Sucheingaben. Bei sehr großen Dokumenten wird die Zählung an
// einer Obergrenze gekappt ("500+ Treffer"), damit das Zählen nie hängt.

import { getSearchQuery, searchPanelOpen } from '@codemirror/search'
import { StateField, type EditorState, type Extension } from '@codemirror/state'
import { EditorView, showPanel, type Panel } from '@codemirror/view'

/** Obergrenze der Zählung; darüber zeigen wir "N+ Treffer". */
const MAX_ZAEHLUNG = 500

/**
 * Zählt die Treffer der aktuellen Suchanfrage im ganzen Dokument, gekappt bei
 * MAX_ZAEHLUNG. Liefert null, wenn keine gültige Suche gesetzt ist.
 */
function zaehleTreffer(state: EditorState): number | null {
  const query = getSearchQuery(state)
  if (!query.valid) return null
  const cursor = query.getCursor(state) as Iterator<{ from: number; to: number }>
  let anzahl = 0
  let naechster = cursor.next()
  while (naechster.done !== true) {
    anzahl += 1
    if (anzahl >= MAX_ZAEHLUNG) break
    naechster = cursor.next()
  }
  return anzahl
}

/** Formuliert den Anzeigetext zur (möglicherweise gekappten) Trefferzahl. */
function trefferText(state: EditorState): string {
  const anzahl = zaehleTreffer(state)
  if (anzahl === null) return ''
  if (anzahl >= MAX_ZAEHLUNG) return `${MAX_ZAEHLUNG}+ Treffer`
  if (anzahl === 1) return '1 Treffer'
  return `${anzahl} Treffer`
}

/** Baut das schmale Trefferzähler-Panel; es rendert unter dem Such-Panel. */
function trefferPanel(view: EditorView): Panel {
  const wurzel = document.createElement('div')
  wurzel.className = 'cm-treffer-zaehler'
  wurzel.textContent = trefferText(view.state)
  return {
    dom: wurzel,
    top: false,
    update(update) {
      if (update.docChanged || update.transactions.some((t) => t.effects.length > 0)) {
        wurzel.textContent = trefferText(update.state)
      }
    },
  }
}

// Zeigt das Panel nur, solange das Such-Panel offen ist.
const zaehlerFeld = StateField.define<boolean>({
  create: (state) => searchPanelOpen(state),
  update: (wert, tr) => searchPanelOpen(tr.state),
  provide: (feld) =>
    showPanel.from(feld, (offen) => (offen ? trefferPanel : null)),
})

/** Trefferzähler als eine Extension für den Editor. */
export const suchZaehlung: Extension = [zaehlerFeld]
