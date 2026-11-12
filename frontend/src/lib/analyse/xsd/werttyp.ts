// Eingebauten XSD-Typ aus beobachteten Werten ableiten: der engste Typ, zu dem alle Werte passen. Wahrheitswert nur, wenn
// true oder false vorkommt (sonst sind 1 und 0 Zahlen); Ziffern mit führender Null bleiben Text (Postleitzahl,
// Kundennummer); ein leerer Wert passt nur zu xs:string. Leerraum am Rand zählt bei Zahlen und Wahrheitswerten nicht,
// bei Datum und Zeit macht er Text daraus (so prüft libxml2).

export type Werttyp = "boolean" | "integer" | "decimal" | "double" | "date" | "dateTime" | "time" | "string";

const GANZ = /^[+-]?\d+$/;
const DEZIMAL = /^[+-]?(\d+\.\d*|\.\d+|\d+)$/;
const GLEIT = /^[+-]?(\d+\.?\d*|\.\d+)[eE][+-]?\d+$|^(INF|-INF|NaN)$/;
const ZONE = "(Z|[+-]\\d{2}:\\d{2})?";
const DATUM = new RegExp(`^-?\\d{4,}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])${ZONE}$`);
const ZEIT = new RegExp(`^([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(\\.\\d+)?${ZONE}$`);
const ZEITPUNKT = new RegExp(`^-?\\d{4,}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])T([01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(\\.\\d+)?${ZONE}$`);

/** Gibt es den Tag im Kalender (30. Februar nicht)? */
function kalendertag(w: string): boolean {
  const m = /^-?(\d{4,})-(\d{2})-(\d{2})/.exec(w);
  if (!m) return false;
  const [j, mo, t] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const schalt = (j % 4 === 0 && j % 100 !== 0) || j % 400 === 0;
  return t <= [31, schalt ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][mo - 1];
}

/** Führende Null vor weiteren Ziffern: Kennung, keine Zahl */
const fuehrendeNull = (w: string): boolean => /^[+-]?0\d/.test(w);

/** Prüfungen je Typ, vom engsten zum weitesten */
const PASST: readonly [Werttyp, (w: string) => boolean][] = [
  ["boolean", (w) => w === "true" || w === "false" || w === "1" || w === "0"],
  ["integer", (w) => GANZ.test(w) && !fuehrendeNull(w)],
  ["decimal", (w) => DEZIMAL.test(w) && !fuehrendeNull(w)],
  ["double", (w) => (DEZIMAL.test(w) || GLEIT.test(w)) && !fuehrendeNull(w)],
  ["date", (w) => DATUM.test(w) && kalendertag(w)],
  ["dateTime", (w) => ZEITPUNKT.test(w) && kalendertag(w)],
  ["time", (w) => ZEIT.test(w)],
];

export class Wertsammler {
  private moeglich = new Set<Werttyp>(PASST.map(([t]) => t));
  private wahrheit = false;
  anzahl = 0;
  /** Werte, die nicht leer sind */
  belegt = 0;
  /** Werte mit Zeichen, auch nur Leerraum */
  zeichen = 0;

  hinzu(roh: string): void {
    this.anzahl++;
    if (roh.length) this.zeichen++;
    const w = roh.trim();
    if (w !== "" && !this.moeglich.size) { this.belegt++; return; }
    if (w === "") {
      this.moeglich.clear();
      return;
    }
    this.belegt++;
    if (w === "true" || w === "false") this.wahrheit = true;
    // Datum und Zeit mit Leerraum am Rand nimmt libxml2 nicht an (die Norm schon): dann Text
    if (w !== roh) for (const t of ["date", "dateTime", "time"] as const) this.moeglich.delete(t);
    for (const [t, passt] of PASST) if (this.moeglich.has(t) && !passt(w)) this.moeglich.delete(t);
  }

  /** Der engste passende Typ; ohne Werte xs:string */
  typ(): Werttyp {
    if (!this.anzahl) return "string";
    for (const [t] of PASST) {
      if (!this.moeglich.has(t)) continue;
      if (t === "boolean" && !this.wahrheit) continue;
      return t;
    }
    return "string";
  }
}
