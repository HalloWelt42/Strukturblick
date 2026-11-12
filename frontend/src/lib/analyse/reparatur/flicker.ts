// Der Flicker liest einen Textbereich als genau einen JSON-Wert (bei JSON Lines: eine Zeile) und schlägt für jede
// Stelle, an der ein strenger Leser abbricht, einen Eingriff nach fester Regel vor. Er liest weiter, als wäre der
// Eingriff schon gemacht; so findet ein Lauf alle Stellen. Ohne Rekursion (ein Stapel offener Behälter).
// Gleiche Eingabe ergibt immer dieselben Eingriffe; nichts wird geraten: fehlende Werte werden null, abgeschnittene
// Texte geschlossen und als Hinweis gemeldet.

import type { Eingriff, Flickergebnis, Hinweis, Regel, Ungeloest } from "./typen";
import { beginntWert, einfacheAnfuehrung, istKeinWert, istLeerraum, istWortanfang, istWortzeichen, istZahlanfang, istZahlzeichen, kommentarSpanne, kurz, schliessenBeschreiben, wortRegel, zahlRegel, type Bausteinregel } from "./regeln";

export interface Flickeroptionen {
  /** Kommentare und abschließende Kommas sind erlaubt (JSON mit Kommentaren); sonst werden sie entfernt. */
  readonly jsonc: boolean;
  /** Bereich ist eine Zeile von JSON Lines: zwei Werte darin werden auf zwei Zeilen verteilt. */
  readonly zeilenweise: boolean;
}

type Zustand = "wert" | "danach" | "schluessel" | "doppelpunkt";

interface Rahmen {
  readonly objekt: boolean;
  readonly von: number;
}

const zu = (r: Rahmen): string => (r.objekt ? "}" : "]");

export function flicken(text: string, von: number, bis: number, optionen: Flickeroptionen): Flickergebnis {
  return new Flicker(text, von, bis, optionen).lauf();
}

class Flicker {
  private pos: number;
  private zustand: Zustand = "wert";
  private readonly stapel: Rahmen[] = [];
  /** Direkt nach { oder [: die schließende Klammer ist hier richtig */
  private frisch = false;
  private nachDoppelpunkt = false;
  /** Spanne des zuletzt vollständig gelesenen Werts oder Schlüssels (dahinter kommen fehlende Kommas) */
  private wertVon = -1;
  private wertBis = -1;
  private schluessel: string | null = null;
  /** Ein Text lief bis ans Ende des Bereichs (abgeschnitten) */
  private textOffen: { von: number; schluessel: string | null } | null = null;
  private readonly eingriffe: Eingriff[] = [];
  private readonly hinweise: Hinweis[] = [];
  private ungeloest: Ungeloest | null = null;

  constructor(
    private readonly t: string,
    private readonly anfang: number,
    private readonly ende: number,
    private readonly o: Flickeroptionen,
  ) {
    this.pos = anfang;
  }

  lauf(): Flickergebnis {
    let gelesen = false;
    let zuletzt = "";
    while (!this.ungeloest) {
      this.leer();
      // Schutz: jeder Schritt muss vorankommen oder den Zustand wechseln
      const stand = `${this.pos} ${this.zustand} ${this.stapel.length} ${this.eingriffe.length}`;
      if (stand === zuletzt) { this.aufgeben("Hier greift keine feste Regel"); break; }
      zuletzt = stand;
      if (this.zustand === "danach" && this.stapel.length === 0) {
        gelesen = true;
        if (this.pos >= this.ende) {
          if (this.textOffen) this.abschluss();
          break;
        }
        if (!this.nachDemWert()) break;
        continue;
      }
      if (this.pos >= this.ende) {
        if (gelesen || this.stapel.length > 0 || this.textOffen || this.zustand !== "wert") this.abschluss();
        break;
      }
      this.schritt();
    }
    this.eingriffe.sort((a, b) => a.von - b.von || a.bis - b.bis);
    return { eingriffe: this.eingriffe, hinweise: this.hinweise, ungeloest: this.ungeloest };
  }

