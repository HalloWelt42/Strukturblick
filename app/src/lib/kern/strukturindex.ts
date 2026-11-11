// Strukturindex: die Lesart eines Textes als Baum in typisierten Feldern (Leitgedanke 5). Knoten sind Zahlen (0 ist die
// Wurzel); Werte und Schlüssel liegen nicht als Objekte vor, sondern werden bei Bedarf aus dem Text gelesen. Alle
// Positionen sind UTF-16-Einheiten wie im Editor. Die Felder lassen sich ohne Kopie vom Worker übertragen.

export const KnotenArt = {
  objekt: 0,
  liste: 1,
  text: 2,
  zahl: 3,
  wahrheitswert: 4,
  nichts: 5,
} as const;
export type KnotenArt = (typeof KnotenArt)[keyof typeof KnotenArt];

export const KNOTEN_NAME: Record<KnotenArt, string> = {
  0: "Objekt",
  1: "Liste",
  2: "Text",
  3: "Zahl",
  4: "Wahrheitswert",
  5: "Nichts",
};

export const istBehaelter = (art: number): boolean => art === KnotenArt.objekt || art === KnotenArt.liste;

/** Kein Knoten / keine Position */
export const KEIN = -1;

export interface Strukturindex {
  readonly anzahl: number;
  readonly art: Uint8Array;
  readonly eltern: Int32Array;
  readonly erstesKind: Int32Array;
  readonly naechstes: Int32Array;
  readonly kinder: Int32Array;            // Zahl der direkten Kinder
  readonly von: Int32Array;               // ganzer Wert im Text, bei Texten mit Anführungszeichen
  readonly bis: Int32Array;
  readonly inhaltVon: Int32Array;         // Inhalt ohne Anführungszeichen; bei Behältern wie von/bis
  readonly inhaltBis: Int32Array;
  readonly schluesselVon: Int32Array;     // Schlüssel im Text (roh), KEIN bei Listeneinträgen und der Wurzel
  readonly schluesselBis: Int32Array;
  /** Inhalte, die vom Textausschnitt abweichen (Escapes, gefaltete YAML-Texte, verdoppelte Anführungszeichen) */
  readonly dekodiert: ReadonlyMap<number, string>;
  /** Schlüssel, die vom Textausschnitt abweichen (Escapes, CSV-Kopfzeile in Anführungszeichen) */
  readonly schluesselDekodiert: ReadonlyMap<number, string>;
  /** Knoten, die nur auf einen anderen Teil verweisen (YAML-Alias): für Menschen, etwa "Verweis auf &standard, Zeile 3" */
  readonly verweise: ReadonlyMap<number, string>;
}

/** Baut einen Index in der Reihenfolge des Textes auf (Eltern vor Kindern, Kinder in Textreihenfolge). */
export class IndexBauer {
  private n = 0;
  private art = new Uint8Array(1024);
  private eltern = new Int32Array(1024);
  private erstesKind = new Int32Array(1024);
  private naechstes = new Int32Array(1024);
  private letztesKind = new Int32Array(1024);
  private kinder = new Int32Array(1024);
  private von = new Int32Array(1024);
  private bis = new Int32Array(1024);
  private inhaltVon = new Int32Array(1024);
  private inhaltBis = new Int32Array(1024);
  private schluesselVon = new Int32Array(1024);
  private schluesselBis = new Int32Array(1024);
  private readonly dekodiert = new Map<number, string>();
  private readonly schluesselDekodiert = new Map<number, string>();
  private readonly verweise = new Map<number, string>();

  private wachsen(): void {
    const groesser = <T extends Int32Array | Uint8Array>(a: T): T => {
      const neu = new (a.constructor as { new (n: number): T })(a.length * 2);
      neu.set(a);
      return neu;
    };
    this.art = groesser(this.art);
    this.eltern = groesser(this.eltern);
    this.erstesKind = groesser(this.erstesKind);
    this.naechstes = groesser(this.naechstes);
    this.letztesKind = groesser(this.letztesKind);
    this.kinder = groesser(this.kinder);
    this.von = groesser(this.von);
    this.bis = groesser(this.bis);
    this.inhaltVon = groesser(this.inhaltVon);
    this.inhaltBis = groesser(this.inhaltBis);
    this.schluesselVon = groesser(this.schluesselVon);
    this.schluesselBis = groesser(this.schluesselBis);
  }

