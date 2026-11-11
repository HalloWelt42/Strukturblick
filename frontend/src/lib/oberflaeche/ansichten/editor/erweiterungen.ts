// Aufbau des Editors aus CodeMirror-Teilen: Aussehen nur aus den Marken (CSS-Variablen, damit Thema und Schriftstufe
// ohne Neuaufbau wirken), deutsche Beschriftungen, Hervorhebung je Sprache des Formats, Rinne wie im Entwurf. Ohne
// Verlauf von CodeMirror: Rückgängig und Wiederholen gehören der Sitzung.

import { Compartment, EditorState, type Extension } from "@codemirror/state";
import {
  crosshairCursor, drawSelection, dropCursor, EditorView, highlightActiveLine, highlightActiveLineGutter, highlightSpecialChars,
  keymap, lineNumbers, rectangularSelection, type KeyBinding,
} from "@codemirror/view";
import { defaultKeymap, indentWithTab } from "@codemirror/commands";
import { bracketMatching, codeFolding, foldGutter, foldKeymap, HighlightStyle, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { highlightSelectionMatches, openSearchPanel, search, searchKeymap } from "@codemirror/search";
import { json } from "@codemirror/lang-json";
import { yaml } from "@codemirror/lang-yaml";
import { tags as t } from "@lezer/highlight";
import { ZEILENTRENNER } from "./abgleich";
import { diagnosenFeld, diagnosenRinne } from "./diagnosen";
import { suchtreffer } from "./suche";

/** Hervorhebung je `format.sprache`; andere Sprachen bleiben ohne. */
const SPRACHEN: Readonly<Record<string, () => Extension>> = { json: () => json(), yaml: () => yaml() };

export const spracheFuer = (sprache: string): Extension => SPRACHEN[sprache]?.() ?? [];

const PHRASEN: Record<string, string> = {
  Find: "Suchen",
  Replace: "Ersetzen",
  next: "weiter",
  previous: "zurück",
  all: "alle",
  "match case": "Groß/klein beachten",
  regexp: "Regulärer Ausdruck",
  "by word": "Ganze Wörter",
  replace: "ersetzen",
  "replace all": "alle ersetzen",
  close: "schließen",
  "current match": "aktueller Treffer",
  "on line": "in Zeile",
  "replaced match on line $": "Treffer in Zeile $ ersetzt",
  "replaced $ matches": "$ Treffer ersetzt",
  "Go to line": "Gehe zu Zeile",
  go: "los",
  "Folded lines": "Zeilen zugeklappt",
  "Unfolded lines": "Zeilen aufgeklappt",
  to: "bis",
  "folded code": "zugeklappter Bereich",
  unfold: "Aufklappen",
  "Fold line": "Zuklappen",
  "Unfold line": "Aufklappen",
  "Control character": "Steuerzeichen",
  "Selection deleted": "Auswahl gelöscht",
};

const HERVORHEBUNG = HighlightStyle.define([
  { tag: [t.propertyName, t.definition(t.propertyName)], color: "var(--typ-schluessel)", fontWeight: "600" },
  { tag: [t.string, t.content, t.special(t.string)], color: "var(--typ-text)" },
  { tag: t.number, color: "var(--typ-zahl)" },
  { tag: t.bool, color: "var(--typ-bool)" },
  { tag: t.null, color: "var(--typ-null)", fontStyle: "italic" },
  { tag: t.brace, color: "var(--typ-objekt)" },
  { tag: t.squareBracket, color: "var(--typ-liste)" },
  { tag: [t.separator, t.punctuation, t.meta], color: "var(--text-3)" },
  { tag: [t.lineComment, t.blockComment, t.comment], color: "var(--text-3)", fontStyle: "italic" },
  { tag: t.labelName, color: "var(--typ-liste)", fontWeight: "600" },
  { tag: [t.typeName, t.keyword, t.attributeValue], color: "var(--typ-objekt)" },
  { tag: t.invalid, color: "var(--fehler)" },
]);

/** Steuerzeichen sichtbar machen, außer "\r" (gehört bei "\r\n" zur Zeile, siehe ZEILENTRENNER). */
const STEUERZEICHEN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u00ad\u061c\u200b\u200e\u200f\u2028\u2029\u202d\u202e\u2066\u2067\u2069\ufeff\ufff9-\ufffc]/gu;