  private schritt(): void {
    const c = this.t[this.pos];
    if (this.zustand === "danach") return this.danach(c);
    if ((c === "}" || c === "]") && (this.frisch || this.nachDoppelpunkt || this.zustand === "doppelpunkt")) {
      if (!this.frisch) this.wertFehlt(this.zustand === "doppelpunkt");
      this.zustand = "danach";
      return;
    }
    if (this.zustand === "schluessel") return this.schluesselLesen(c);
    if (this.zustand === "doppelpunkt") return this.doppelpunkt(c);
    this.wert(c);
  }

  // ----- Werte -----

  private wert(c: string): void {
    if (c === "{" || c === "[") {
      this.stapel.push({ objekt: c === "{", von: this.pos });
      this.pos++;
      this.frisch = true;
      this.nachDoppelpunkt = false;
      this.zustand = c === "{" ? "schluessel" : "wert";
      return;
    }
    const von = this.pos;
    if (c === '"') this.textLesen();
    else if (c === "'") { if (!this.einfacheAnfuehrung()) return; }
    else if (c === "-" && istWortanfang(this.t[von + 1] ?? "")) this.wort();
    else if (istZahlanfang(c)) { if (!this.zahl()) return; }
    else if (istWortanfang(c)) { if (!this.wort()) return; }
    else if (c === "," && this.nachDoppelpunkt) return this.wertFehlt(false);
    else if (c === "," && this.stapel.length > 0) return this.entfernen(von, von + 1, "komma-zuviel", "Komma ohne Wert davor", "Komma entfernen");
    else return this.aufgeben(`Unerwartetes Zeichen ${c}`);
    this.gelesen(von, this.pos);
  }

  private gelesen(von: number, bis: number): void {
    this.wertVon = von;
    this.wertBis = bis;
    this.frisch = false;
    this.nachDoppelpunkt = false;
    this.zustand = "danach";
  }

  /** Text in doppelten Anführungszeichen ab `pos`; danach steht `pos` hinter dem Text. */
  private textLesen(): void {
    const t = this.t;
    const von = this.pos;
    let i = von + 1;
    while (i < this.ende) {
      const c = t[i];
      if (c === '"') { this.pos = i + 1; return; }
      if (c === "\\") {
        const e = t[i + 1] ?? "";
        const gueltig = e === "u" ? /^[0-9a-fA-F]{4}$/.test(t.slice(i + 2, i + 6)) : i + 1 < this.ende && '"\\/bfnrt'.includes(e);
        if (!gueltig) this.einfuegen(i, "\\", "rueckstrich", `\\${e} ist keine gültige Maskierung`, "Rückstrich verdoppeln");
        i += gueltig ? (e === "u" ? 6 : 2) : 1;
        continue;
      }
      if (c === "\n" || c === "\r") {
        let p = i;
        while (p > von + 1 && (t[p - 1] === " " || t[p - 1] === "\t" || t[p - 1] === "\r")) p--;
        this.einfuegen(p, '"', "text-schliessen", "Text ohne schließendes Anführungszeichen am Zeilenende", 'Anführungszeichen " ergänzen');
        this.pos = p;
        this.wertBis = p;
        return;
      }
      if (c < " ") {
        const ersatz = c === "\t" ? "\\t" : `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`;
        this.eingriff(i, i + 1, ersatz, "steuerzeichen", "Steuerzeichen im Text", `maskieren als ${ersatz}`);
      }
      i++;
    }
    this.textOffen = { von, schluessel: this.zustand === "wert" && this.nachDoppelpunkt ? this.schluessel : null };
    this.pos = this.ende;
  }

  private einfacheAnfuehrung(): boolean {
    const r = einfacheAnfuehrung(this.t, this.pos, this.ende);
    if (!r) {
      this.aufgeben("Text in einfachen Anführungszeichen ohne Ende");
      return false;
    }
    this.eingriff(this.pos, r.bis, r.neu, "anfuehrung-einfach", "Text in einfachen Anführungszeichen", "in doppelte Anführungszeichen setzen");
    this.pos = r.bis;
    return true;
  }

