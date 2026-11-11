// YAML lesen: Die Bibliothek `yaml` (Core-Schema 1.2) liefert Knoten mit Bereichen im Text; daraus entsteht der
// Strukturindex in Textreihenfolge. Werte werden nie umgewandelt: Zahlen, Wahrheitswerte und null bleiben Rohtext,
// nur abweichende Texte (Escapes, gefaltete und Block-Texte) stehen dekodiert daneben.

import { LineCounter, isAlias, isMap, isNode, isPair, isScalar, isSeq, parseAllDocuments, Scalar, type Document, type Pair, type YAMLError } from "yaml";
import { IndexBauer, KEIN, KnotenArt, type Strukturindex } from "../../kern/strukturindex";
import type { Diagnose, Leseergebnis } from "../vertrag";
import { meldungZu } from "./meldungen";

interface Spanne {
  readonly von: number;
  readonly bis: number;
  readonly dekodiert?: string;
}

/** Was ein Anker beschreibt, damit ein späterer Alias Art und Inhalt übernehmen kann. */
interface AnkerZiel {
  readonly art: KnotenArt;
  readonly inhalt: string | null;        // nur bei einfachen Werten
  readonly von: number;
}

function artVonWert(wert: unknown): KnotenArt {
  if (typeof wert === "number" || typeof wert === "bigint") return KnotenArt.zahl;
  if (typeof wert === "boolean") return KnotenArt.wahrheitswert;
  if (wert === null) return KnotenArt.nichts;
  return KnotenArt.text;
}

class YamlLeser {
  private readonly bauer = new IndexBauer();
  private readonly diagnosen: Diagnose[] = [];
  private anker = new Map<string, AnkerZiel>();

  /** Zeilenanfänge erst bei Bedarf (Hinweise zu Aliasen), damit großer Text ohne Aliase nichts dafür zahlt. */
  private zeilen: LineCounter | null = null;

  constructor(private readonly text: string) {}

  private grenze(p: number): number {
    return Math.max(0, Math.min(p, this.text.length));
  }

  private melden(schwere: Diagnose["schwere"], meldung: string, von: number, bis: number): void {
    const a = this.grenze(von);
    this.diagnosen.push({ schwere, meldung, von: a, bis: Math.max(a, this.grenze(bis)) });
  }

  private zeile(p: number): number {
    if (this.zeilen === null) {
      const zeilen = new LineCounter();
      zeilen.addNewLine(0);
      for (let i = this.text.indexOf("\n"); i !== -1; i = this.text.indexOf("\n", i + 1)) zeilen.addNewLine(i + 1);
      this.zeilen = zeilen;
    }
    return this.zeilen.linePos(p).line;
  }

  /** Steht `wert` genau so im Text zwischen von und bis? (ohne Teilstring anzulegen) */
  private steht(wert: string, von: number, bis: number): boolean {
    return wert.length === bis - von && this.text.startsWith(wert, von);
  }

  /** Bereich [Anfang, Ende des Werts) eines Knotens, auf den Text begrenzt. */
  private bereich(knoten: { range?: [number, number, number] | null }, ersatz: number): [number, number] {
    const r = knoten.range;
    if (!r) return [ersatz, ersatz];
    const von = this.grenze(r[0]);
    return [von, Math.max(von, this.grenze(r[1]))];
  }

  dokumente(docs: readonly Document.Parsed[]): void {
    if (docs.length === 0) {
      this.bauer.blatt(KnotenArt.nichts, KEIN, 0, 0);
      return;
    }
    if (docs.length === 1) {
      this.dokument(docs[0], KEIN);
      return;
    }
    const von = this.grenze(docs[0].range[0]);
    const wurzel = this.bauer.knoten(KnotenArt.liste, KEIN, von);
    for (const doc of docs) this.dokument(doc, wurzel);
    this.bauer.schliessen(wurzel, Math.max(von, this.grenze(docs[docs.length - 1].range[1])));
    const zweites = this.grenze(docs[1].range[0]);
    this.melden("hinweis", `Der Text enthält ${docs.length} Dokumente; die Wurzel ist die Liste der Dokumente`, zweites, zweites + 3);
  }

