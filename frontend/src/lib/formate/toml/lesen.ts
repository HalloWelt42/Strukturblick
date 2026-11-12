// TOML lesen und den Strukturindex aufbauen. Ein TOML-Dokument ist ein Objekt; Tabellen ([a.b]) und Tabellenlisten
// ([[a]]) hängen Abschnitte an, Punktschlüssel (a.b = 1) legen Zwischenobjekte an. Spannen: eine Tabelle reicht von
// ihrer Kopfzeile bis zum Ende ihres Abschnitts, ein Element einer Tabellenliste ebenso, die Liste von der ersten
// Kopfzeile bis zum Ende des letzten Elements. Ein Fehler beendet nur seine Zeile; danach liest der Leser weiter.

import { IndexBauer, KEIN, KnotenArt } from "../../kern/strukturindex";
import type { Diagnose, Leseergebnis } from "../vertrag";
import { datumLesen, schluesselLesen, textLesen, TomlFehler, zahlLesen, type Schluesselteil } from "./skalare";

type Art = "tabelle" | "implizit" | "punkt" | "inline" | "tabellenliste" | "element" | "wert" | "wurzel";

interface Eintrag {
  readonly k: number;
  art: Art;
  readonly eltern: Eintrag | null;
  readonly kinder: Map<string, Eintrag>;
  /** Bei Tabellenlisten: die Elemente */
  readonly elemente: Eintrag[];
}

/** So tief dürfen Listen und eingebettete Tabellen geschachtelt sein */
const TIEFE = 500;
/** Mehr Diagnosen werden nicht gesammelt */
const DIAGNOSEN = 200;

const schluesselFuer = (s: Schluesselteil) => ({ von: s.von, bis: s.bis, dekodiert: s.dekodiert });

class TomlLeser {
  private pos = 0;
  private readonly bauer = new IndexBauer();
  readonly diagnosen: Diagnose[] = [];
  private readonly enden = new Map<number, number>();
  private readonly wurzel: Eintrag;
  private aktuell: Eintrag;
  /** Kopfzeilen-Knoten des laufenden Abschnitts (Tabelle oder Element) */
  private abschnitt: Eintrag | null = null;
  private inhaltEnde = 0;
  /** Für die Merkmale: Kommentare gesehen, Zahl der Werte mit Datum oder Zeit */
  private kommentare = false;
  private datumswerte = 0;

  constructor(private readonly t: string) {
    this.wurzel = this.eintrag(this.bauer.knoten(KnotenArt.objekt, KEIN, 0), "wurzel", null);
    this.aktuell = this.wurzel;
  }

  lesen(): Leseergebnis {
    const t = this.t;
    while (this.pos < t.length) {
      this.leerUndKommentare(true);
      if (this.pos >= t.length) break;
      try {
        if (t[this.pos] === "[") this.kopfzeile();
        else this.zuweisung(this.aktuell);
        this.zeilenende();
      } catch (e) {
        if (!(e instanceof TomlFehler)) throw e;
        if (this.diagnosen.length < DIAGNOSEN) this.diagnosen.push({ schwere: "fehler", meldung: e.message, von: e.von, bis: Math.max(e.von, Math.min(e.bis, t.length)) });
        const n = t.indexOf("\n", Math.max(this.pos, e.von));
        this.pos = n === -1 ? t.length : n + 1;
      }
    }
    this.abschnittSchliessen();
    this.bauer.schliessen(0, t.length);
    return { index: this.bauer.fertig(), diagnosen: this.diagnosen, merkmale: { kommentare: this.kommentare, datumswerte: this.datumswerte } };
  }

  private eintrag(k: number, art: Art, eltern: Eintrag | null): Eintrag {
    return { k, art, eltern, kinder: new Map(), elemente: [] };
  }

  /** Spanne eines Behälters bis `bis` ausdehnen */
  private ende(k: number, bis: number): void {
    const e = Math.max(this.enden.get(k) ?? 0, bis);
    this.enden.set(k, e);
    this.bauer.schliessen(k, e);
  }

  // ----- Kopfzeilen -----

  private abschnittSchliessen(): void {
    for (let e = this.abschnitt; e && e.art !== "wurzel"; e = e.eltern) this.ende(e.k, this.inhaltEnde);
    this.abschnitt = null;
  }

