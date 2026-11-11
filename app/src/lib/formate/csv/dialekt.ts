// CSV-Dialekt erkennen: Trennzeichen, Zeilenende und Kopfzeile. Die Probe liest nur den Anfang des Textes und zählt die
// Trennzeichen je Zeile außerhalb von Anführungszeichen; das Trennzeichen mit der gleichmäßigsten Zahl gewinnt.

export type Zeilenende = "lf" | "crlf" | "cr";

/** Mögliche Trennzeichen; bei Gleichstand gewinnt das frühere (Komma kommt auch in Zahlen und Fließtext vor). */
const VORRANG = ["\t", ";", "|", ","] as const;

const ANF = 34; // "
const LF = 10;
const CR = 13;

export interface Dialektprobe {
  /** Gleichmäßigstes Trennzeichen, null wenn keines in den Zeilen vorkommt. */
  readonly trennzeichen: string | null;
  /** Anteil der Zeilen, in denen das Trennzeichen genau so oft vorkommt wie in den meisten (0 bis 1). */
  readonly anteil: number;
  /** Untersuchte, nicht leere Zeilen. */
  readonly zeilen: number;
  /** Erster Zeilenumbruch außerhalb von Anführungszeichen, null ohne Umbruch. */
  readonly zeilenende: Zeilenende | null;
}

/** Untersucht höchstens `maxZeilen` Zeilen bzw. `grenze` Zeichen ab `start`. */
export function dialektProben(text: string, start: number, grenze = 65536, maxZeilen = 50): Dialektprobe {
  const codes = VORRANG.map((t) => t.charCodeAt(0));
  const zaehler = [0, 0, 0, 0];
  const jeZeile: number[][] = [[], [], [], []];
  let zeilenende: Zeilenende | null = null;
  let zeilen = 0;
  let inZeile = false;
  let gequotet = false;
  let feldAnfang = true;
  const ende = Math.min(text.length, start + grenze);
  const zeileAbschliessen = (): void => {
    if (inZeile) {
      for (let t = 0; t < 4; t++) jeZeile[t].push(zaehler[t]);
      zeilen++;
    }
    zaehler.fill(0);
    inZeile = false;
    feldAnfang = true;
  };
  let p = start;
  for (; p < ende && zeilen < maxZeilen; p++) {
    const c = text.charCodeAt(p);
    if (gequotet) {
      if (c === ANF) {
        if (p + 1 < ende && text.charCodeAt(p + 1) === ANF) p++;
        else gequotet = false;
      }
      continue;
    }
    if (c === LF || c === CR) {
      if (zeilenende === null) zeilenende = c === LF ? "lf" : p + 1 < text.length && text.charCodeAt(p + 1) === LF ? "crlf" : "cr";
      if (c === CR && p + 1 < ende && text.charCodeAt(p + 1) === LF) p++;
      zeileAbschliessen();
      continue;
    }
    inZeile = true;
    if (c === ANF && feldAnfang) {
      gequotet = true;
      continue;
    }
    const t = codes.indexOf(c);
    if (t >= 0) {
      zaehler[t]++;
      feldAnfang = true;
    } else feldAnfang = false;
  }
  // Eine Zeile, die an der Grenze abgeschnitten wurde, verfälscht die Zählung; nur am Textende zählt sie mit.
  if (p >= text.length) zeileAbschliessen();

  let bestes: string | null = null;
  let besterAnteil = 0;
  for (let t = 0; t < 4; t++) {
    const anteil = gleichmass(jeZeile[t]);
    if (anteil > besterAnteil) {
      besterAnteil = anteil;
      bestes = VORRANG[t];
    }
  }
  return { trennzeichen: bestes, anteil: besterAnteil, zeilen, zeilenende };
}

/** Anteil der Zeilen mit der häufigsten Zahl; 0, wenn die häufigste Zahl 0 ist. */
function gleichmass(zahlen: readonly number[]): number {
  if (zahlen.length === 0) return 0;
  const haeufigkeit = new Map<number, number>();
  let modus = 0;
  let meiste = 0;
  for (const z of zahlen) {
    const h = (haeufigkeit.get(z) ?? 0) + 1;
    haeufigkeit.set(z, h);
    if (h > meiste || (h === meiste && z > modus)) {
      meiste = h;
      modus = z;
    }
  }
  return modus === 0 ? 0 : meiste / zahlen.length;
}

const ZAHLARTIG = /^\s*[-+]?(\d[\d.,' ]*|[.,]\d+)\s*%?\s*$/;
const DATUMARTIG = /^\s*\d{1,4}[-./]\d{1,2}[-./]\d{1,4}([ T]\d{1,2}:\d{2}(:\d{2})?)?\s*$/;

/** Ist die erste Zeile eine Kopfzeile? Nein, sobald eine ihrer Zellen nach Zahl oder Datum aussieht. */
export function siehtNachKopfzeileAus(zellen: readonly string[]): boolean {
  return !zellen.some((z) => ZAHLARTIG.test(z) || DATUMARTIG.test(z));
}

/** Nutzerwahl für das Trennzeichen lesen; null, wenn keine oder keine gültige Wahl vorliegt. */
export function trennzeichenAusOption(wert: string | number | boolean | undefined): { trennzeichen: string | null; ungueltig: boolean } {
  if (wert === undefined) return { trennzeichen: null, ungueltig: false };
  if (typeof wert !== "string") return { trennzeichen: null, ungueltig: true };
  const t = wert === "tab" || wert === "\\t" ? "\t" : wert;
  if (t.length !== 1 || t === '"' || t === "\n" || t === "\r") return { trennzeichen: null, ungueltig: true };
  return { trennzeichen: t, ungueltig: false };
}