  private dokument(doc: Document.Parsed, eltern: number): void {
    this.anker = new Map();
    this.wert(doc.contents, eltern, undefined, this.grenze(doc.range[0]));
    for (const f of doc.errors) this.fehlerMelden("fehler", f);
    for (const w of doc.warnings) this.fehlerMelden("warnung", w);
  }

  fehlerMelden(schwere: Diagnose["schwere"], f: YAMLError): void {
    this.melden(schwere, meldungZu(f.code), f.pos[0], f.pos[1]);
  }

  /** Ende des Werts eines Knotens, `ersatz` wenn er fehlt. */
  private ende(knoten: unknown, ersatz: number): number {
    return isNode(knoten) && knoten.range ? Math.max(ersatz, this.grenze(knoten.range[1])) : ersatz;
  }

  /** Einen Wert (oder ein Paar in einer Liste) als Knoten anlegen; `ersatz` ist die Stelle, wenn er fehlt. */
  private wert(knoten: unknown, eltern: number, schluessel: Spanne | undefined, ersatz: number): void {
    if (isPair(knoten)) {
      // Ein Paar direkt in einer Liste ([a: 1] oder !!pairs) ist ein Objekt mit einem Eintrag.
      const von = isNode(knoten.key) && knoten.key.range ? this.grenze(knoten.key.range[0]) : ersatz;
      const k = this.bauer.knoten(KnotenArt.objekt, eltern, von, schluessel);
      const ende = this.paar(knoten, k, new Set(), ersatz);
      this.bauer.schliessen(k, ende);
    } else if (isScalar(knoten)) {
      this.skalar(knoten, eltern, schluessel);
    } else if (isAlias(knoten)) {
      this.alias(knoten.source, this.bereich(knoten, ersatz), eltern, schluessel);
    } else if (isMap(knoten) || isSeq(knoten)) {
      const [von, bis] = this.bereich(knoten, ersatz);
      const art = isMap(knoten) ? KnotenArt.objekt : KnotenArt.liste;
      const k = this.bauer.knoten(art, eltern, von, schluessel);
      if (knoten.anchor) this.anker.set(knoten.anchor, { art, inhalt: null, von });
      if (isMap(knoten)) {
        const gesehen = new Set<string>();
        for (const p of knoten.items) this.paar(p, k, gesehen, von);
      } else {
        for (const c of knoten.items) this.wert(c, k, undefined, von);
      }
      this.bauer.schliessen(k, bis);
    } else {
      this.bauer.blatt(KnotenArt.nichts, eltern, ersatz, ersatz, schluessel);
    }
  }

  /** Ein Schlüssel-Wert-Paar unter `objekt`; liefert das Ende des Werts. */
  private paar(p: Pair<unknown, unknown>, objekt: number, gesehen: Set<string>, ersatz: number): number {
    const s = this.schluessel(p.key, ersatz);
    const text = isScalar(p.key) && typeof p.key.value === "string" ? p.key.value : this.text.slice(s.von, s.bis);
    if (gesehen.has(text)) this.melden("warnung", `Der Schlüssel "${text}" kommt mehrfach vor`, s.von, s.bis);
    gesehen.add(text);
    this.wert(p.value, objekt, s, s.bis);
    return this.ende(p.value, s.bis);
  }

