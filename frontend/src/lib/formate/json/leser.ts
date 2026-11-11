// Gemeinsamer Leser für JSON und NDJSON. Er liest genau einen Wert in einem Textbereich und baut dabei den
// Strukturindex in Textreihenfolge auf. Ohne Rekursion (ein Stapel offener Behälter), damit tief verschachtelte Texte
// den Aufrufstapel nicht sprengen. Alle Positionen sind String-Indizes, also UTF-16-Einheiten wie im Editor.
// Ohne `bauer` prüft der Leser nur (für die Erkennung und für NDJSON-Zeilen vor dem Einbau).

import { IndexBauer, KEIN, KnotenArt } from "../../kern/strukturindex";
import type { Diagnose, Schwere } from "../vertrag";

export interface LeserOptionen {
  /** JSONC: Kommentare und abschließende Kommas sind erlaubt (als Hinweis gemeldet), sonst Fehler. */
  readonly jsonc: boolean;
}

/** Ein offener Behälter. */
interface Rahmen {
  readonly k: number;
  readonly objekt: boolean;
  /** Bisher gesehene Schlüssel (nur beim Bauen, für doppelte Schlüssel). */
  schluessel: Set<string> | null;
}

/** Spanne eines Schlüssels wie `IndexBauer.knoten` sie erwartet. */
interface Schluessel {
  von: number;
  bis: number;
  dekodiert?: string;
}

const ANF = 34; // "
const RUECK = 92; // \
const ESCAPES: Readonly<Record<number, string>> = { 34: '"', 92: "\\", 47: "/", 98: "\b", 102: "\f", 110: "\n", 114: "\r", 116: "\t" };
const WOERTER: readonly (readonly [string, KnotenArt])[] = [["true", KnotenArt.wahrheitswert], ["false", KnotenArt.wahrheitswert], ["null", KnotenArt.nichts]];
const istZiffer = (c: number): boolean => c >= 48 && c <= 57;
const istHex = (c: number): boolean => istZiffer(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);
const istWortzeichen = (c: number): boolean => istZiffer(c) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 43 || c === 45 || c === 46 || c === 95;

export class JsonLeser {
  pos = 0;
  ende = 0;
  /** Ein Fehler hat den Lauf beendet. */
  fehler = false;
  /** Der Lauf endete, weil der Textbereich vorzeitig aufhörte (abgeschnittener Text). */
  zuFrueh = false;
  /** Der Text enthält Kommentare bzw. abschließende Kommas (nur im JSONC-Modus möglich). */
  kommentare = false;
  abschliessendeKommas = false;
  /** Wird jeder Meldung vorangestellt (NDJSON: "Zeile 3: "). */
  praefix = "";

  // Ergebnis des letzten gelesenen Textes
  private textEnde = 0;
  private textDekodiert: string | undefined;

  constructor(
    private readonly text: string,
    public bauer: IndexBauer | null,
    public diagnosen: Diagnose[],
    private readonly optionen: LeserOptionen,
  ) {}

  /** Für einen neuen Lauf auf demselben Text (NDJSON-Zeilen). Kommentar- und Komma-Merkmale bleiben stehen. */
  neu(von: number, ende: number): void {
    this.pos = von;
    this.ende = ende;
    this.fehler = false;
    this.zuFrueh = false;
  }

  /** Überspringt Leerraum und, im JSONC-Modus, Kommentare. Liefert false bei einem Fehler. */
  leerraum(): boolean {
    const t = this.text;
    while (this.pos < this.ende) {
      const c = t.charCodeAt(this.pos);
      if (c === 32 || c === 10 || c === 13 || c === 9 || (c === 0xfeff && this.pos === 0)) {
        this.pos++;
        continue;
      }
      if (c !== 47) return true;
      const d = this.pos + 1 < this.ende ? t.charCodeAt(this.pos + 1) : 0;
      if (d !== 47 && d !== 42) return true;
      if (!this.kommentarLesen(d === 42)) return false;
    }
    return true;
  }

