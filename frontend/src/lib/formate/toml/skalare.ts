// TOML: einfache Werte und Schlüsselteile lesen (Texte in vier Formen, Zahlen, Datum und Zeit, Wahrheitswerte).
// Jede Funktion bekommt den Text und eine Stelle und liefert Ende, Inhalt und, wo er vom Text abweicht, den
// dekodierten Inhalt. Fehler werfen TomlFehler mit Spanne; der Leser macht daraus eine Diagnose.

export class TomlFehler extends Error {
  constructor(meldung: string, readonly von: number, readonly bis: number) {
    super(meldung);
  }
}

export interface Gelesen {
  readonly bis: number;                 // hinter dem Wert
  readonly inhaltVon: number;
  readonly inhaltBis: number;
  readonly dekodiert?: string;          // nur wenn er vom Textausschnitt abweicht
}

const ESCAPES: Readonly<Record<string, string>> = { b: "\b", t: "\t", n: "\n", f: "\f", r: "\r", e: "\u001b", '"': '"', "\\": "\\" };

/** Text in einer der vier Formen ab `von` ("...", """...""", '...', '''...''') */
export function textLesen(t: string, von: number): Gelesen {
  const q = t[von];
  const mehrzeilig = t.startsWith(q.repeat(3), von);
  return q === '"' ? (mehrzeilig ? mehrzeiligGrund(t, von) : grund(t, von)) : mehrzeilig ? mehrzeiligWoertlich(t, von) : woertlich(t, von);
}

function grund(t: string, von: number): Gelesen {
  let aus = "";
  let anders = false;
  let i = von + 1;
  while (i < t.length) {
    const c = t[i];
    if (c === '"') return { bis: i + 1, inhaltVon: von + 1, inhaltBis: i, dekodiert: anders ? aus : undefined };
    if (c === "\n" || c === "\r") break;
    if (c === "\\") {
      const [ersatz, laenge] = escape(t, i);
      aus += ersatz;
      anders = true;
      i += laenge;
      continue;
    }
    aus += c;
    i++;
  }
  throw new TomlFehler("Text ohne schließendes Anführungszeichen", von, i);
}

function woertlich(t: string, von: number): Gelesen {
  const ende = t.indexOf("'", von + 1);
  const zeile = t.indexOf("\n", von + 1);
  if (ende === -1 || (zeile !== -1 && zeile < ende)) throw new TomlFehler("Text ohne schließendes Hochkomma", von, zeile === -1 ? t.length : zeile);
  return { bis: ende + 1, inhaltVon: von + 1, inhaltBis: ende };
}

/** Ende eines mehrzeiligen Texts: drei Zeichen, dahinter bis zu zwei weitere, die noch zum Inhalt gehören */
function schluss(t: string, ab: number, q: string): number {
  let j = ab;
  for (;;) {
    j = t.indexOf(q.repeat(3), j);
    if (j === -1) return -1;
    if (q === '"') {
      let rueck = 0;
      while (t[j - 1 - rueck] === "\\") rueck++;
      if (rueck % 2 === 1) { j++; continue; }
    }
    let extra = 0;
    while (extra < 2 && t[j + 3 + extra] === q) extra++;
    return j + extra;
  }
}

/** Ein Zeilenumbruch direkt nach den öffnenden Zeichen gehört nicht zum Inhalt */
const nachOeffnen = (t: string, i: number): number => (t[i] === "\n" ? i + 1 : t.startsWith("\r\n", i) ? i + 2 : i);

function mehrzeiligGrund(t: string, von: number): Gelesen {
  const anfang = nachOeffnen(t, von + 3);
  const ende = schluss(t, anfang, '"');
  if (ende === -1) throw new TomlFehler('Mehrzeiliger Text ohne """ am Ende', von, t.length);
  let aus = "";
  let i = anfang;
  while (i < ende) {
    const c = t[i];
    if (c !== "\\") { aus += c; i++; continue; }
    // Rückstrich am Zeilenende: Umbruch und Leerraum danach fallen weg
    let j = i + 1;
    while (t[j] === " " || t[j] === "\t") j++;
    if (t[j] === "\n" || t.startsWith("\r\n", j)) {
      while (j < ende && /\s/.test(t[j])) j++;
      i = j;
      continue;
    }
    const [ersatz, laenge] = escape(t, i);
    aus += ersatz;
    i += laenge;
  }
  const roh = t.slice(anfang, ende);
  return { bis: ende + 3, inhaltVon: anfang, inhaltBis: ende, dekodiert: aus === roh ? undefined : aus };
}

function mehrzeiligWoertlich(t: string, von: number): Gelesen {
  const anfang = nachOeffnen(t, von + 3);
  const ende = schluss(t, anfang, "'");
  if (ende === -1) throw new TomlFehler("Mehrzeiliger Text ohne ''' am Ende", von, t.length);
  return { bis: ende + 3, inhaltVon: anfang, inhaltBis: ende };
}