  /** Spanne eines Schlüssels. Schlüssel, die keine Texte sind, gelten als Text ihres Rohtexts. */
  private schluessel(key: unknown, ersatz: number): Spanne {
    if (isScalar(key) && typeof key.value === "string") {
      const [von, bis] = this.bereich(key, ersatz);
      return this.steht(key.value, von, bis) ? { von, bis } : { von, bis, dekodiert: key.value };
    }
    if (isScalar(key) || isAlias(key) || isMap(key) || isSeq(key)) {
      const [von, bis] = this.bereich(key, ersatz);
      const roh = this.text.slice(von, bis);
      this.melden("hinweis", `Der Schlüssel ${roh === "" ? "(leer)" : roh} ist kein Text; er gilt als Text "${roh}"`, von, bis);
      return { von, bis };
    }
    this.melden("hinweis", "Ein Eintrag hat keinen Schlüssel; er gilt als leerer Text", ersatz, ersatz);
    return { von: ersatz, bis: ersatz };
  }

  private skalar(knoten: Scalar, eltern: number, schluessel: Spanne | undefined): void {
    const [von, bis] = this.bereich(knoten, schluessel ? schluessel.bis : 0);
    const art = artVonWert(knoten.value);
    let inhalt: Spanne = { von, bis };
    if (knoten.type === Scalar.QUOTE_DOUBLE || knoten.type === Scalar.QUOTE_SINGLE) {
      const zu = bis - von >= 2 && this.text[bis - 1] === this.text[von];
      inhalt = { von: von + 1, bis: zu ? bis - 1 : bis };
    }
    if (art === KnotenArt.text) {
      const wert = String(knoten.value);
      if (!this.steht(wert, inhalt.von, inhalt.bis)) inhalt = { ...inhalt, dekodiert: wert };
    }
    this.bauer.blatt(art, eltern, von, bis, schluessel, inhalt);
    if (knoten.anchor) {
      const ankerInhalt = inhalt.dekodiert ?? (art === KnotenArt.text ? this.text.slice(inhalt.von, inhalt.bis) : this.text.slice(von, bis));
      this.anker.set(knoten.anchor, { art, inhalt: ankerInhalt, von });
    }
  }

  /** Ein Alias erscheint als Knoten der Art seines Ziels, mit der Spanne des Alias selbst (*name). */
  private alias(name: string, [von, bis]: [number, number], eltern: number, schluessel: Spanne | undefined): void {
    const ziel = this.anker.get(name);
    if (!ziel) {
      this.bauer.blatt(KnotenArt.nichts, eltern, von, bis, schluessel);
      this.melden("fehler", `Der Anker &${name} ist nicht definiert`, von, bis);
      return;
    }
    const zeile = this.zeile(ziel.von);
    if (ziel.inhalt === null) {
      const k = this.bauer.blatt(ziel.art, eltern, von, bis, schluessel);
      this.bauer.verweis(k, `Verweis auf &${name}, Zeile ${zeile}`);
      this.melden("hinweis", `*${name} wiederholt den Inhalt von &${name} (Zeile ${zeile}); die Einträge stehen dort`, von, bis);
    } else {
      this.bauer.blatt(ziel.art, eltern, von, bis, schluessel, { von, bis, dekodiert: ziel.inhalt });
      this.melden("hinweis", `*${name} übernimmt den Wert von &${name} (Zeile ${zeile})`, von, bis);
    }
  }

  ergebnis(dokumente: number): Leseergebnis {
    const index: Strukturindex = this.bauer.fertig();
    return { index, diagnosen: this.diagnosen, merkmale: { dokumente } };
  }
}

export function lesenYaml(text: string): Leseergebnis {
  try {
    const docs = parseAllDocuments(text, { schema: "core", uniqueKeys: false, prettyErrors: false });
    const leser = new YamlLeser(text);
    leser.dokumente(docs);
    if ("empty" in docs) {
      for (const f of docs.errors) leser.fehlerMelden("fehler", f);
      for (const w of docs.warnings) leser.fehlerMelden("warnung", w);
    }
    return leser.ergebnis(docs.length);
  } catch (e) {
    const grund = e instanceof Error ? e.message : String(e);
    return { index: null, diagnosen: [{ schwere: "fehler", meldung: `Der Text ist nicht als YAML lesbar (${grund})`, von: 0, bis: 0 }], merkmale: {} };
  }
}
