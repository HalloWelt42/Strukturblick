// Steuerung des Editors: hält CodeMirror und die Sitzung des Blatts gleich, ohne eigenen Verlauf. Der Text hat eine
// Wahrheit, die Sitzung: Getipptes geht als Befehl "text.aendern" dorthin, Änderungen aus anderen Quellen (Tabelle,
// Baum, Rückgängig) kommen als Ereignis zurück und werden genau so übernommen. Am Ende muss der Editortext dem Text der
// Sitzung gleichen; weicht er ab, wird er neu gesetzt und das in der Konsole gemeldet.

import { Annotation, EditorSelection, EditorState, type Transaction } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { KEIN, knotenAn, knotenZu, zeigerVon, type Analyse, type Ereignis } from "../../../kern";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
import { aenderungenAus, changesAus, gleich } from "./abgleich";
import { diagnosenSetzen, stelleVon } from "./diagnosen";
import type { EditorZustand } from "./editorZustand.svelte";
import { aufbau, spracheFuer, type Aufbau } from "./erweiterungen";
import { Gesten } from "./gesten";
import { anfrageFuer, weitersuchen } from "./suche";

/** Markiert Transaktionen, die nicht vom Tippen kommen (Sitzung, Analyse, Sprung von außen); sie gehen nicht zurück. */
const vonAussen = Annotation.define<true>();

/** Eigene Gesten: Einfügen, Ablegen und Ausschneiden sind je ein Verlaufsschritt. */
const EINZELN = ["input.paste", "input.drop", "delete.cut", "move.drop"];

/** Unter dem Editor stehen höchstens so viele Befunde; die Zahlen im Kopf nennen alle. */
export const BEFUNDE_HOECHSTENS = 200;

/** Der volle Vergleich mit der Sitzung läuft einmal nach einer Folge von Änderungen. */
const VERGLEICH_NACH_MS = 300;

export interface Rueckwege {
  /** Strg/Cmd+F: ins Suchfeld der Werkzeugzeile */
  suchen(vorschlag: string): void;
}

export class Editorsteuerung {
  readonly view: EditorView;
  private readonly aufbau: Aufbau;
  private readonly gesten = new Gesten();
  private readonly abmelden: () => void;
  /** true, solange das eigene Tippen in der Sitzung ausgeführt wird (deren Ereignis kommt dabei sofort) */
  private eigenes = false;
  /** Revision, deren ganzer Text schon im Editor steht (nach neuSetzen) */
  private stand = -1;
  private sprache: string;
  private letzteAnalyse: Analyse | null = null;
  /** Zuletzt mit dem Blatt abgeglichenes Gewähltes; verhindert, dass der eigene Wunsch als Sprung zurückkommt */
  private eigenerZeiger: string | null;
  private ausstehend: string | null = null;
  private vergleichZeit: ReturnType<typeof setTimeout> | null = null;
  private zerstoert = false;

  constructor(wirt: HTMLElement, private readonly blatt: Arbeitsblatt, private readonly z: EditorZustand, wege: Rueckwege) {
    const text = blatt.sitzung.text;
    this.sprache = blatt.analyse?.format.sprache ?? "";
    this.aufbau = aufbau(this.sprache, { rueckgaengig: () => blatt.rueckgaengig(), wiederholen: () => blatt.wiederholen(), suchen: wege.suchen }, blatt.name);
    const auswahl = EditorSelection.single(Math.min(z.anker, text.length), Math.min(z.kopf, text.length));
    this.view = new EditorView({
      parent: wirt,
      state: EditorState.create({ doc: text, selection: auswahl, extensions: this.aufbau.erweiterungen }),
      dispatchTransactions: (trs, view) => this.verteilen(trs, view),
    });
    this.stand = blatt.sitzung.revision;
    this.eigenerZeiger = z.zeiger;
    this.abmelden = blatt.beobachten((e) => this.uebernehmen(e));
    const oben = Math.min(z.oben, text.length);
    this.view.dispatch({ effects: [anfrageFuer(z.suche), ...(oben > 0 ? [EditorView.scrollIntoView(oben, { y: "start" })] : [])], annotations: vonAussen.of(true) });
    this.cursorGewandert(false);
  }

