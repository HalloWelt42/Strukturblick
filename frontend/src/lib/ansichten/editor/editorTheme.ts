// Editor-Optik: ein statisches Theme plus Syntax-Hervorhebung. Alle Farben
// sind var(--...)-Verweise auf die Design-Token aus lib/theme/tokens.css -
// dadurch folgt der Editor automatisch dem Themenwechsel (Mittelton/Dunkel)
// und entspricht dem Bild des Mockup-Editors (mockups/editor.html).

import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { tags } from '@lezer/highlight'

const basisTheme = EditorView.theme({
  '&': {
    height: '100%',
    backgroundColor: 'var(--flaeche-eingabe)',
    color: 'var(--text-1)',
    fontSize: '0.82rem',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-scroller': {
    fontFamily: 'var(--schrift-mono)',
    lineHeight: '1.5',
  },
  '.cm-content': {
    caretColor: 'var(--akzent)',
  },
  '.cm-cursor, .cm-dropCursor': {
    borderLeftColor: 'var(--akzent)',
  },
  // Zeilennummern-Gutter wie die Mockup-.zn: Panel-Fläche, gedämpfter Text.
  '.cm-gutters': {
    backgroundColor: 'var(--flaeche-panel-2)',
    color: 'var(--text-3)',
    borderRight: '1px solid var(--rand-1)',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    paddingRight: 'var(--a2)',
  },
  // Aktive Zeile transparent-dezent, im Gutter ebenso.
  '.cm-activeLine': {
    backgroundColor: 'var(--flaeche-zeile-wechsel)',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--flaeche-zeile-wechsel)',
  },
  // Selektion (drawSelection zeichnet eine eigene Ebene).
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground':
    {
      backgroundColor: 'var(--akzent-weich)',
    },
  '.cm-content ::selection': {
    backgroundColor: 'var(--akzent-weich)',
  },
  // Suchtreffer wie .sx-mark-treffer im Mockup.
  '.cm-searchMatch': {
    backgroundColor: 'var(--flaeche-hervorhebung)',
    outline: '1px solid var(--zweitakzent)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'var(--flaeche-hervorhebung)',
    outline: '2px solid var(--zweitakzent)',
  },
  '.cm-selectionMatch': {
    backgroundColor: 'var(--zweitakzent-weich)',
  },
  '.cm-matchingBracket, &.cm-focused .cm-matchingBracket': {
    backgroundColor: 'var(--akzent-weich)',
    outline: '1px solid var(--akzent)',
  },
  '.cm-nonmatchingBracket, &.cm-focused .cm-nonmatchingBracket': {
    color: 'var(--zustand-fehler)',
  },
  // Falt-Platzhalter wie .falt-marke im Mockup.
  '.cm-foldPlaceholder': {
    backgroundColor: 'var(--flaeche-panel-2)',
    border: 'none',
    color: 'var(--text-3)',
    padding: '0 var(--a1)',
    fontSize: '0.72rem',
  },
  '.cm-foldGutter .cm-gutterElement': {
    cursor: 'pointer',
  },
  // Panels (Suche) im Panel-Look der App.
  '.cm-panels': {
    backgroundColor: 'var(--flaeche-panel)',
    color: 'var(--text-1)',
  },
  '.cm-panels.cm-panels-bottom': {
    borderTop: '1px solid var(--rand-2)',
  },
  '.cm-panel.cm-search': {
    fontFamily: 'var(--schrift-anzeige)',
    fontSize: '0.82rem',
  },
  '.cm-textfield': {
    backgroundColor: 'var(--flaeche-eingabe)',
    border: '1px solid var(--rand-2)',
    borderRadius: 'var(--radius-eingabe)',
    color: 'var(--text-1)',
  },
  '.cm-button': {
    backgroundColor: 'var(--flaeche-panel)',
    backgroundImage: 'none',
    border: '1px solid var(--rand-2)',
    borderRadius: 'var(--radius-knopf)',
    color: 'var(--text-1)',
    cursor: 'pointer',
  },
  '.cm-button:active': {
    backgroundImage: 'none',
    backgroundColor: 'var(--akzent-weich)',
  },
  '.cm-panel.cm-search [name="close"]': {
    color: 'var(--text-2)',
  },
  // Diagnose-Einblendungen der Lint-Erweiterung.
  '.cm-tooltip': {
    backgroundColor: 'var(--flaeche-panel)',
    border: '1px solid var(--rand-2)',
    color: 'var(--text-1)',
  },
  '.cm-diagnostic': {
    fontFamily: 'var(--schrift-anzeige)',
  },
  '.cm-diagnostic-error': {
    borderLeftColor: 'var(--zustand-fehler)',
  },
  '.cm-diagnostic-warning': {
    borderLeftColor: 'var(--zustand-warnung)',
  },
  '.cm-diagnostic-info': {
    borderLeftColor: 'var(--zustand-info)',
  },
})

// Syntaxfarben nach den Typ-Token (entspricht den .sx-*-Klassen des Mockups).
const hervorhebung = HighlightStyle.define([
  { tag: [tags.propertyName, tags.definition(tags.propertyName)], color: 'var(--typ-objekt)' },
  { tag: [tags.string, tags.attributeValue], color: 'var(--typ-text)' },
  { tag: tags.number, color: 'var(--typ-zahl)' },
  { tag: [tags.bool, tags.atom], color: 'var(--typ-bool)' },
  { tag: tags.null, color: 'var(--typ-null)', fontStyle: 'italic' },
  { tag: tags.comment, color: 'var(--typ-kommentar)', fontStyle: 'italic' },
  {
    tag: [tags.bracket, tags.punctuation, tags.separator, tags.angleBracket],
    color: 'var(--text-2)',
  },
  { tag: tags.tagName, color: 'var(--typ-objekt)' },
  { tag: tags.attributeName, color: 'var(--typ-zahl)' },
  { tag: tags.invalid, color: 'var(--zustand-fehler)' },
])

/** Theme plus Syntax-Hervorhebung als eine Extension. */
export const editorTheme: Extension = [basisTheme, syntaxHighlighting(hervorhebung)]