const falte = (offen: boolean): HTMLElement => {
  const i = document.createElement("i");
  i.className = `fa-solid ${offen ? "fa-caret-down" : "fa-caret-right"}`;
  i.title = offen ? "Zuklappen" : "Aufklappen";
  return i;
};

const faltung = codeFolding({
  preparePlaceholder: (state, bereich) => state.doc.lineAt(bereich.to).number - state.doc.lineAt(bereich.from).number,
  placeholderDOM: (_view, aufklappen, zeilen: number) => {
    const s = document.createElement("span");
    s.className = "ed-gefaltet";
    s.title = "Aufklappen";
    s.textContent = zeilen === 1 ? "1 Zeile" : zeilen > 1 ? `${zeilen} Zeilen` : "...";
    s.onclick = aufklappen;
    return s;
  },
});

/** Aussehen nach entwuerfe/editor.html, nur über Marken. */
const AUSSEHEN = EditorView.theme({
  "&": { height: "100%", backgroundColor: "var(--flaeche-panel)", color: "var(--text-1)" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--schrift-mono)", fontSize: "var(--ed-schrift)", lineHeight: "calc(var(--zeile) * 0.78)" },
  ".cm-content": { padding: "0", caretColor: "var(--akzent-flaeche)" },
  ".cm-line": { padding: "0 var(--a5) 0 var(--a3)" },
  ".cm-activeLine": { backgroundColor: "var(--ed-cursorzeile)" },
  ".cm-cursor, .cm-dropCursor": { borderLeft: "2px solid var(--akzent-flaeche)", marginLeft: "-1px" },
  "&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
    backgroundColor: "var(--akzent-weich)",
  },
  ".cm-gutters": { backgroundColor: "var(--flaeche-panel-2)", color: "var(--text-3)", border: "0", boxShadow: "inset -1px 0 0 var(--rand-1)" },
  ".cm-gutterElement": { display: "flex", alignItems: "center" },
  ".cm-lineNumbers .cm-gutterElement": { justifyContent: "flex-end", minWidth: "calc(var(--ed-schrift) * 2.6)", padding: "0 var(--a1)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--text-1)", fontWeight: "600" },
  ".ed-marken .cm-gutterElement, .cm-foldGutter .cm-gutterElement": { justifyContent: "center", width: "1.4em", fontSize: "var(--marke)" },
  ".ed-marken .cm-gutterElement": { paddingLeft: "var(--a1)" },
  ".cm-foldGutter .cm-gutterElement": { cursor: "pointer", paddingRight: "var(--a1)" },
  ".cm-foldGutter .cm-gutterElement:hover": { color: "var(--akzent)" },
  ".cm-gutterElement.ed-mit-fehler": { backgroundColor: "var(--fehler-weich)", color: "var(--fehler)" },
  ".cm-gutterElement.ed-mit-warnung": { backgroundColor: "var(--warn-weich)", color: "var(--warn)" },
  ".cm-gutterElement.ed-mit-hinweis": { color: "var(--akzent)" },
  ".ed-fehler": { textDecoration: "underline wavy var(--fehler)", textDecorationThickness: "2px", textUnderlineOffset: "4px" },
  ".ed-warnung": { textDecoration: "underline wavy var(--warn)", textDecorationThickness: "2px", textUnderlineOffset: "4px" },
  ".ed-hinweis": { textDecoration: "underline dotted var(--akzent)", textDecorationThickness: "2px", textUnderlineOffset: "4px" },
  ".ed-gefaltet": {
    marginLeft: "var(--a2)", padding: "0 6px", background: "var(--mulde)", boxShadow: "var(--vertieft)",
    fontFamily: "var(--schrift)", fontSize: "var(--marke)", color: "var(--text-2)", cursor: "pointer",
  },
  ".cm-matchingBracket": { backgroundColor: "var(--akzent-weich)", color: "var(--text-1)" },
  ".cm-nonmatchingBracket": { backgroundColor: "var(--fehler-weich)", color: "var(--fehler)" },
  ".cm-searchMatch": { backgroundColor: "var(--warn-weich)", outline: "none" },
  ".cm-searchMatch.cm-searchMatch-selected": { backgroundColor: "var(--zweit-weich)", boxShadow: "inset 0 0 0 1px var(--zweit)" },
  ".cm-selectionMatch": { backgroundColor: "var(--akzent-weich)" },
  ".cm-specialChar": { color: "var(--fehler)" },
  ".cm-panels": { backgroundColor: "var(--flaeche-panel-2)", color: "var(--text-1)", fontFamily: "var(--schrift)", fontSize: "var(--klein)" },
  ".cm-panels.cm-panels-top": { borderBottom: "0", boxShadow: "inset 0 -1px 0 var(--rand-1)" },
  ".cm-panels.cm-panels-bottom": { borderTop: "0", boxShadow: "inset 0 1px 0 var(--rand-1)" },
  ".cm-panel.cm-search": { padding: "var(--a2) var(--a3)" },
  ".cm-panel.cm-search label": { fontSize: "var(--klein)", color: "var(--text-2)" },
  ".cm-textfield": {
    backgroundColor: "var(--flaeche-eingabe)", color: "var(--text-1)", border: "0", borderRadius: "0", boxShadow: "var(--vertieft)",
    fontFamily: "var(--schrift-mono)", fontSize: "var(--gross)", padding: "4px var(--a2)",
  },
  ".cm-button": {
    backgroundColor: "var(--flaeche-panel-2)", backgroundImage: "var(--erhaben)", color: "var(--text-1)", border: "0",
    borderRadius: "var(--r-knopf)", boxShadow: "var(--kante)", fontFamily: "var(--schrift)", fontSize: "var(--klein)", padding: "4px var(--a3)",
  },
  ".cm-button:active": { backgroundImage: "none", boxShadow: "var(--vertieft)" },
  ".cm-panel button[name=close]": { color: "var(--text-2)", fontSize: "var(--gross)" },
});