  /** Neuen Knoten anlegen und an `eltern` hängen (KEIN für die Wurzel). Ende und Inhalt folgen mit `schliessen`. */
  knoten(art: KnotenArt, eltern: number, von: number, schluessel?: { von: number; bis: number; dekodiert?: string }): number {
    if (this.n === this.art.length) this.wachsen();
    const k = this.n++;
    this.art[k] = art;
    this.eltern[k] = eltern;
    this.erstesKind[k] = KEIN;
    this.naechstes[k] = KEIN;
    this.letztesKind[k] = KEIN;
    this.kinder[k] = 0;
    this.von[k] = von;
    this.bis[k] = von;
    this.inhaltVon[k] = von;
    this.inhaltBis[k] = von;
    this.schluesselVon[k] = schluessel ? schluessel.von : KEIN;
    this.schluesselBis[k] = schluessel ? schluessel.bis : KEIN;
    if (schluessel?.dekodiert !== undefined) this.schluesselDekodiert.set(k, schluessel.dekodiert);
    if (eltern !== KEIN) {
      if (this.erstesKind[eltern] === KEIN) this.erstesKind[eltern] = k;
      else this.naechstes[this.letztesKind[eltern]] = k;
      this.letztesKind[eltern] = k;
      this.kinder[eltern]++;
    }
    return k;
  }

  /** Spanne eines Knotens festlegen; `inhalt` ohne Anführungszeichen, `dekodiert` wenn der Inhalt vom Text abweicht. */
  schliessen(k: number, bis: number, inhalt?: { von: number; bis: number; dekodiert?: string }): void {
    this.bis[k] = bis;
    this.inhaltVon[k] = inhalt ? inhalt.von : this.von[k];
    this.inhaltBis[k] = inhalt ? inhalt.bis : bis;
    if (inhalt?.dekodiert !== undefined) this.dekodiert.set(k, inhalt.dekodiert);
  }

  /** Einfacher Wert in einem Schritt. */
  blatt(art: KnotenArt, eltern: number, von: number, bis: number, schluessel?: { von: number; bis: number; dekodiert?: string }, inhalt?: { von: number; bis: number; dekodiert?: string }): number {
    const k = this.knoten(art, eltern, von, schluessel);
    this.schliessen(k, bis, inhalt);
    return k;
  }

  /** Knoten als Verweis kennzeichnen (Text für Menschen). */
  verweis(k: number, beschreibung: string): void {
    this.verweise.set(k, beschreibung);
  }

  get anzahl(): number {
    return this.n;
  }

  fertig(): Strukturindex {
    const n = this.n;
    return {
      anzahl: n,
      art: this.art.slice(0, n),
      eltern: this.eltern.slice(0, n),
      erstesKind: this.erstesKind.slice(0, n),
      naechstes: this.naechstes.slice(0, n),
      kinder: this.kinder.slice(0, n),
      von: this.von.slice(0, n),
      bis: this.bis.slice(0, n),
      inhaltVon: this.inhaltVon.slice(0, n),
      inhaltBis: this.inhaltBis.slice(0, n),
      schluesselVon: this.schluesselVon.slice(0, n),
      schluesselBis: this.schluesselBis.slice(0, n),
      dekodiert: this.dekodiert,
      schluesselDekodiert: this.schluesselDekodiert,
      verweise: this.verweise,
    };
  }
}

// ----- Lesen --------------------------------------------------------------------------------------------------------

/** Inhalt eines einfachen Werts als Text (Rohtext ohne Anführungszeichen, Escapes aufgelöst). */
export function inhalt(index: Strukturindex, text: string, k: number): string {
  return index.dekodiert.get(k) ?? text.slice(index.inhaltVon[k], index.inhaltBis[k]);
}

/** Schlüssel eines Knotens; null bei Listeneinträgen und der Wurzel. */
export function schluessel(index: Strukturindex, text: string, k: number): string | null {
  if (index.schluesselVon[k] === KEIN) return null;
  return index.schluesselDekodiert.get(k) ?? text.slice(index.schluesselVon[k], index.schluesselBis[k]);
}

/** Stelle in der Liste der Geschwister (0 ist das erste Kind). */
export function stelle(index: Strukturindex, k: number): number {
  const e = index.eltern[k];
  if (e === KEIN) return 0;
  let i = 0;
  for (let c = index.erstesKind[e]; c !== KEIN && c !== k; c = index.naechstes[c]) i++;
  return i;
}

/** Direkte Kinder in Textreihenfolge. */
export function* kinderVon(index: Strukturindex, k: number): Generator<number> {
  for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) yield c;
}

/** Tiefe eines Knotens (Wurzel 0). */
export function tiefe(index: Strukturindex, k: number): number {
  let t = 0;
  for (let e = index.eltern[k]; e !== KEIN; e = index.eltern[e]) t++;
  return t;
}

/** Innerster Knoten, dessen Spanne die Position enthält (für Cursor im Editor). */
export function knotenAn(index: Strukturindex, position: number): number {
  if (index.anzahl === 0) return KEIN;
  let k = 0;
  for (;;) {
    let tiefer = KEIN;
    for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) {
      // Der Schlüssel zählt nur mit, wenn er im Elternwert direkt vor dem Wert steht (bei CSV liegt er in der Kopfzeile)
      const s = index.schluesselVon[c];
      const anfang = s !== KEIN && s >= index.von[k] && index.schluesselBis[c] <= index.von[c] ? s : index.von[c];
      if (position >= anfang && position <= index.bis[c]) {
        tiefer = c;
        break;
      }
    }
    if (tiefer === KEIN) return k;
    k = tiefer;
  }
}