  // ----- Editor -> Sitzung -------------------------------------------------------------------------------------------

  private verteilen(trs: readonly Transaction[], view: EditorView): void {
    view.update(trs);
    let bewegt = false;
    let vonHand = false;
    for (const tr of trs) {
      if (tr.docChanged || tr.selection) bewegt = true;
      if (tr.annotation(vonAussen)) continue;
      if (tr.docChanged) this.melden(tr);
      else if (tr.selection) {
        this.gesten.abbrechen(); // Cursorsprung
        vonHand = true;
      }
    }
    if (bewegt) this.cursorGewandert(vonHand);
  }

  private melden(tr: Transaction): void {
    const geste = this.gesten.fuer(Date.now(), EINZELN.some((art) => tr.isUserEvent(art)));
    // text.aendern braucht keine Analyse; die Sitzung führt ihn sofort aus und meldet ihr Ereignis noch in diesem Aufruf.
    this.eigenes = true;
    try {
      void this.blatt.ausfuehren("text.aendern", { aenderungen: aenderungenAus(tr.changes) }, { ort: "Editor", geste });
    } finally {
      this.eigenes = false;
    }
    this.vergleichPlanen();
  }

  // ----- Sitzung -> Editor -------------------------------------------------------------------------------------------

  private uebernehmen(e: Ereignis): void {
    if (this.eigenes || this.zerstoert || e.revision <= this.stand) return;
    this.gesten.abbrechen();
    try {
      this.view.dispatch({ changes: changesAus(e.aenderungen, this.view.state.doc.length), annotations: vonAussen.of(true) });
    } catch (f) {
      this.neuSetzen(`Änderung aus ${e.ort} passt nicht: ${f instanceof Error ? f.message : String(f)}`);
      return;
    }
    this.vergleichPlanen();
  }

  /** Länge sofort (nach allen Ereignissen dieses Aufrufs), Inhalt einmal nach einer Folge von Änderungen. */
  private vergleichPlanen(): void {
    queueMicrotask(() => {
      if (!this.zerstoert && this.view.state.doc.length !== this.blatt.sitzung.text.length) this.neuSetzen("Länge weicht ab");
    });
    if (this.vergleichZeit) clearTimeout(this.vergleichZeit);
    this.vergleichZeit = setTimeout(() => {
      this.vergleichZeit = null;
      if (!this.zerstoert && !gleich(this.view.state.doc, this.blatt.sitzung.text)) this.neuSetzen("Inhalt weicht ab");
    }, VERGLEICH_NACH_MS);
  }

  private neuSetzen(grund: string): void {
    console.warn(`Editor: Der Text weicht von der Sitzung ab (${grund}); er wird neu gesetzt.`);
    const text = this.blatt.sitzung.text;
    this.stand = this.blatt.sitzung.revision;
    const kopf = Math.min(this.view.state.selection.main.head, text.length);
    this.view.dispatch({ changes: { from: 0, to: this.view.state.doc.length, insert: text }, selection: { anchor: kopf }, annotations: vonAussen.of(true) });
  }

  // ----- Cursor und Gewähltes ----------------------------------------------------------------------------------------

  private cursorGewandert(vonHand: boolean): void {
    const { anchor, head } = this.view.state.selection.main;
    const zeile = this.view.state.doc.lineAt(head);
    this.z.anker = anchor;
    this.z.kopf = head;
    this.z.zeile = zeile.number;
    this.z.spalte = head - zeile.from + 1;
    if (vonHand) this.waehlenAnCursor();
  }

  /** Knoten unter dem Cursor wählen; nur mit der Analyse dieser Revision, sonst stimmen die Stellen nicht. */
  private waehlenAnCursor(): void {
    const a = this.blatt.analyse;
    if (!this.blatt.aktuell || !a?.index) return;
    const k = knotenAn(a.index, this.view.state.selection.main.head);
    if (k === KEIN) return;
    const zeiger = zeigerVon(a.index, this.blatt.sitzung.text, k);
    this.eigenerZeiger = zeiger;
    this.blatt.waehlen(zeiger);
  }

