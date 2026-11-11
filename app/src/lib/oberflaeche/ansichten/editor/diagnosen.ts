// Diagnosen im Editor: Unterstreichung im Text, Zeichen und Farbe in der Rinne. Gesetzt werden sie nur aus einer
// aktuellen Analyse; bis zur nächsten werden sie über die Änderungen abgebildet. Die Abbildung seit dem Setzen bleibt
// erhalten, damit die Liste unter dem Editor an die heutige Stelle springt.

import { ChangeSet, RangeSet, StateEffect, StateField, type ChangeDesc, type EditorState, type Range } from "@codemirror/state";
import { Decoration, EditorView, GutterMarker, gutter, gutterLineClass, type DecorationSet } from "@codemirror/view";
import type { Diagnose, Schwere } from "../../../kern";

export const diagnosenSetzen = StateEffect.define<readonly Diagnose[]>();

interface Diagnosestand {
  readonly liste: readonly Diagnose[];
  /** Änderungen seit dem Setzen; bildet Stellen der Liste auf den heutigen Text ab */
  readonly abbildung: ChangeDesc;
  readonly marken: DecorationSet;
  readonly zeichen: RangeSet<GutterMarker>;
  readonly zeilen: RangeSet<GutterMarker>;
}

const RANG: Record<Schwere, number> = { fehler: 3, warnung: 2, hinweis: 1 };
const SYMBOL: Record<Schwere, string> = { fehler: "fa-circle-xmark", warnung: "fa-triangle-exclamation", hinweis: "fa-circle-info" };
const NAME: Record<Schwere, string> = { fehler: "Fehler", warnung: "Warnung", hinweis: "Hinweis" };

class Zeichen extends GutterMarker {
  constructor(readonly schwere: Schwere, readonly meldung: string) { super(); }
  override eq(o: GutterMarker): boolean { return o instanceof Zeichen && o.schwere === this.schwere && o.meldung === this.meldung; }
  override toDOM(): Node {
    const i = document.createElement("i");
    i.className = `fa-solid ${SYMBOL[this.schwere]}`;
    i.title = `${NAME[this.schwere]}: ${this.meldung}`;
    return i;
  }
}

class Zeilenfarbe extends GutterMarker {
  constructor(readonly schwere: Schwere) {
    super();
    this.elementClass = `ed-mit-${this.schwere}`;
  }
  override eq(o: GutterMarker): boolean { return o instanceof Zeilenfarbe && o.schwere === this.schwere; }
}

const FARBEN: Record<Schwere, Zeilenfarbe> = { fehler: new Zeilenfarbe("fehler"), warnung: new Zeilenfarbe("warnung"), hinweis: new Zeilenfarbe("hinweis") };

/** Stelle innerhalb des Textes; eine leere Spanne wird zu einem Zeichen, damit sie sichtbar bleibt. */
function spanne(d: Diagnose, laenge: number): { von: number; bis: number } | null {
  const von = Math.max(0, Math.min(d.von, laenge));
  let bis = Math.max(von, Math.min(d.bis, laenge));
  if (bis > von) return { von, bis };
  if (bis < laenge) bis++;
  else if (von > 0) return { von: von - 1, bis };
  return bis > von ? { von, bis } : null;
}

function aufbauen(state: EditorState, liste: readonly Diagnose[]): Diagnosestand {
  const laenge = state.doc.length;
  const marken: Range<Decoration>[] = [];
  const jeZeile = new Map<number, Diagnose>();
  for (const d of liste) {
    const s = spanne(d, laenge);
    if (s) marken.push(Decoration.mark({ class: `ed-${d.schwere}`, attributes: { title: d.meldung } }).range(s.von, s.bis));
    const zeile = state.doc.lineAt(Math.min(Math.max(0, d.von), laenge)).from;
    const da = jeZeile.get(zeile);
    if (!da || RANG[d.schwere] > RANG[da.schwere]) jeZeile.set(zeile, d);
  }
  const zeichen: Range<GutterMarker>[] = [];
  const zeilen: Range<GutterMarker>[] = [];
  for (const [zeile, d] of jeZeile) {
    zeichen.push(new Zeichen(d.schwere, d.meldung).range(zeile));
    zeilen.push(FARBEN[d.schwere].range(zeile));
  }
  return {
    liste,
    abbildung: ChangeSet.empty(laenge).desc,
    marken: Decoration.set(marken, true),
    zeichen: RangeSet.of(zeichen, true),
    zeilen: RangeSet.of(zeilen, true),
  };
}

export const diagnosenFeld = StateField.define<Diagnosestand>({
  create: (state) => aufbauen(state, []),
  update(stand, tr) {
    for (const e of tr.effects) if (e.is(diagnosenSetzen)) return aufbauen(tr.state, e.value);
    if (!tr.docChanged) return stand;
    return {
      liste: stand.liste,
      abbildung: stand.abbildung.composeDesc(tr.changes.desc),
      marken: stand.marken.map(tr.changes),
      zeichen: stand.zeichen.map(tr.changes),
      zeilen: stand.zeilen.map(tr.changes),
    };
  },
  provide: (f) => [EditorView.decorations.from(f, (s) => s.marken), gutterLineClass.from(f, (s) => s.zeilen)],
});

/** Heutige Stelle der Diagnose Nummer `i` aus der zuletzt gesetzten Liste. */
export function stelleVon(state: EditorState, i: number): number | null {
  const stand = state.field(diagnosenFeld);
  const d = stand.liste[i];
  if (!d) return null;
  return Math.min(stand.abbildung.mapPos(Math.min(Math.max(0, d.von), stand.abbildung.length)), state.doc.length);
}

class Leerzeichen extends GutterMarker {
  override toDOM(): Node {
    const i = document.createElement("i");
    i.className = `fa-solid ${SYMBOL.fehler}`;
    return i;
  }
}

/** Rinne mit dem Zeichen der schwersten Diagnose je Zeile (vor den Zeilennummern). */
export const diagnosenRinne = gutter({
  class: "ed-marken",
  markers: (v) => v.state.field(diagnosenFeld).zeichen,
  initialSpacer: () => new Leerzeichen(),
});
