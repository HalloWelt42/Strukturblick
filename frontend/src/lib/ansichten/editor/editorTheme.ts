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
  // Such-Panel im App-Look: bequeme Innenabstände, umbruchfähige Zeile,
  // Platz für das Schließen-Kreuz oben rechts.
  '.cm-panel.cm-search': {
    fontFamily: 'var(--schrift-anzeige)',
    fontSize: '0.82rem',
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 'var(--a2)',
    padding: 'var(--a2) var(--a5) var(--a2) var(--a3)',
    position: 'relative',
  },
  // Eingabefelder deutlich größer und breiter; das Suchfeld extra breit.
  '.cm-textfield': {
    backgroundColor: 'var(--flaeche-eingabe)',
    border: '1px solid var(--rand-2)',
    borderRadius: 'var(--radius-eingabe)',
    color: 'var(--text-1)',
    fontFamily: 'var(--schrift-anzeige)',
    fontSize: '0.82rem',
    height: '28px',
    padding: '0 var(--a2)',
    margin: '0',
  },
  '.cm-textfield:focus, .cm-textfield:focus-visible': {
    outline: '2px solid var(--akzent)',
    outlineOffset: '-1px',
    borderColor: 'var(--akzent)',
  },
  '.cm-panel.cm-search .cm-textfield[name="search"]': {
    minWidth: '220px',
  },
  '.cm-panel.cm-search .cm-textfield[name="replace"]': {
    minWidth: '180px',
  },
  '.cm-button': {
    backgroundColor: 'var(--flaeche-panel)',
    backgroundImage: 'none',
    border: '1px solid var(--rand-2)',
    borderRadius: 'var(--radius-knopf)',
    color: 'var(--text-1)',
    fontFamily: 'var(--schrift-anzeige)',
    fontSize: '0.8rem',
    height: '28px',
    padding: '0 var(--a2)',
    margin: '0',
    cursor: 'pointer',
  },
  '.cm-button:hover': {
    backgroundColor: 'var(--akzent-weich)',
  },
  '.cm-button:active': {
    backgroundImage: 'none',
    backgroundColor: 'var(--akzent-weich)',
  },
  '.cm-button:focus-visible': {
    outline: '2px solid var(--akzent)',
    outlineOffset: '-1px',
  },
  // Checkbox-Labels ("match case", "regexp", "by word") kompakt und gedämpft.
  '.cm-panel.cm-search label': {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--a1)',
    color: 'var(--text-2)',
    fontFamily: 'var(--schrift-anzeige)',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
  },
  '.cm-panel.cm-search label input[type="checkbox"]': {
    accentColor: 'var(--akzent)',
    margin: '0',
    cursor: 'pointer',
  },
  // Schließen-Kreuz: ordentliche Klickfläche, gut sichtbar, oben rechts.
  '.cm-panel.cm-search [name="close"]': {
    position: 'absolute',
    top: '50%',
    right: 'var(--a2)',
    transform: 'translateY(-50%)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    padding: '0',
    border: '1px solid transparent',
    borderRadius: 'var(--radius-knopf)',
    background: 'none',
    color: 'var(--text-1)',
    fontSize: '1.1rem',
    lineHeight: '1',
    cursor: 'pointer',
  },
  '.cm-panel.cm-search [name="close"]:hover': {
    backgroundColor: 'var(--akzent-weich)',
    color: 'var(--text-1)',
  },
  '.cm-panel.cm-search [name="close"]:focus-visible': {
    outline: '2px solid var(--akzent)',
    outlineOffset: '-1px',
  },
  // Trefferzähler-Zeile unter dem Such-Panel.
  '.cm-treffer-zaehler': {
    padding: 'var(--a1) var(--a3)',
    fontFamily: 'var(--schrift-anzeige)',
    fontSize: '0.78rem',
    color: 'var(--text-2)',
    borderTop: '1px solid var(--rand-1)',
    backgroundColor: 'var(--flaeche-panel-2)',
  },
  '.cm-treffer-zaehler:empty': {
    display: 'none',
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
