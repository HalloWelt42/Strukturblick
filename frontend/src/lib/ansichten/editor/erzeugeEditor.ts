// Fabrik für den CodeMirror-Editor samt Hilfsfunktionen. Erfahrungswerte,
// die hier bewusst eingehalten werden:
// - Kein margin am .cm-editor (bricht die Klick-Geometrie) - Abstände macht
//   der Wirt-Container per padding.
// - Dokument laden/ersetzen immer mit Transaction.addToHistory.of(false),
//   damit externes Nachladen nicht in der Undo-Historie landet.
// - Wurzel-Klassen nie per classList.toggle, sondern über die
//   EditorView.editorAttributes-Facet im attribute-Compartment.

import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { bracketMatching, foldGutter, foldKeymap } from '@codemirror/language'
import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint'
import { highlightSelectionMatches, search, searchKeymap } from '@codemirror/search'
import {
  Compartment,
  EditorSelection,
  EditorState,
  Transaction,
  type Text,
} from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view'

import type { FormatId, QuellSpanne } from '../../api/typen'
import { editorTheme } from './editorTheme'
import { sprachExtension } from './sprachen'

export interface EditorArgs {
  inhalt: string
  format: FormatId | null
  anInhaltGeaendert: (text: string) => void
  anCursor: (zeile: number, spalte: number, offset: number) => void
}

/** Schweregrad einer Diagnose im Editor (entspricht @codemirror/lint). */
export type DiagnoseSchwere = 'error' | 'warning' | 'info'

export interface DiagnoseEintrag {
  schwere: DiagnoseSchwere
  meldung: string
  /** Quellposition; null bedeutet: ohne Position (Zeile 1 wird markiert). */
  position: QuellSpanne | null
}

// Die drei Compartments: Sprache, Wurzel-Attribute, Nur-Lesen-Schalter.
const sprache = new Compartment()
const attribute = new Compartment()
const nurLesen = new Compartment()

/** Baut einen vollständigen Editor in das übergebene Elternelement. */
export function erzeugeEditor(elternElement: HTMLElement, args: EditorArgs): EditorView {
  const state = EditorState.create({
    doc: args.inhalt,
    extensions: [
      lineNumbers(),
      foldGutter(),
      history(),
      drawSelection(),
      bracketMatching(),
      highlightActiveLine(),
      highlightActiveLineGutter(),
      highlightSelectionMatches(),
      lintGutter(),
      search({ top: false }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...foldKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),
      EditorState.tabSize.of(2),
      sprache.of(sprachExtension(args.format)),
      attribute.of(EditorView.editorAttributes.of({})),
      nurLesen.of(EditorState.readOnly.of(false)),
      editorTheme,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          args.anInhaltGeaendert(update.state.doc.toString())
        }
        if (update.selectionSet) {
          const kopf = update.state.selection.main.head
          const zeile = update.state.doc.lineAt(kopf)
          args.anCursor(zeile.number, kopf - zeile.from + 1, kopf)
        }
      }),
    ],
  })
  return new EditorView({ parent: elternElement, state })
}

/** Ersetzt das Dokument komplett, ohne die Undo-Historie zu belasten. */
export function setzeDokument(view: EditorView, text: string): void {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: text },
    annotations: Transaction.addToHistory.of(false),
  })
}

/** Stellt die Sprachunterstützung auf das übergebene Format um. */
export function setzeSprache(view: EditorView, formatId: FormatId | null): void {
  view.dispatch({ effects: sprache.reconfigure(sprachExtension(formatId)) })
}

/** Selektiert den Bereich, rollt ihn mittig ins Bild und fokussiert den Editor. */
export function springeZuPosition(view: EditorView, vonOffset: number, bisOffset: number): void {
  const laenge = view.state.doc.length
  const von = Math.max(0, Math.min(vonOffset, laenge))
  const bis = Math.max(von, Math.min(bisOffset, laenge))
  view.dispatch({
    selection: EditorSelection.range(von, bis),
    effects: EditorView.scrollIntoView(von, { y: 'center' }),
    userEvent: 'select.sprungziel',
  })
  view.focus()
}

/** Quellspanne in Dokument-Offsets; ist nur die Zeile bekannt, zählt die ganze Zeile. */
function alsOffsetBereich(doc: Text, position: QuellSpanne | null): { from: number; to: number } {
  if (position !== null && position.start.offset >= 0) {
    const from = Math.min(position.start.offset, doc.length)
    const bisRoh = position.ende.offset >= 0 ? position.ende.offset : from
    return { from, to: Math.min(Math.max(bisRoh, from), doc.length) }
  }
  const nummer =
    position !== null && position.start.zeile >= 1
      ? Math.min(position.start.zeile, doc.lines)
      : 1
  const zeile = doc.line(nummer)
  return { from: zeile.from, to: zeile.to }
}

/** Übergibt die Diagnosen an die Lint-Erweiterung (Unterstreichung + Gutter). */
export function setzeDiagnosen(view: EditorView, diagnosen: DiagnoseEintrag[]): void {
  const eintraege: Diagnostic[] = diagnosen.map((diagnose) => {
    const bereich = alsOffsetBereich(view.state.doc, diagnose.position)
    return {
      from: bereich.from,
      to: bereich.to,
      severity: diagnose.schwere,
      message: diagnose.meldung,
    }
  })
  view.dispatch(setDiagnostics(view.state, eintraege))
}

export { alsOffsetBereich }