  private kommentarLesen(block: boolean): boolean {
    const von = this.pos;
    let bis: number;
    if (block) {
      const zu = this.text.indexOf("*/", von + 2);
      if (zu === -1 || zu + 2 > this.ende) {
        this.zuFrueh = true;
        return this.abbrechen("Kommentar ohne Ende (*/ fehlt)", von, this.ende);
      }
      bis = zu + 2;
    } else {
      const zeile = this.text.indexOf("\n", von);
      bis = zeile === -1 || zeile > this.ende ? this.ende : zeile;
    }
    if (!this.optionen.jsonc) return this.abbrechen("Kommentare sind hier nicht erlaubt", von, bis);
    if (!this.kommentare) {
      this.kommentare = true;
      this.melden("hinweis", "Kommentare sind kein Standard-JSON (JSONC)", von, bis);
    }
    this.pos = bis;
    return true;
  }

  /**
   * Liest genau einen Wert ab `pos` als Kind von `eltern` (KEIN für die Wurzel). Danach steht `pos` direkt hinter dem
   * Wert. Liefert den Knoten des Werts, KEIN wenn kein Wert begann. Bei einem Fehler werden offene Behälter an der
   * Fehlerstelle geschlossen, der Baum bis dahin bleibt.
   */
  wert(eltern: number): number {
    const t = this.text;
    const stapel: Rahmen[] = [];
    let erster = KEIN;
    let schluessel: Schluessel | undefined;
    let zustand: "wert" | "danach" | "schluessel" = "wert";

    while (!this.fehler) {
      if (zustand === "wert") {
        if (!this.leerraum()) break;
        if (this.pos >= this.ende) {
          this.zuFrueh = true;
          this.abbrechen(stapel.length === 0 ? "Hier fehlt ein Wert" : "Der Text endet zu früh", this.pos, this.pos);
          break;
        }
        const oben = stapel.length > 0 ? stapel[stapel.length - 1].k : eltern;
        const c = t.charCodeAt(this.pos);
        if (c === 123 || c === 91) {
          const objekt = c === 123;
          const k = this.bauer ? this.bauer.knoten(objekt ? KnotenArt.objekt : KnotenArt.liste, oben, this.pos, schluessel) : 0;
          if (erster === KEIN) erster = k;
          stapel.push({ k, objekt, schluessel: null });
          schluessel = undefined;
          this.pos++;
          if (!this.leerraum()) break;
          if (t.charCodeAt(this.pos) === (objekt ? 125 : 93)) {
            this.behaelterSchliessen(stapel);
            zustand = "danach";
          } else zustand = objekt ? "schluessel" : "wert";
          continue;
        }
        const k = this.einfacherWert(oben, schluessel);
        if (k === KEIN) break;
        if (erster === KEIN) erster = k;
        schluessel = undefined;
        zustand = "danach";
        continue;
      }

      if (zustand === "danach") {
        if (stapel.length === 0) return erster;
        if (!this.leerraum()) break;
        const rahmen = stapel[stapel.length - 1];
        const zu = rahmen.objekt ? 125 : 93;
        if (this.pos >= this.ende) {
          this.zuFrueh = true;
          this.abbrechen(`Der Text endet zu früh (${rahmen.objekt ? "}" : "]"} fehlt)`, this.pos, this.pos);
          break;
        }
        const c = t.charCodeAt(this.pos);
        if (c === zu) {
          this.behaelterSchliessen(stapel);
          continue;
        }
        if (c !== 44) {
          this.unerwartet(rahmen.objekt ? "Erwartet: , oder }" : "Erwartet: , oder ]");
          break;
        }
        const komma = this.pos++;
        if (!this.leerraum()) break;
        if (this.pos < this.ende && t.charCodeAt(this.pos) === zu) {
          if (!this.optionen.jsonc) {
            this.abbrechen("Abschließendes Komma ist hier nicht erlaubt", komma, komma + 1);
            break;
          }
          if (!this.abschliessendeKommas) {
            this.abschliessendeKommas = true;
            this.melden("hinweis", "Abschließendes Komma ist kein Standard-JSON (JSONC)", komma, komma + 1);
          }
          this.behaelterSchliessen(stapel);
          continue;
        }
        zustand = rahmen.objekt ? "schluessel" : "wert";
        continue;
      }

      // zustand === "schluessel"
      if (!this.leerraum()) break;
      if (this.pos >= this.ende) {
        this.zuFrueh = true;
        this.abbrechen("Der Text endet zu früh (} fehlt)", this.pos, this.pos);
        break;
      }
      if (t.charCodeAt(this.pos) !== ANF) {
        this.unerwartet("Erwartet: Schlüssel in doppelten Anführungszeichen");
        break;
      }
      const von = this.pos;
      if (!this.textLesen()) break;
      schluessel = { von: von + 1, bis: this.textEnde - 1, dekodiert: this.textDekodiert };
      this.doppelPruefen(stapel[stapel.length - 1], schluessel, von);
      if (!this.leerraum()) break;
      if (this.pos >= this.ende) {
        this.zuFrueh = true;
        this.abbrechen("Der Text endet zu früh (: fehlt)", this.pos, this.pos);
        break;
      }
      if (t.charCodeAt(this.pos) !== 58) {
        this.unerwartet("Erwartet: : nach dem Schlüssel");
        break;
      }
      this.pos++;
      zustand = "wert";
    }

    // Fehler: offene Behälter enden an der Fehlerstelle
    if (this.bauer) for (const r of stapel) this.bauer.schliessen(r.k, this.pos);
    return erster;
  }