  private kopfzeile(): void {
    const t = this.t;
    const von = this.pos;
    const liste = t.startsWith("[[", von);
    this.abschnittSchliessen();
    this.pos += liste ? 2 : 1;
    this.blanks();
    const { teile, bis } = schluesselLesen(t, this.pos);
    this.pos = bis;
    this.blanks();
    if (!t.startsWith(liste ? "]]" : "]", this.pos)) throw new TomlFehler(`Erwartet: ${liste ? "]]" : "]"} am Ende der Kopfzeile`, this.pos, this.pos + 1);
    this.pos += liste ? 2 : 1;
    this.inhaltEnde = this.pos;

    let e = this.wurzel;
    for (const teil of teile.slice(0, -1)) e = this.weiter(e, teil, von);
    const letzter = teile[teile.length - 1];
    const da = e.kinder.get(letzter.name);
    const name = teile.map((x) => x.name).join(".");
    if (liste) {
      let l = da;
      if (!l) {
        l = this.eintrag(this.bauer.knoten(KnotenArt.liste, e.k, von, schluesselFuer(letzter)), "tabellenliste", e);
        e.kinder.set(letzter.name, l);
      } else if (l.art !== "tabellenliste") throw new TomlFehler(`${name} ist schon ${l.art === "wert" ? "ein Wert" : "eine Tabelle"}, keine Tabellenliste`, von, this.pos);
      const element = this.eintrag(this.bauer.knoten(KnotenArt.objekt, l.k, von), "element", l);
      l.elemente.push(element);
      this.aktuell = this.abschnitt = element;
    } else {
      let tab = da;
      if (!tab) {
        tab = this.eintrag(this.bauer.knoten(KnotenArt.objekt, e.k, von, schluesselFuer(letzter)), "tabelle", e);
        e.kinder.set(letzter.name, tab);
      } else if (tab.art === "implizit") tab.art = "tabelle";
      else throw new TomlFehler(tab.art === "tabelle" ? `Die Tabelle ${name} gibt es schon` : `${name} ist schon ${tab.art === "wert" || tab.art === "inline" ? "ein Wert" : "anders angelegt"}`, von, this.pos);
      this.aktuell = this.abschnitt = tab;
    }
    this.ende(this.aktuell.k, this.pos);
  }

  /** Einen Schritt im Pfad einer Kopfzeile: Tabelle, sonst neu als implizite; bei Tabellenlisten das letzte Element */
  private weiter(e: Eintrag, teil: Schluesselteil, von: number): Eintrag {
    const da = e.kinder.get(teil.name);
    if (!da) {
      const neu = this.eintrag(this.bauer.knoten(KnotenArt.objekt, e.k, von, schluesselFuer(teil)), "implizit", e);
      e.kinder.set(teil.name, neu);
      return neu;
    }
    if (da.art === "tabellenliste") return da.elemente[da.elemente.length - 1];
    if (da.art === "wert" || da.art === "inline") throw new TomlFehler(`${teil.name} ist ein Wert, keine Tabelle`, teil.anfang, teil.bis);
    return da;
  }

  // ----- Zuweisungen -----

  /** Schlüssel = Wert in `tabelle`; Punktschlüssel legen Zwischenobjekte an */
  private zuweisung(tabelle: Eintrag, tiefe = 0): void {
    const t = this.t;
    const { teile, bis } = schluesselLesen(t, this.pos);
    this.pos = bis;
    this.blanks();
    if (t[this.pos] !== "=") throw new TomlFehler("Erwartet: = nach dem Schlüssel", this.pos, this.pos + 1);
    this.pos++;
    this.blanks();
    let e = tabelle;
    const kette: Eintrag[] = [];
    for (const teil of teile.slice(0, -1)) {
      let da = e.kinder.get(teil.name);
      if (!da) {
        da = this.eintrag(this.bauer.knoten(KnotenArt.objekt, e.k, teil.anfang, schluesselFuer(teil)), "punkt", e);
        e.kinder.set(teil.name, da);
      } else if (da.art !== "punkt" && da.art !== "implizit") throw new TomlFehler(`${teil.name} ist schon ${da.art === "wert" || da.art === "inline" ? "ein Wert" : "eine Tabelle"}`, teil.anfang, teil.bis);
      kette.push(da);
      e = da;
    }
    const letzter = teile[teile.length - 1];
    if (e.kinder.has(letzter.name)) throw new TomlFehler(`Doppelter Schlüssel ${teile.map((x) => x.name).join(".")}`, letzter.anfang, letzter.bis);
    const inline = this.t[this.pos] === "{";
    const k = this.wert(e.k, schluesselFuer(letzter), tiefe);
    e.kinder.set(letzter.name, this.eintrag(k, inline ? "inline" : "wert", e));
    for (const p of kette) this.ende(p.k, this.pos);
    this.inhaltEnde = this.pos;
  }

  // ----- Werte -----

