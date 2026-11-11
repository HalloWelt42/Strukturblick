// Suche aus der Werkzeugzeile: setzt die Suchanfrage des Editors und hebt die Treffer im sichtbaren Bereich hervor.
// Die ausführliche Suche mit Ersetzen (Leiste von CodeMirror, deutsch beschriftet) bleibt erreichbar; ist sie offen,
// hebt sie selbst hervor.

import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, ViewPlugin, type DecorationSet, type EditorView, type ViewUpdate } from "@codemirror/view";
import { findNext, findPrevious, getSearchQuery, SearchQuery, searchPanelOpen, setSearchQuery } from "@codemirror/search";

/** Höchstens so viele Treffer werden je Bild markiert (sehr häufige Treffer in großen Texten). */
const TREFFER_HOECHSTENS = 2000;
const treffer = Decoration.mark({ class: "cm-searchMatch" });
const gewaehlterTreffer = Decoration.mark({ class: "cm-searchMatch cm-searchMatch-selected" });

function markieren(view: EditorView): DecorationSet {
  const anfrage = getSearchQuery(view.state);
  if (!anfrage.valid || searchPanelOpen(view.state)) return Decoration.none;
  const b = new RangeSetBuilder<Decoration>();
  const auswahl = view.state.selection.main;
  let zahl = 0;
  for (const { from, to } of view.visibleRanges) {
    const zeiger = anfrage.getCursor(view.state, from, to);
    for (let t = zeiger.next(); !t.done && zahl < TREFFER_HOECHSTENS; t = zeiger.next(), zahl++) {
      const { from: von, to: bis } = t.value;
      b.add(von, bis, von === auswahl.from && bis === auswahl.to ? gewaehlterTreffer : treffer);
    }
  }
  return b.finish();
}

export const suchtreffer = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = markieren(view);
    }
    update(u: ViewUpdate): void {
      const anders = getSearchQuery(u.state) !== getSearchQuery(u.startState) || searchPanelOpen(u.state) !== searchPanelOpen(u.startState);
      if (anders || u.docChanged || u.selectionSet || u.viewportChanged) this.decorations = markieren(u.view);
    }
  },
  { decorations: (p) => p.decorations },
);

/** Suchanfrage aus der Werkzeugzeile: wörtlich, ohne Groß- und Kleinschreibung. */
export const anfrageFuer = (text: string): ReturnType<typeof setSearchQuery.of> =>
  setSearchQuery.of(new SearchQuery({ search: text, caseSensitive: false, literal: true }));

/** Zum nächsten oder vorigen Treffer; ohne Suchtext geschieht nichts (statt die Leiste zu öffnen). */
export function weitersuchen(view: EditorView, rueckwaerts: boolean): void {
  if (!getSearchQuery(view.state).valid) return;
  (rueckwaerts ? findPrevious : findNext)(view);
}
