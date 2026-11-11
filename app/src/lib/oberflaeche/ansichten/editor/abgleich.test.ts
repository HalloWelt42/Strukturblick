import { describe, expect, it } from "vitest";
import { EditorState, Text, type TransactionSpec } from "@codemirror/state";
import { Sitzung } from "../../../kern";
import { aenderungenAus, changesAus, gleich, ZEILENTRENNER } from "./abgleich";
import { Gesten } from "./gesten";

/** Editorzustand wie im Editor (nur "\n" trennt Zeilen) neben einer Sitzung, abgeglichen wie in der Steuerung. */
function paar(text: string) {
  const sitzung = new Sitzung(text);
  let state = EditorState.create({ doc: text, extensions: EditorState.lineSeparator.of(ZEILENTRENNER) });
  let eigenes = false;
  sitzung.beobachten((e) => {
    if (eigenes) return;
    state = state.update({ changes: changesAus(e.aenderungen, state.doc.length) }).state;
  });
  return {
    sitzung,
    get state() { return state; },
    tippen(spec: TransactionSpec, geste = "g") {
      const tr = state.update(spec);
      state = tr.state;
      eigenes = true;
      const e = sitzung.ausfuehren("text.aendern", { aenderungen: aenderungenAus(tr.changes) }, { ort: "Editor", geste });
      eigenes = false;
      expect(e.ok).toBe(true);
    },
  };
}

describe("Abgleich Editor und Sitzung", () => {
  it("Getipptes landet als text.aendern in der Sitzung, Rückgängig kommt als Ereignis zurück", () => {
    const p = paar('{"a": 1}');
    p.tippen({ changes: { from: 7, insert: ', "b": 2' } }, "eins");
    p.tippen({ changes: { from: 15, insert: "3" } }, "eins");
    expect(p.sitzung.text).toBe('{"a": 1, "b": 23}');
    expect(gleich(p.state.doc, p.sitzung.text)).toBe(true);
    expect(p.sitzung.verlauf.eintraege).toHaveLength(1);

    p.sitzung.rueckgaengig();
    expect(p.sitzung.text).toBe('{"a": 1}');
    expect(gleich(p.state.doc, p.sitzung.text)).toBe(true);
    p.sitzung.wiederholen();
    expect(p.state.doc.toString()).toBe('{"a": 1, "b": 23}');
  });

  it("mehrere Änderungen einer Transaktion beziehen sich auf den Text davor", () => {
    const p = paar("abc\ndef");
    p.tippen({ changes: [{ from: 0, to: 1, insert: "X" }, { from: 4, insert: "Y\nZ" }, { from: 7, to: 7, insert: "!" }] });
    expect(p.sitzung.text).toBe("Xbc\nY\nZdef!");
    expect(gleich(p.state.doc, p.sitzung.text)).toBe(true);
  });

  it("behält \\r\\n und Zeichen außerhalb der Grundebene mit gleichen Stellen", () => {
    const text = 'a: "\u{1F600}"\r\nb: 2\r\n';
    const p = paar(text);
    expect(p.state.doc.length).toBe(text.length);
    expect(p.state.doc.lines).toBe(3);
    p.tippen({ changes: { from: text.indexOf("2"), to: text.indexOf("2") + 1, insert: "3\r\nc: 4" } });
    expect(p.sitzung.text).toBe('a: "\u{1F600}"\r\nb: 3\r\nc: 4\r\n');
    expect(gleich(p.state.doc, p.sitzung.text)).toBe(true);
  });

  it("übernimmt Änderungen aus anderen Quellen genau", () => {
    const p = paar("x = 1\ny = 2\n");
    p.sitzung.ausfuehren("text.ersetzen", { text: "neu\r\n" }, { ort: "Tabelle" });
    expect(p.state.doc.toString()).toBe("neu\r\n");
    expect(gleich(p.state.doc, p.sitzung.text)).toBe(true);
  });

  it("gleich erkennt jede Abweichung", () => {
    const doc = Text.of(["ab", "cd"]);
    expect(gleich(doc, "ab\ncd")).toBe(true);
    expect(gleich(doc, "ab\ncx")).toBe(false);
    expect(gleich(doc, "ab\ncde")).toBe(false);
    expect(gleich(doc, "abXcd")).toBe(false);
  });

  it("changesAus wirft bei Änderungen außerhalb des Textes", () => {
    expect(() => changesAus([{ von: 2, bis: 9, einfuegen: "" }], 5)).toThrow(RangeError);
  });
});

describe("Gesten", () => {
  const zaehler = () => {
    let n = 0;
    return () => `g${++n}`;
  };

  it("Tippen in einem Zug bleibt eine Geste, nach einer Pause beginnt eine neue", () => {
    const g = new Gesten(1000, zaehler());
    expect(g.fuer(0, false)).toBe("g1");
    expect(g.fuer(900, false)).toBe("g1");
    expect(g.fuer(1800, false)).toBe("g1");
    expect(g.fuer(2801, false)).toBe("g2");
  });

  it("Cursorsprung und Einfügen beginnen neu", () => {
    const g = new Gesten(1000, zaehler());
    expect(g.fuer(0, false)).toBe("g1");
    g.abbrechen();
    expect(g.fuer(10, false)).toBe("g2");
    expect(g.fuer(20, true)).toBe("g3");
    expect(g.fuer(30, false)).toBe("g4");
  });
});