  /** Das Gewählte hat sich geändert; kam es nicht vom Editor, springt der Cursor an den Wert (sobald die Analyse passt). */
  gewaehltVonAussen(zeiger: string | null): void {
    if (zeiger === this.eigenerZeiger) return;
    this.eigenerZeiger = zeiger;
    this.ausstehend = zeiger;
    this.ausstehendAnwenden();
  }

  private ausstehendAnwenden(): boolean {
    const zeiger = this.ausstehend;
    const a = this.blatt.analyse;
    if (zeiger === null || !this.blatt.aktuell || !a?.index) return false;
    this.ausstehend = null;
    const k = knotenZu(a.index, this.blatt.sitzung.text, zeiger);
    if (k === KEIN) return false;
    const pos = Math.min(a.index.von[k], this.view.state.doc.length);
    this.gesten.abbrechen();
    this.view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: "center" }), annotations: vonAussen.of(true) });
    return true;
  }

  // ----- Analyse -----------------------------------------------------------------------------------------------------

  /** Neue Analyse der aktuellen Revision: Diagnosen setzen, Befunde zeigen, ausstehenden Sprung ausführen. */
  analyseNeu(a: Analyse): void {
    if (a === this.letzteAnalyse || a.revision !== this.blatt.sitzung.revision) return;
    this.letzteAnalyse = a;
    this.view.dispatch({ effects: diagnosenSetzen.of(a.diagnosen), annotations: vonAussen.of(true) });
    this.befundeZeigen(a);
    if (!this.ausstehendAnwenden() && this.view.hasFocus) this.waehlenAnCursor();
  }

  private befundeZeigen(a: Analyse): void {
    const doc = this.view.state.doc;
    let fehler = 0;
    let warnungen = 0;
    for (const d of a.diagnosen) {
      if (d.schwere === "fehler") fehler++;
      else if (d.schwere === "warnung") warnungen++;
    }
    this.z.zahlen = { fehler, warnungen, hinweise: a.diagnosen.length - fehler - warnungen };
    this.z.befunde = a.diagnosen.slice(0, BEFUNDE_HOECHSTENS).map((d, nummer) => {
      const pos = Math.min(Math.max(0, d.von), doc.length);
      const zeile = doc.lineAt(pos);
      return { nummer, schwere: d.schwere, meldung: d.meldung, zeile: zeile.number, spalte: pos - zeile.from + 1 };
    });
  }

  /** Zur heutigen Stelle eines Befunds springen (über die Änderungen seit der Analyse abgebildet). */
  zuBefund(nummer: number): void {
    const pos = stelleVon(this.view.state, nummer);
    if (pos === null) return;
    this.view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: "center" }) });
    this.view.focus();
  }

  sprachwahl(sprache: string): void {
    if (sprache === this.sprache) return;
    this.sprache = sprache;
    this.view.dispatch({ effects: this.aufbau.sprache.reconfigure(spracheFuer(sprache)), annotations: vonAussen.of(true) });
  }

  // ----- Suche und Anzeige -------------------------------------------------------------------------------------------

  suchen(text: string): void {
    this.view.dispatch({ effects: anfrageFuer(text), annotations: vonAussen.of(true) });
  }

  weitersuchen(rueckwaerts: boolean): void {
    weitersuchen(this.view, rueckwaerts);
  }

  /** Schriftstufe gewechselt: Die Größe kommt aus CSS-Variablen, CodeMirror misst nur neu. */
  neuMessen(): void {
    this.view.requestMeasure();
  }

  zerstoeren(): void {
    this.zerstoert = true;
    this.abmelden();
    if (this.vergleichZeit) clearTimeout(this.vergleichZeit);
    this.z.oben = this.view.lineBlockAtHeight(this.view.scrollDOM.scrollTop).from;
    this.z.zeiger = this.blatt.gewaehlt;
    this.view.destroy();
  }
}
