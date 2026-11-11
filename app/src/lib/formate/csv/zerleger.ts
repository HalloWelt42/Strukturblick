// Zerlegt CSV-Text Datensatz für Datensatz in Zellen mit ihren Spannen. Der Zerleger hält seine Felder und benutzt sie
// für jeden Datensatz wieder, damit große Dateien ohne Objekt je Zelle durchlaufen. Zeilenenden LF, CRLF und CR gelten
// gleichermaßen, auch gemischt.

const ANF = 34; // "
const LF = 10;
const CR = 13;

export class Zerleger {
  /** Zahl der Zellen im zuletzt gelesenen Datensatz. */
  anzahl = 0;
  /** Ganze Zelle, bei Zellen in Anführungszeichen samt diesen. */
  readonly von: number[] = [];
  readonly bis: number[] = [];
  /** Inhalt ohne Anführungszeichen. */
  readonly inhaltVon: number[] = [];
  readonly inhaltBis: number[] = [];
  /** Dekodierter Inhalt, wenn er vom Textausschnitt abweicht (verdoppelte Anführungszeichen). */
  readonly dekodiert: (string | undefined)[] = [];
  /** Ende des letzten Zellinhalts (vor dem Zeilenende) und Anfang des nächsten Datensatzes. */
  ende = 0;
  weiter = 0;
  /** Zeilenumbrüche im Datensatz, samt dem abschließenden. */
  umbrueche = 0;
  /** Erstes nicht geschlossenes Anführungszeichen im Datensatz (Position), sonst -1. */
  offenesAnfuehrungszeichen = -1;
  /** Erste Zelle mit Zeichen nach dem schließenden Anführungszeichen: Spanne dieser Zeichen, sonst -1. */
  restVon = -1;
  restBis = -1;

  constructor(
    private readonly text: string,
    private readonly trenn: number,
  ) {}

  /** Liest den Datensatz ab `start` (der nicht am Textende und nicht auf einem Zeilenumbruch liegen soll). */
  lesen(start: number): void {
    const text = this.text;
    const n = text.length;
    this.anzahl = 0;
    this.umbrueche = 0;
    this.offenesAnfuehrungszeichen = -1;
    this.restVon = -1;
    this.restBis = -1;
    let p = start;
    for (;;) {
      p = text.charCodeAt(p) === ANF && p < n ? this.gequotet(p) : this.roh(p);
      const c = p < n ? text.charCodeAt(p) : -1;
      if (c === this.trenn) {
        p++;
        continue;
      }
      this.ende = p;
      if (c === CR) {
        p++;
        if (p < n && text.charCodeAt(p) === LF) p++;
        this.umbrueche++;
      } else if (c === LF) {
        p++;
        this.umbrueche++;
      }
      this.weiter = p;
      return;
    }
  }

  private zelle(von: number, bis: number, inhaltVon: number, inhaltBis: number, dekodiert: string | undefined): void {
    const i = this.anzahl++;
    this.von[i] = von;
    this.bis[i] = bis;
    this.inhaltVon[i] = inhaltVon;
    this.inhaltBis[i] = inhaltBis;
    this.dekodiert[i] = dekodiert;
  }

  /** Ende einer Zelle ohne Anführungszeichen. */
  private rohEnde(p: number): number {
    const text = this.text;
    const n = text.length;
    const trenn = this.trenn;
    while (p < n) {
      const c = text.charCodeAt(p);
      if (c === trenn || c === LF || c === CR) break;
      p++;
    }
    return p;
  }

  private roh(p: number): number {
    const e = this.rohEnde(p);
    this.zelle(p, e, p, e, undefined);
    return e;
  }

  /** Zelle ab einem öffnenden Anführungszeichen bei `p`; gibt das Ende der Zelle zurück. */
  private gequotet(p: number): number {
    const text = this.text;
    const n = text.length;
    let teile: string | undefined;
    let stueck = p + 1;
    let q = p + 1;
    let umbrueche = 0;
    let schluss = -1;
    while (q < n) {
      const c = text.charCodeAt(q);
      if (c === ANF) {
        if (q + 1 < n && text.charCodeAt(q + 1) === ANF) {
          teile = (teile ?? "") + text.slice(stueck, q + 1);
          q += 2;
          stueck = q;
          continue;
        }
        schluss = q;
        break;
      }
      if (c === LF || (c === CR && !(q + 1 < n && text.charCodeAt(q + 1) === LF))) umbrueche++;
      q++;
    }
    // Ohne schließendes Anführungszeichen sind alle späteren paarweise verdoppelt; eine spätere Zelle, die mit einem
    // Anführungszeichen beginnt, schließt daher sofort. Die Suche bis zum Textende geschieht also höchstens einmal.
    if (schluss < 0) return this.offen(p);
    this.umbrueche += umbrueche;
    let dekodiert = teile === undefined ? undefined : teile + text.slice(stueck, schluss);
    let inhaltBis = schluss;
    let e = schluss + 1;
    const c = e < n ? text.charCodeAt(e) : -1;
    if (c !== -1 && c !== this.trenn && c !== LF && c !== CR) {
      // Zeichen nach dem schließenden Anführungszeichen: zur Zelle nehmen, damit nichts verloren geht.
      const restEnde = this.rohEnde(e);
      if (this.restVon < 0) {
        this.restVon = e;
        this.restBis = restEnde;
      }
      dekodiert = (dekodiert ?? text.slice(p + 1, schluss)) + text.slice(e, restEnde);
      inhaltBis = restEnde;
      e = restEnde;
    }
    this.zelle(p, e, p + 1, inhaltBis, dekodiert);
    return e;
  }

  /** Nicht geschlossenes Anführungszeichen: die Zelle gilt als Rohtext bis zum Trennzeichen oder Zeilenende. */
  private offen(p: number): number {
    if (this.offenesAnfuehrungszeichen < 0) this.offenesAnfuehrungszeichen = p;
    return this.roh(p);
  }

  /** Inhalt der Zelle `i` als Text. */
  inhalt(i: number): string {
    return this.dekodiert[i] ?? this.text.slice(this.inhaltVon[i], this.inhaltBis[i]);
  }

  istGequotet(i: number): boolean {
    return this.inhaltVon[i] !== this.von[i];
  }
}