  private behaelterSchliessen(stapel: Rahmen[]): void {
    const r = stapel.pop();
    this.pos++;
    if (r && this.bauer) this.bauer.schliessen(r.k, this.pos);
  }

  private doppelPruefen(rahmen: Rahmen, s: Schluessel, von: number): void {
    if (!this.bauer) return;
    const name = s.dekodiert ?? this.text.slice(s.von, s.bis);
    rahmen.schluessel ??= new Set();
    if (rahmen.schluessel.has(name)) this.melden("warnung", `Doppelter Schlüssel "${name}"`, von, s.bis + 1);
    else rahmen.schluessel.add(name);
  }

  /** Text, Zahl, true, false oder null an `pos`. */
  private einfacherWert(eltern: number, schluessel: Schluessel | undefined): number {
    const t = this.text;
    const von = this.pos;
    const c = t.charCodeAt(von);
    if (c === ANF) {
      if (!this.textLesen()) return KEIN;
      const inhalt = { von: von + 1, bis: this.textEnde - 1, dekodiert: this.textDekodiert };
      return this.bauer ? this.bauer.blatt(KnotenArt.text, eltern, von, this.textEnde, schluessel, inhalt) : 0;
    }
    if (c === 45 || istZiffer(c)) {
      if (!this.zahlLesen()) return KEIN;
      return this.bauer ? this.bauer.blatt(KnotenArt.zahl, eltern, von, this.pos, schluessel) : 0;
    }
    for (const [wort, art] of WOERTER) {
      if (t.startsWith(wort, von) && von + wort.length <= this.ende) {
        this.pos = von + wort.length;
        return this.bauer ? this.bauer.blatt(art, eltern, von, this.pos, schluessel) : 0;
      }
      if (this.ende - von < wort.length && wort.startsWith(t.slice(von, this.ende))) {
        this.zuFrueh = true;
        this.abbrechen("Der Text endet zu früh", von, this.ende);
        return KEIN;
      }
    }
    this.unbekannt();
    return KEIN;
  }

  /** Text in Anführungszeichen ab `pos`; setzt `textEnde` (hinter dem Anführungszeichen) und `textDekodiert`. */
  private textLesen(): boolean {
    const t = this.text;
    const von = this.pos;
    let dekodiert: string | null = null;
    let stueck = von + 1;
    let i = von + 1;
    while (i < this.ende) {
      const c = t.charCodeAt(i);
      if (c === ANF) {
        this.textEnde = this.pos = i + 1;
        this.textDekodiert = dekodiert === null ? undefined : dekodiert + t.slice(stueck, i);
        return true;
      }
      if (c === RUECK) {
        dekodiert = (dekodiert ?? "") + t.slice(stueck, i);
        if (i + 1 >= this.ende) break;
        const e = t.charCodeAt(i + 1);
        if (e === 117) {
          let n = 0;
          while (n < 4 && i + 2 + n < this.ende && istHex(t.charCodeAt(i + 2 + n))) n++;
          if (n < 4) {
            if (i + 2 + n >= this.ende) break;
            return this.abbrechen("\\u braucht vier Hexziffern", i, i + 2 + n);
          }
          dekodiert += String.fromCharCode(parseInt(t.slice(i + 2, i + 6), 16));
          i += 6;
        } else {
          const ersatz = ESCAPES[e];
          if (ersatz === undefined) return this.abbrechen(`Ungültige Escape-Sequenz \\${this.zeichenAn(i + 1)}`, i, i + 1 + this.zeichenLaenge(i + 1));
          dekodiert += ersatz;
          i += 2;
        }
        stueck = i;
        continue;
      }
      if (c === 10 || c === 13) return this.abbrechen("Text ohne schließendes Anführungszeichen", von, i);
      if (c < 32) return this.abbrechen(`Steuerzeichen im Text muss maskiert werden (\\u${c.toString(16).padStart(4, "0")})`, i, i + 1);
      i++;
    }
    this.zuFrueh = true;
    return this.abbrechen("Text ohne schließendes Anführungszeichen", von, this.ende);
  }