  private zahl(): boolean {
    const von = this.pos;
    let i = von;
    while (i < this.ende && istZahlzeichen(this.t[i])) i++;
    const roh = this.t.slice(von, i);
    if (istKeinWert(roh + this.t.slice(i, this.wortEnde(i)))) return this.wort(von);
    return this.anwenden(von, i, zahlRegel(roh), "zahl-form", `Ungültige Zahl ${roh}`);
  }

  /** Wort ohne Anführungszeichen: JSON-Wort, Wort anderer Sprachen oder Text, der Anführungszeichen braucht. */
  private wort(von = this.pos): boolean {
    const bis = this.wortEnde(von + (this.t[von] === "-" || this.t[von] === "+" ? 1 : 0));
    const w = this.t.slice(von, bis);
    const regel = wortRegel(w);
    if (regel) return this.anwenden(von, bis, regel, "fremdes-wort", "");
    // Text bis zum nächsten Trenner, ohne Leerraum am Ende
    let ende = bis;
    while (ende < this.ende && !",}]\n\r".includes(this.t[ende])) ende++;
    while (ende > bis && istLeerraum(this.t[ende - 1])) ende--;
    const text = this.t.slice(von, ende);
    if (/[":{[]/.test(text)) {
      this.aufgeben(`Unbekannter Wert ${w}`);
      return false;
    }
    return this.anwenden(von, ende, { neu: JSON.stringify(text), meldung: `Text ohne Anführungszeichen: ${kurz(text)}`, vorschlag: "in Anführungszeichen setzen" }, "wort-ohne-anfuehrung", "");
  }

  /** Ergebnis einer Bausteinregel übernehmen; liefert false, wenn keine Regel griff */
  private anwenden(von: number, bis: number, r: "gueltig" | Bausteinregel | null, regel: Regel, sonst: string): boolean {
    if (!r) {
      this.aufgeben(sonst);
      return false;
    }
    this.pos = bis;
    if (r === "gueltig") return true;
    this.eingriff(von, bis, r.neu, regel, r.meldung, r.vorschlag);
    if (r.hinweis) this.hinweis(von, r.hinweis);
    return true;
  }

  private wortEnde(i: number): number {
    while (i < this.ende && istWortzeichen(this.t[i])) i++;
    return i;
  }

  // ----- Objekte -----

  private schluesselLesen(c: string): void {
    const von = this.pos;
    if (c === '"' || c === "'") {
      if (c === '"') this.textLesen();
      else if (!this.einfacheAnfuehrung()) return;
      if (this.textOffen) return;
      const bis = this.t[this.pos - 1] === c && this.pos - 1 > von ? this.pos - 1 : this.pos;
      this.schluessel = c === '"' ? this.t.slice(von + 1, bis) : this.t.slice(von + 1, bis).replace(/\\'/g, "'");
    } else if (/[A-Za-z0-9_$]/.test(c)) {
      let bis = von;
      while (bis < this.ende && /[A-Za-z0-9_$-]/.test(this.t[bis])) bis++;
      let p = bis;
      while (p < this.ende && istLeerraum(this.t[p])) p++;
      if (this.t[p] !== ":") return this.aufgeben("Schlüssel ohne Anführungszeichen und ohne Doppelpunkt");
      this.schluessel = this.t.slice(von, bis);
      this.eingriff(von, bis, `"${this.schluessel}"`, "schluessel-ohne-anfuehrung", `Schlüssel ohne Anführungszeichen: ${this.schluessel}`, "in Anführungszeichen setzen");
      this.pos = bis;
    } else if (c === ",") {
      return this.entfernen(von, von + 1, "komma-zuviel", "Komma ohne Eintrag davor", "Komma entfernen");
    } else {
      return this.aufgeben(`Unerwartetes Zeichen ${c}, erwartet ist ein Schlüssel`);
    }
    this.wertVon = von;
    this.wertBis = this.pos;
    this.frisch = false;
    this.zustand = "doppelpunkt";
  }

  private doppelpunkt(c: string): void {
    if (c === ":") {
      this.pos++;
      this.zustand = "wert";
      this.nachDoppelpunkt = true;
      return;
    }
    if (c === ",") {
      this.wertFehlt(true);
      this.zustand = "danach";
      return;
    }
    if (!beginntWert(c)) return this.aufgeben(`Unerwartetes Zeichen ${c}, erwartet ist :`);
    this.einfuegen(this.wertBis, ":", "doppelpunkt-fehlt", `Doppelpunkt fehlt nach "${kurz(this.schluessel ?? "")}"`, "Doppelpunkt einfügen");
    this.zustand = "wert";
    this.nachDoppelpunkt = true;
  }

  /** Zu einem Schlüssel fehlt der Wert: null einsetzen und melden. */
  private wertFehlt(mitDoppelpunkt: boolean): void {
    const an = mitDoppelpunkt ? this.wertBis : this.pos;
    this.einfuegen(an, mitDoppelpunkt ? ":null" : "null", "wert-fehlt", `Wert fehlt bei ${this.schluessel ?? "einem Schlüssel"}`, "null einsetzen");
    this.hinweis(an, `${this.schluessel ?? "Ein Feld"} hat keinen Wert, null eingesetzt`);
    this.nachDoppelpunkt = false;
    this.wertBis = an;
    this.zustand = "danach";
  }

  // ----- Nach einem Wert in einem Behälter -----

  private danach(c: string): void {
    const oben = this.stapel[this.stapel.length - 1];
    if (c === ",") return this.komma(oben);
    if (c === "}" || c === "]") return this.schliessen(c);
    if (beginntWert(c)) {
      this.einfuegen(this.wertBis, ",", "komma-fehlt", `Komma fehlt nach ${kurz(this.t.slice(this.wertVon, this.wertBis))}`, "Komma einfügen");
      this.zustand = oben.objekt ? "schluessel" : "wert";
      return;
    }
    this.aufgeben(`Unerwartetes Zeichen ${c}, erwartet ist , oder ${zu(oben)}`);
  }

  private komma(oben: Rahmen): void {
    const komma = this.pos++;
    this.leer();
    while (this.t[this.pos] === "," && this.pos < this.ende) {
      this.entfernen(this.pos, this.pos + 1, "komma-zuviel", "Doppeltes Komma", "Komma entfernen");
      this.leer();
    }
    const d = this.t[this.pos];
    if (this.pos >= this.ende || d === "}" || d === "]") {
      if (!this.o.jsonc) this.entfernen(komma, komma + 1, "komma-zuviel", `Komma vor ${this.pos >= this.ende ? "dem Ende" : d} ohne Eintrag danach`, "Komma entfernen");
      return;
    }
    this.zustand = oben.objekt ? "schluessel" : "wert";
  }

  private schliessen(c: string): void {
    const objekt = c === "}";
    let j = this.stapel.length - 1;
    while (j >= 0 && this.stapel[j].objekt !== objekt) j--;
    if (j < 0) return this.entfernen(this.pos, this.pos + 1, "klammer-zuviel", `Überzählige Klammer ${c}`, "Klammer entfernen");
    if (j < this.stapel.length - 1) {
      const fehlend = this.stapel.slice(j + 1).reverse().map(zu).join("");
      // direkt hinter den letzten Wert im offenen Behälter, sonst vor die falsche Klammer
      const an = this.wertBis > this.stapel[j + 1].von ? this.wertBis : this.pos;
      this.einfuegen(an, fehlend, "klammer-fehlt", `${fehlend} fehlt vor ${c}`, `${fehlend} einfügen`);
      this.stapel.length = j + 1;
    }
    const r = this.stapel.pop()!;
    this.pos++;
    this.gelesen(r.von, this.pos);
  }

  /** Hinter dem vollständigen Wert steht noch etwas. Liefert false, wenn der Lauf hier endet. */
  private nachDemWert(): boolean {
    const c = this.t[this.pos];
    if (c === "}" || c === "]") {
      this.entfernen(this.pos, this.pos + 1, "klammer-zuviel", `Überzählige Klammer ${c}`, "Klammer entfernen");
      return true;
    }
    if (this.o.zeilenweise && beginntWert(c)) {
      this.einfuegen(this.pos, "\n", "zeile-teilen", "Zwei Datensätze in einer Zeile", "auf zwei Zeilen verteilen");
      this.zustand = "wert";
      return true;
    }
    this.aufgeben(beginntWert(c) ? "Nach dem ersten Wert folgt ein weiterer; mehrere Datensätze lassen sich als JSON Lines lesen" : `Nach dem Wert folgt noch ${c}`);
    return false;
  }

  /** Der Bereich ist zu Ende, aber Text, Wert oder Behälter sind noch offen: alles schließen, nichts erfinden. */
  private abschluss(): void {
    let neu = "";
    const teile: string[] = [];
    if (this.textOffen) {
      neu += '"';
      teile.push("Text");
      const wert = this.t.slice(this.textOffen.von, this.ende);
      this.hinweis(this.textOffen.von, `${this.textOffen.schluessel ? `${this.textOffen.schluessel} ` : ""}${kurz(wert)}" ist vermutlich abgeschnitten`);
      if (this.zustand === "schluessel") {
        neu += ":null";
        this.hinweis(this.ende, "Der letzte Schlüssel hat keinen Wert, null eingesetzt");
      }
    } else if (this.zustand === "doppelpunkt" || (this.zustand === "wert" && this.nachDoppelpunkt)) {
      neu += this.zustand === "doppelpunkt" ? ":null" : "null";
      this.hinweis(this.ende, `${this.schluessel ?? "Ein Feld"} hat keinen Wert, null eingesetzt`);
    }
    neu += [...this.stapel].reverse().map(zu).join("");
    if (!neu) return;
    const meldung = this.textOffen ? (this.o.zeilenweise ? "Zeile endet mitten im Text" : "Der Text endet mitten in einem Text") : this.o.zeilenweise ? "Zeile endet vor dem Schluss" : "Der Text endet vorzeitig";
    this.einfuegen(this.ende, neu, "abgeschnitten", meldung, schliessenBeschreiben(teile, this.stapel.map((r) => r.objekt), neu));
    if (!this.o.zeilenweise && this.stapel.length) this.hinweis(this.ende, "Was nach dem Ende kam, fehlt; die Reparatur schließt nur, was offen ist");
  }

  // ----- Leerraum und Kommentare -----

  private leer(): void {
    const t = this.t;
    while (this.pos < this.ende) {
      const c = t[this.pos];
      if (istLeerraum(c)) { this.pos++; continue; }
      if (c !== "/" || (t[this.pos + 1] !== "/" && t[this.pos + 1] !== "*")) return;
      const von = this.pos;
      const { bis, offen } = kommentarSpanne(t, von, this.ende);
      if (!this.o.jsonc) this.entfernen(von, bis, "kommentar", "Kommentar ist hier nicht erlaubt", "Kommentar entfernen");
      else if (offen) this.einfuegen(this.ende, "*/", "kommentar", "Kommentar ohne Ende", "*/ ergänzen");
      this.pos = bis;
    }
  }

  // ----- Ergebnis sammeln -----

  private eingriff(von: number, bis: number, neu: string, regel: Regel, meldung: string, vorschlag: string): void {
    this.eingriffe.push({ von, bis, neu, regel, meldung, vorschlag });
  }

  private einfuegen(an: number, neu: string, regel: Regel, meldung: string, vorschlag: string): void {
    this.eingriff(an, an, neu, regel, meldung, vorschlag);
  }

  private entfernen(von: number, bis: number, regel: Regel, meldung: string, vorschlag: string): void {
    this.eingriff(von, bis, "", regel, meldung, vorschlag);
    this.pos = Math.max(this.pos, bis);
  }

  private hinweis(von: number, text: string): void {
    this.hinweise.push({ von, text });
  }

  private aufgeben(meldung: string): void {
    this.ungeloest = { von: this.pos, meldung };
  }
}
