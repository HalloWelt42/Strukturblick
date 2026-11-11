// Das Ausdrucksfeld der Abfrage aus CodeMirror-Teilen: Zeilennummern, Hervorhebung in den Farben des Entwurfs
// (af-s-*), Ergänzung (SQL: Tabellen und Spalten, jq: Schlüssel des Dokuments) und die Fehlerstelle wie im Entwurf
// entwuerfe/abfrage-fehler.html: Kästchen am Zeichen, Blase darunter.

import { Compartment, EditorState, StateEffect, StateField, type Extension, type Range } from "@codemirror/state";
import { Decoration, EditorView, highlightActiveLine, highlightActiveLineGutter, keymap, lineNumbers, placeholder, WidgetType, type DecorationSet } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { acceptCompletion, autocompletion, completionKeymap, type CompletionSource } from "@codemirror/autocomplete";
import { sql, SQLite } from "@codemirror/lang-sql";
import { tags as t } from "@lezer/highlight";

// ----- jq als einfache Stromsprache ----------------------------------------------------------------------------------

const JQ_WOERTER = new Set(["def", "if", "then", "elif", "else", "end", "as", "reduce", "foreach", "try", "catch", "label", "import", "include", "and", "or", "not", "__loc__"]);

const jqSprache = StreamLanguage.define<null>({
  token(s) {
    if (s.eatSpace()) return null;
    if (s.match(/^#.*/)) return "comment";
    if (s.match(/^"(?:[^"\\]|\\.)*"?/)) return "string";
    if (s.match(/^\.[A-Za-z_][\w]*/) || s.match(/^\.(?=[[\s|,)}]|$)/)) return "propertyName";
    if (s.match(/^\$[A-Za-z_][\w]*/)) return "variableName";
    if (s.match(/^-?\d+(\.\d+)?([eE][-+]?\d+)?/)) return "number";
    const wort = s.match(/^[A-Za-z_][\w]*/) as RegExpMatchArray | null;
    if (wort) return JQ_WOERTER.has(wort[0]) ? "keyword" : wort[0] === "true" || wort[0] === "false" || wort[0] === "null" ? "atom" : "variableName.function";
    if (s.match(/^(\/\/=?|\|=|[|,=<>!+\-*/%?:;]=?)/)) return "operator";
    s.next();
    return "bracket";
  },
});

const FARBEN = HighlightStyle.define([
  { tag: [t.propertyName, t.variableName, t.name], class: "af-s-feld" },
  { tag: t.function(t.variableName), class: "af-s-fn" },
  { tag: [t.keyword, t.typeName, t.atom, t.bool, t.null], class: "af-s-wort" },
  { tag: [t.operator, t.compareOperator, t.logicOperator, t.arithmeticOperator], class: "af-s-op" },
  { tag: [t.bracket, t.paren, t.brace, t.squareBracket, t.punctuation, t.separator], class: "af-s-klammer" },
  { tag: [t.string, t.special(t.string)], class: "w-text" },
  { tag: t.number, class: "w-zahl" },
  { tag: t.comment, color: "var(--text-3)", fontStyle: "italic" },
]);

// ----- Fehlerstelle --------------------------------------------------------------------------------------------------

export interface Fehlerstelle {
  readonly meldung: string;
  readonly zeile: number;
  readonly spalte: number;
}

export const fehlerSetzen = StateEffect.define<Fehlerstelle | null>();

class Blase extends WidgetType {
  constructor(readonly meldung: string, readonly spalte: number) {
    super();
  }
  override eq(b: Blase): boolean {
    return b.meldung === this.meldung && b.spalte === this.spalte;
  }
  override toDOM(): HTMLElement {
    const huelle = document.createElement("div");
    huelle.className = "af-blase-zeile";
    huelle.style.setProperty("--spalte", String(Math.max(0, this.spalte - 1)));
    const blase = huelle.appendChild(document.createElement("span"));
    blase.className = "af-blase";
    blase.setAttribute("role", "alert");
    blase.textContent = this.meldung;
    return huelle;
  }
}

const fehlerFeld = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(alt, tr) {
    let deko = alt.map(tr.changes);
    for (const e of tr.effects) {
      if (!e.is(fehlerSetzen)) continue;
      if (!e.value) {
        deko = Decoration.none;
        continue;
      }
      const doc = tr.state.doc;
      const zeile = doc.line(Math.min(Math.max(1, e.value.zeile), doc.lines));
      const von = Math.min(zeile.from + Math.max(0, e.value.spalte - 1), zeile.to);
      const teile: Range<Decoration>[] = [
        Decoration.widget({ widget: new Blase(e.value.meldung, e.value.spalte), block: true, side: 1 }).range(zeile.to),
      ];
      if (von < zeile.to) teile.push(Decoration.mark({ class: "af-fehlerzeichen" }).range(von, von + 1));
      deko = Decoration.set(teile, true);
    }
    return deko;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// ----- Aussehen ------------------------------------------------------------------------------------------------------

/** Wie der Haupteditor nur aus den Marken; die Blase rückt höchstens bis zur Mitte ein und behält ihre Breite */
const AUSSEHEN = EditorView.theme({
  "&": { height: "100%", backgroundColor: "transparent" },
  "&.cm-focused": { outline: "none" },
  ".cm-scroller": { fontFamily: "var(--schrift-mono)", lineHeight: "1.6" },
  ".cm-content": { padding: "var(--a2) 0", caretColor: "var(--akzent)" },
  ".cm-gutters": { backgroundColor: "transparent", border: "0", color: "var(--text-3)", fontSize: "var(--klein)" },
  ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "var(--flaeche-wechsel)" },
  ".cm-activeLineGutter": { color: "var(--text-1)" },
  ".cm-cursor": { borderLeft: "2px solid var(--akzent)", marginLeft: "-1px" },
  ".cm-placeholder": { color: "var(--text-3)" },
  ".af-blase-zeile": { paddingLeft: "min(calc(var(--spalte, 0) * 1ch), 50%)" },
  ".af-blase": { width: "max-content", maxWidth: "100%" },
  ".cm-tooltip-autocomplete": { backgroundColor: "var(--flaeche-panel)", boxShadow: "var(--kante), var(--schatten-schwebend)", border: "0", fontFamily: "var(--schrift-mono)", fontSize: "var(--klein)" },
  ".cm-tooltip-autocomplete li[aria-selected]": { backgroundColor: "var(--akzent-weich)", color: "var(--text-1)" },
});

// ----- Aufbau --------------------------------------------------------------------------------------------------------

export type Hervorhebung = "jq" | "sql" | "text";

export interface Feldaufbau {
  readonly hervorhebung: Hervorhebung;
  readonly beispiel: string;
  /** SQL: Tabellen mit Spalten für die Ergänzung */
  readonly schema: Readonly<Record<string, readonly string[]>>;
  /** jq: Schlüssel des Dokuments für die Ergänzung nach einem Punkt */
  readonly schluessel: () => readonly string[];
}

export const sprachFach = new Compartment();

const jqErgaenzung = (schluessel: () => readonly string[]): CompletionSource => (ctx) => {
  const vor = ctx.matchBefore(/\.[\p{L}\w]*/u);
  if (!vor || (vor.from === vor.to && !ctx.explicit)) return null;
  return { from: vor.from + 1, options: schluessel().map((label) => ({ label, type: "property" })), validFor: /^[\p{L}\w]*$/u };
};

export function sprachTeile(a: Feldaufbau): Extension {
  const fuerSprache =
    a.hervorhebung === "sql"
      ? [sql({ dialect: SQLite, schema: Object.fromEntries(Object.entries(a.schema).map(([k, v]) => [k, [...v]])), upperCaseKeywords: true }), autocompletion({ icons: false })]
      : a.hervorhebung === "jq"
        ? [jqSprache, autocompletion({ icons: false, override: [jqErgaenzung(a.schluessel)] })]
        : [];
  return [fuerSprache, placeholder(a.beispiel)];
}

export function feldErweiterungen(a: Feldaufbau, aktionen: { aenderung: (text: string) => void; uebernehmen: () => void; zuklappen: () => void }): Extension {
  return [
    AUSSEHEN,
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    history(),
    syntaxHighlighting(FARBEN),
    fehlerFeld,
    sprachFach.of(sprachTeile(a)),
    keymap.of([
      { key: "Mod-Enter", run: () => (aktionen.uebernehmen(), true) },
      { key: "Tab", run: acceptCompletion },
      ...completionKeymap,
      { key: "Escape", run: () => (aktionen.zuklappen(), true) },
      ...historyKeymap,
      ...defaultKeymap,
    ]),
    EditorView.lineWrapping,
    EditorView.updateListener.of((u) => {
      if (u.docChanged) aktionen.aenderung(u.state.doc.toString());
    }),
    EditorView.contentAttributes.of({ spellcheck: "false", autocapitalize: "off", autocorrect: "off" }),
  ];
}

export const feldZustand = (text: string, erweiterungen: Extension): EditorState => EditorState.create({ doc: text, extensions: erweiterungen });