  /** Zahl nach JSON-Grammatik ab `pos`. */
  private zahlLesen(): boolean {
    const t = this.text;
    const von = this.pos;
    let i = von;
    if (t.charCodeAt(i) === 45) i++;
    if (t.startsWith("Infinity", i)) return this.abbrechen("NaN und Infinity sind in JSON nicht erlaubt", von, i + 8);
    const ziffern = (): number => {
      const a = i;
      while (i < this.ende && istZiffer(t.charCodeAt(i))) i++;
      return i - a;
    };
    const ungueltig = (): boolean => {
      if (i >= this.ende) this.zuFrueh = true;
      return this.abbrechen("Ungültige Zahl", von, this.wortEnde(i));
    };
    if (t.charCodeAt(i) === 48) {
      i++;
      if (i < this.ende && istZiffer(t.charCodeAt(i))) return this.abbrechen("Ungültige Zahl: führende Null", von, this.wortEnde(i));
    } else if (ziffern() === 0) return ungueltig();
    if (i < this.ende && t.charCodeAt(i) === 46) {
      i++;
      if (ziffern() === 0) return ungueltig();
    }
    const e = i < this.ende ? t.charCodeAt(i) : 0;
    if (e === 101 || e === 69) {
      i++;
      const v = i < this.ende ? t.charCodeAt(i) : 0;
      if (v === 43 || v === 45) i++;
      if (ziffern() === 0) return ungueltig();
    }
    this.pos = i;
    return true;
  }

  private unbekannt(): void {
    const von = this.pos;
    const c = this.text.charCodeAt(von);
    if (c === 39) {
      this.abbrechen("Texte stehen in doppelten Anführungszeichen", von, von + 1);
      return;
    }
    const bis = this.wortEnde(von);
    const wort = this.text.slice(von, bis);
    if (wort === "NaN" || wort === "Infinity") this.abbrechen("NaN und Infinity sind in JSON nicht erlaubt", von, bis);
    else if (bis > von) this.abbrechen(`Unbekannter Wert ${wort}`, von, bis);
    else this.unerwartet("Erwartet: ein Wert");
  }

  private unerwartet(erwartet: string): void {
    this.abbrechen(`Unerwartetes Zeichen ${this.zeichenAn(this.pos)}. ${erwartet}`, this.pos, this.pos + this.zeichenLaenge(this.pos));
  }

  /** Ganzes Zeichen an einer Stelle, auch außerhalb der Grundebene (zwei UTF-16-Einheiten). */
  private zeichenAn(i: number): string {
    const cp = this.text.codePointAt(i);
    return cp === undefined ? "" : String.fromCodePoint(cp);
  }

  private zeichenLaenge(i: number): number {
    const cp = this.text.codePointAt(i);
    return cp !== undefined && cp > 0xffff ? 2 : 1;
  }

  private wortEnde(i: number): number {
    while (i < this.ende && istWortzeichen(this.text.charCodeAt(i))) i++;
    return i;
  }

  private melden(schwere: Schwere, meldung: string, von: number, bis: number): void {
    this.diagnosen.push({ schwere, meldung: this.praefix + meldung, von, bis });
  }

  /** Fehler melden und den Lauf beenden; liefert false zum direkten Zurückgeben. */
  private abbrechen(meldung: string, von: number, bis: number): false {
    this.fehler = true;
    this.pos = Math.min(von, this.ende);
    this.melden("fehler", meldung, von, bis);
    return false;
  }
}