  private wert(eltern: number, schluessel: ReturnType<typeof schluesselFuer> | undefined, tiefe: number): number {
    const t = this.t;
    const von = this.pos;
    const c = t[von];
    if (tiefe > TIEFE) throw new TomlFehler("Zu tief geschachtelt", von, von + 1);
    if (c === '"' || c === "'") {
      const g = textLesen(t, von);
      this.pos = g.bis;
      return this.bauer.blatt(KnotenArt.text, eltern, von, g.bis, schluessel, { von: g.inhaltVon, bis: g.inhaltBis, dekodiert: g.dekodiert });
    }
    if (c === "[") return this.liste(eltern, schluessel, tiefe);
    if (c === "{") return this.inline(eltern, schluessel, tiefe);
    for (const w of ["true", "false"]) {
      if (t.startsWith(w, von) && !/[A-Za-z0-9_]/.test(t[von + w.length] ?? "")) {
        this.pos = von + w.length;
        return this.bauer.blatt(KnotenArt.wahrheitswert, eltern, von, this.pos, schluessel);
      }
    }
    const d = datumLesen(t, von);
    if (d) {
      this.datumswerte++;
      this.pos = d.bis;
      return this.bauer.blatt(KnotenArt.text, eltern, von, d.bis, schluessel);
    }
    const z = zahlLesen(t, von);
    if (z) {
      this.pos = z.bis;
      return this.bauer.blatt(KnotenArt.zahl, eltern, von, z.bis, schluessel, { von, bis: z.bis, dekodiert: z.dekodiert });
    }
    const wort = /^[^\s,\]}#]+/.exec(t.slice(von, von + 60))?.[0] ?? "";
    throw new TomlFehler(wort ? `Unbekannter Wert ${wort}` : "Hier fehlt ein Wert", von, von + Math.max(1, wort.length));
  }

  private liste(eltern: number, schluessel: ReturnType<typeof schluesselFuer> | undefined, tiefe: number): number {
    const t = this.t;
    const k = this.bauer.knoten(KnotenArt.liste, eltern, this.pos, schluessel);
    this.pos++;
    try {
      for (;;) {
        this.leerUndKommentare(true);
        if (t[this.pos] === "]") break;
        if (this.pos >= t.length) throw new TomlFehler("Liste ohne ] am Ende", this.pos, this.pos);
        this.wert(k, undefined, tiefe + 1);
        this.leerUndKommentare(true);
        if (t[this.pos] === ",") { this.pos++; continue; }
        if (t[this.pos] !== "]") throw new TomlFehler("Erwartet: , oder ]", this.pos, this.pos + 1);
        break;
      }
      this.pos++;
    } finally {
      this.bauer.schliessen(k, this.pos);
    }
    return k;
  }

  private inline(eltern: number, schluessel: ReturnType<typeof schluesselFuer> | undefined, tiefe: number): number {
    const t = this.t;
    const k = this.bauer.knoten(KnotenArt.objekt, eltern, this.pos, schluessel);
    const e = this.eintrag(k, "inline", null);
    this.pos++;
    try {
      for (;;) {
        this.leerUndKommentare(true);
        if (t[this.pos] === "}") break;
        if (this.pos >= t.length) throw new TomlFehler("Eingebettete Tabelle ohne } am Ende", this.pos, this.pos);
        this.zuweisung(e, tiefe + 1);
        this.leerUndKommentare(true);
        if (t[this.pos] === ",") { this.pos++; continue; }
        if (t[this.pos] !== "}") throw new TomlFehler("Erwartet: , oder }", this.pos, this.pos + 1);
        break;
      }
      this.pos++;
    } finally {
      this.bauer.schliessen(k, this.pos);
    }
    return k;
  }

  // ----- Leerraum -----

  private blanks(): void {
    while (this.t[this.pos] === " " || this.t[this.pos] === "\t") this.pos++;
  }

  /** Leerraum und Kommentare; mit `zeilen` auch Zeilenumbrüche */
  private leerUndKommentare(zeilen: boolean): void {
    const t = this.t;
    while (this.pos < t.length) {
      const c = t[this.pos];
      if (c === " " || c === "\t" || (zeilen && (c === "\n" || c === "\r"))) this.pos++;
      else if (c === "#") {
        this.kommentare = true;
        const n = t.indexOf("\n", this.pos);
        this.pos = n === -1 ? t.length : n;
      } else return;
    }
  }

  /** Nach einer Zeile darf nur noch ein Kommentar stehen */
  private zeilenende(): void {
    this.leerUndKommentare(false);
    const t = this.t;
    if (this.pos >= t.length) return;
    if (t[this.pos] === "\n") { this.pos++; return; }
    if (t.startsWith("\r\n", this.pos)) { this.pos += 2; return; }
    const n = t.indexOf("\n", this.pos);
    throw new TomlFehler("Nach dem Wert folgt noch Text in derselben Zeile", this.pos, n === -1 ? t.length : n);
  }
}

export function lesenToml(text: string): Leseergebnis {
  return new TomlLeser(text).lesen();
}
