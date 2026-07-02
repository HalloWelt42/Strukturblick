// Fabrik für den CodeMirror-Editor samt Hilfsfunktionen. Erfahrungswerte,
// die hier bewusst eingehalten werden:
// - Kein margin am .cm-editor (bricht die Klick-Geometrie) - Abstände macht
//   der Wirt-Container per padding.
// - Dokument laden/ersetzen immer mit Transaction.addToHistory.of(false),
//   damit externes Nachladen nicht in der Undo-Historie landet.
// - Wurzel-Klassen nie per classList.toggle, sondern über die
//   EditorView.editorAttributes-Facet im attribute-Compartment.

import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import {
  bracketMatching,
  ensureSyntaxTree,
  foldEffect,
  foldGutter,
  foldKeymap,
  foldNodeProp,
  syntaxTree,
  unfoldAll,
} from '@codemirror/language'
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
import { suchZaehlung } from './suchZaehlung'

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
      suchZaehlung,
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

// ----- Faltung ------------------------------------------------------------
//
// Obergrenzen, damit die Faltung auch bei sehr grossen Dokumenten (grosse
// NDJSON-/JSON-Baeume) zuegig bleibt und weder haengt noch fehlschlaegt:
// - PARSE_ZEITBUDGET_MS begrenzt, wie lange der Parser hoechstens laeuft, um
//   den Syntaxbaum zu vervollstaendigen. Reicht die Zeit nicht, wird der
//   bereits geparste (unvollstaendige) Baum verwendet - lieber die oberen
//   Ebenen falten als den Browser blockieren.
// - MAX_KNOTEN kappt die Iteration; darueber hinaus werden keine weiteren
//   Faltbereiche gesammelt. So bleibt der eine Sammel-Dispatch beschraenkt.
const PARSE_ZEITBUDGET_MS = 150
const MAX_KNOTEN = 200_000

/**
 * Faltet alle faltbaren Container ab Tiefe `ebene` (1-basiert) zusammen und
 * klappt zuvor alles auf. Robust fuer grosse Dokumente: der Syntaxbaum wird
 * nur bis zu einem Zeitbudget vervollstaendigt, die Iteration bei MAX_KNOTEN
 * gekappt, und alle Faltungen laufen in EINEM Dispatch.
 */
export function falteAufEbene(view: EditorView, ebene: number): void {
  unfoldAll(view)
  const state = view.state
  // Parser bis zum Dokumentende laufen lassen, aber nur im Zeitbudget - liefert
  // bei Zeitueberschreitung null, dann greifen wir auf den Teilbaum zurueck.
  const baum =
    ensureSyntaxTree(state, state.doc.length, PARSE_ZEITBUDGET_MS) ?? syntaxTree(state)
  const effekte: ReturnType<typeof foldEffect.of>[] = []
  // Tiefenzaehler ueber einen Stapel: jeder betretene Knoten legt ab, ob er
  // faltbar war, jeder verlassene raeumt entsprechend ab.
  const stapel: boolean[] = []
  let tiefe = 0
  let besucht = 0
  baum.iterate({
    enter: (knoten) => {
      if (besucht >= MAX_KNOTEN) return false
      besucht += 1
      const falter = knoten.type.prop(foldNodeProp)
      const bereich = falter !== undefined ? falter(knoten.node, state) : null
      const faltbar = bereich !== null && bereich.to > bereich.from
      stapel.push(faltbar)
      if (faltbar) {
        tiefe += 1
        if (tiefe >= ebene) effekte.push(foldEffect.of(bereich))
      }
      return undefined
    },
    leave: () => {
      if (stapel.pop() === true) tiefe -= 1
    },
  })
  if (effekte.length > 0) view.dispatch({ effects: effekte })
}

/** Klappt alle faltbaren Container des Dokuments zusammen (wie Ebene 1). */
export function falteAlles(view: EditorView): void {
  falteAufEbene(view, 1)
}

/** Klappt alle Faltungen wieder auf. */
export function entfalteAlles(view: EditorView): void {
  unfoldAll(view)
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