export interface Tastenwege {
  rueckgaengig(): void;
  wiederholen(): void;
  /** Strg/Cmd+F: ins Suchfeld der Werkzeugzeile, mit dem markierten Text als Vorschlag */
  suchen(vorschlag: string): void;
}

function tasten(wege: Tastenwege): readonly KeyBinding[] {
  const tun = (f: () => void) => () => (f(), true);
  return [
    { key: "Mod-z", run: tun(() => wege.rueckgaengig()), preventDefault: true },
    { key: "Mod-Shift-z", run: tun(() => wege.wiederholen()), preventDefault: true },
    { key: "Mod-y", run: tun(() => wege.wiederholen()), preventDefault: true },
    {
      key: "Mod-f",
      run: (view) => {
        const a = view.state.selection.main;
        wege.suchen(a.empty || a.to - a.from > 200 ? "" : view.state.sliceDoc(a.from, a.to));
        return true;
      },
      preventDefault: true,
    },
    { key: "Mod-Alt-f", run: openSearchPanel, preventDefault: true },
  ];
}

/** Rückgängig aus dem Menü des Browsers läuft ebenfalls über die Sitzung. */
const browserVerlauf = (wege: Tastenwege): Extension =>
  EditorView.domEventHandlers({
    beforeinput(e) {
      if (e.inputType === "historyUndo") wege.rueckgaengig();
      else if (e.inputType === "historyRedo") wege.wiederholen();
      else return false;
      e.preventDefault();
      return true;
    },
  });

export interface Aufbau {
  readonly sprache: Compartment;
  readonly erweiterungen: Extension;
}

export function aufbau(sprache: string, wege: Tastenwege, beschriftung: string): Aufbau {
  const fach = new Compartment();
  return {
    sprache: fach,
    erweiterungen: [
      EditorState.lineSeparator.of(ZEILENTRENNER),
      EditorState.phrases.of(PHRASEN),
      EditorState.allowMultipleSelections.of(true),
      EditorView.contentAttributes.of({ "aria-label": beschriftung }),
      diagnosenFeld,
      diagnosenRinne,
      lineNumbers(),
      foldGutter({ markerDOM: falte }),
      faltung,
      highlightActiveLineGutter(),
      highlightSpecialChars({ specialChars: STEUERZEICHEN }),
      drawSelection(),
      dropCursor(),
      indentOnInput(),
      syntaxHighlighting(HERVORHEBUNG),
      bracketMatching(),
      rectangularSelection(),
      crosshairCursor(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      search({ top: true }),
      suchtreffer,
      browserVerlauf(wege),
      keymap.of([...tasten(wege), ...defaultKeymap, ...searchKeymap.filter((b) => b.key !== "Mod-f"), ...foldKeymap, indentWithTab]),
      fach.of(spracheFuer(sprache)),
      AUSSEHEN,
    ],
  };
}