/** Escape ab dem Rückstrich bei `i`: Ersatz und Länge im Text */
function escape(t: string, i: number): [string, number] {
  const e = t[i + 1] ?? "";
  if (ESCAPES[e] !== undefined) return [ESCAPES[e], 2];
  const stellen = e === "u" ? 4 : e === "U" ? 8 : e === "x" ? 2 : 0;
  const hex = t.slice(i + 2, i + 2 + stellen);
  if (stellen && /^[0-9a-fA-F]+$/.test(hex) && hex.length === stellen) {
    const cp = parseInt(hex, 16);
    if (cp <= 0x10ffff && (cp < 0xd800 || cp > 0xdfff)) return [String.fromCodePoint(cp), 2 + stellen];
  }
  throw new TomlFehler(`Ungültige Escape-Sequenz \\${e}`, i, i + 2 + stellen);
}

// ----- Zahlen, Datum, Zeit -----

const DATUM = /^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:[Zz]|[+-]\d{2}:\d{2})?)?/;
const ZEIT = /^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?/;
const GANZ = /^[+-]?(?:0|[1-9](?:_?\d)*)$/;
const BASIS = /^0(?:x[0-9a-fA-F](?:_?[0-9a-fA-F])*|o[0-7](?:_?[0-7])*|b[01](?:_?[01])*)$/;
const KOMMA = /^[+-]?(?:0|[1-9](?:_?\d)*)(?:\.\d(?:_?\d)*)?(?:[eE][+-]?\d(?:_?\d)*)?$/;
const BESONDERS = /^[+-]?(?:inf|nan)$/;

/** Datum, Zeit oder Datum mit Zeit ab `von`; null, wenn dort keins steht */
export function datumLesen(t: string, von: number): Gelesen | null {
  const ausschnitt = t.slice(von, von + 40);
  const m = DATUM.exec(ausschnitt) ?? ZEIT.exec(ausschnitt);
  return m ? { bis: von + m[0].length, inhaltVon: von, inhaltBis: von + m[0].length } : null;
}

/** Zahl ab `von`: ganz, zur Basis 16, 8 oder 2, mit Komma, inf oder nan; dekodiert als Zahl in Dezimalschreibweise */
export function zahlLesen(t: string, von: number): Gelesen | null {
  const m = /^[+-]?(?:[0-9A-Za-z_.]|(?<=[eE])[+-])+/.exec(t.slice(von, von + 120));
  if (!m) return null;
  const roh = m[0];
  const bis = von + roh.length;
  if (BESONDERS.test(roh)) return { bis, inhaltVon: von, inhaltBis: bis, dekodiert: roh.replace("inf", "Infinity").replace("nan", "NaN").replace(/^\+/, "") };
  if (BASIS.test(roh)) return { bis, inhaltVon: von, inhaltBis: bis, dekodiert: BigInt(roh.replaceAll("_", "")).toString() };
  if (GANZ.test(roh) || KOMMA.test(roh)) {
    const ohne = roh.replaceAll("_", "").replace(/^\+/, "");
    return { bis, inhaltVon: von, inhaltBis: bis, dekodiert: ohne === roh ? undefined : ohne };
  }
  return null;
}

// ----- Schlüssel -----

export interface Schluesselteil {
  readonly name: string;
  /** Spanne für den Index: bei Schlüsseln in Anführungszeichen ohne diese */
  readonly von: number;
  readonly bis: number;
  /** Anfang samt Anführungszeichen */
  readonly anfang: number;
  readonly dekodiert?: string;
}

const istBlank = (c: string): boolean => c === " " || c === "\t";

/** Schlüssel ab `von`, auch mit Punkten (a."b c".d); liefert die Teile und das Ende */
export function schluesselLesen(t: string, von: number): { teile: Schluesselteil[]; bis: number } {
  const teile: Schluesselteil[] = [];
  let i = von;
  for (;;) {
    const c = t[i];
    if (c === '"' || c === "'") {
      if (t.startsWith(c.repeat(3), i)) throw new TomlFehler("Mehrzeilige Texte gehen nicht als Schlüssel", i, i + 3);
      const g = textLesen(t, i);
      const name = g.dekodiert ?? t.slice(g.inhaltVon, g.inhaltBis);
      teile.push({ name, von: g.inhaltVon, bis: g.inhaltBis, anfang: i, dekodiert: g.dekodiert });
      i = g.bis;
    } else {
      const m = /^[A-Za-z0-9_-]+/.exec(t.slice(i, i + 256));
      if (!m) throw new TomlFehler(c === undefined || c === "\n" ? "Hier fehlt ein Schlüssel" : `Unerwartetes Zeichen ${c} im Schlüssel`, i, i + 1);
      teile.push({ name: m[0], von: i, bis: i + m[0].length, anfang: i });
      i += m[0].length;
    }
    let j = i;
    while (istBlank(t[j])) j++;
    if (t[j] !== ".") return { teile, bis: i };
    j++;
    while (istBlank(t[j])) j++;
    i = j;
  }
}
