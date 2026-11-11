// Formatieren und Kompakt für JSON-artige Texte (JSON mit Kommentaren, NDJSON). Gerechnet wird über die Zeichen des
// Textes, nicht über JSON.parse: Zahlen, Escapes und Kommentare bleiben Rohtext, nur Leerraum ändert sich. Welche Formate
// das können, sagt FORMATIERBAR; die Oberfläche fragt dort nach, statt Formatnamen zu vergleichen (Regel A4).

import type { FormatKennung } from "../kern/format";

export type Umbauart = "formatieren" | "kompakt";

export type Umbau = { readonly ok: true; readonly text: string } | { readonly ok: false; readonly fehler: string };

type Druckart = "schoen" | "einzeilig" | "kompakt";
type Zeichenart = "auf" | "zu" | "komma" | "doppelpunkt" | "wert" | "zeilenkommentar" | "blockkommentar";

const EINRUECKUNG = "  ";
const BOM = "\ufeff";

const istLeer = (c: number): boolean => c === 32 || c === 9 || c === 10 || c === 13 || c === 0xfeff;
const istWortzeichen = (c: number): boolean =>
  (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 43 || c === 45 || c === 46 || c === 95;

/** Schreibt die Zeichen eines JSON-Werts neu: schön eingerückt, einzeilig mit Abständen oder ganz kompakt. */
class Drucker {
  readonly teile: string[] = [];
  private tiefe = 0;
  private offen = false;                               // gerade "{" oder "[" geschrieben
  private davor: "nichts" | "leer" | "zeile" = "nichts"; // was vor dem nächsten Zeichen steht

  constructor(private readonly art: Druckart) {}

  zeichen(art: Zeichenart, roh: string, eigeneZeile: boolean): void {
    switch (art) {
      case "auf":
        this.vor();
        this.teile.push(roh);
        this.tiefe++;
        this.offen = true;
        return;
      case "zu":
        this.tiefe--;
        if (this.offen) this.offen = false;
        else if (this.art === "schoen" || this.davor === "zeile") this.zeile();
        this.davor = "nichts";
        this.teile.push(roh);
        return;
      case "komma":
        this.offen = false;
        this.teile.push(",");
        this.davor = this.art === "schoen" ? "zeile" : this.art === "einzeilig" ? "leer" : "nichts";
        return;
      case "doppelpunkt":
        this.teile.push(":");
        this.davor = this.art === "kompakt" ? "nichts" : "leer";
        return;
      case "wert":
        this.vor();
        this.teile.push(roh);
        return;
      case "blockkommentar":
        if (eigeneZeile && this.art === "schoen" && this.teile.length > 0) this.davor = "zeile";
        else if (this.art !== "kompakt" && this.teile.length > 0 && this.davor === "nichts" && !this.offen) this.davor = "leer";
        this.vor();
        this.teile.push(roh);
        this.davor = this.art === "kompakt" ? "nichts" : "leer";
        return;
      case "zeilenkommentar":
        if (eigeneZeile && this.art === "schoen" && this.teile.length > 0) this.davor = "zeile";
        else if (this.art !== "kompakt" && this.teile.length > 0 && !this.offen) this.davor = "leer";
        this.vor();
        this.teile.push(roh);
        if (this.art === "kompakt") this.teile.push("\n");
        this.davor = this.art === "kompakt" ? "nichts" : "zeile";
        return;
    }
  }

  private vor(): void {
    if (this.offen) {
      this.offen = false;
      if (this.art === "schoen") {
        this.davor = "nichts";
        return this.zeile();
      }
    }
    if (this.davor === "zeile") this.zeile();
    else if (this.davor === "leer") this.teile.push(" ");
    this.davor = "nichts";
  }

  private zeile(): void {
    this.teile.push("\n" + EINRUECKUNG.repeat(Math.max(0, this.tiefe)));
  }
}

const zeileVon = (text: string, pos: number): number => {
  let n = 1;
  for (let i = text.indexOf("\n"); i !== -1 && i < pos; i = text.indexOf("\n", i + 1)) n++;
  return n;
};

/** Zerlegt text[von, bis) in Zeichen und gibt sie an den Drucker; liefert eine Fehlermeldung oder null. */
function drucken(text: string, von: number, bis: number, d: Drucker): string | null {
  const stapel: number[] = [];
  let neueZeile = false;
  const fehler = (pos: number, was: string): string => `Zeile ${zeileVon(text, pos)}: ${was}; bitte zuerst berichtigen`;
  for (let i = von; i < bis; ) {
    const c = text.charCodeAt(i);
    if (istLeer(c)) {
      if (c === 10) neueZeile = true;
      i++;
      continue;
    }
    const eigeneZeile = neueZeile;
    neueZeile = false;
    if (c === 123 || c === 91) {
      stapel.push(c === 123 ? 125 : 93);
      d.zeichen("auf", text[i], eigeneZeile);
      i++;
    } else if (c === 125 || c === 93) {
      if (stapel.pop() !== c) return fehler(i, `Die Klammer ${text[i]} passt nicht`);
      d.zeichen("zu", text[i], eigeneZeile);
      i++;
    } else if (c === 44) {
      d.zeichen("komma", ",", eigeneZeile);
      i++;
    } else if (c === 58) {
      d.zeichen("doppelpunkt", ":", eigeneZeile);
      i++;
    } else if (c === 34) {
      let j = i + 1;
      while (j < bis && text.charCodeAt(j) !== 34 && text.charCodeAt(j) !== 10) j += text.charCodeAt(j) === 92 ? 2 : 1;
      if (j >= bis || text.charCodeAt(j) !== 34) return fehler(i, "Ein Text endet nicht");
      d.zeichen("wert", text.slice(i, j + 1), eigeneZeile);
      i = j + 1;
    } else if (c === 47 && text.charCodeAt(i + 1) === 47) {
      let j = text.indexOf("\n", i);
      if (j === -1 || j > bis) j = bis;
      if (text.charCodeAt(j - 1) === 13) j--;
      d.zeichen("zeilenkommentar", text.slice(i, j), eigeneZeile);
      i = j;
    } else if (c === 47 && text.charCodeAt(i + 1) === 42) {
      const j = text.indexOf("*/", i + 2);
      if (j === -1 || j + 2 > bis) return fehler(i, "Ein Kommentar endet nicht");
      d.zeichen("blockkommentar", text.slice(i, j + 2), eigeneZeile);
      i = j + 2;
    } else if (istWortzeichen(c)) {
      let j = i + 1;
      while (j < bis && istWortzeichen(text.charCodeAt(j))) j++;
      d.zeichen("wert", text.slice(i, j), eigeneZeile);
      i = j;
    } else {
      return fehler(i, `Unerwartetes Zeichen ${text[i]}`);
    }
  }
  return stapel.length > 0 ? fehler(bis, "Eine Klammer wird nicht geschlossen") : null;
}

function jsonUmbauen(text: string, art: Umbauart): Umbau {
  const d = new Drucker(art === "formatieren" ? "schoen" : "kompakt");
  const fehler = drucken(text, 0, text.length, d);
  if (fehler) return { ok: false, fehler };
  const anfang = text.startsWith(BOM) ? BOM : "";
  const ende = text.endsWith("\n") ? (text.endsWith("\r\n") ? "\r\n" : "\n") : "";
  return { ok: true, text: anfang + d.teile.join("") + ende };
}

/** NDJSON bleibt ein Wert je Zeile; kaputte Zeilen bleiben unverändert, Kompakt lässt Leerzeilen weg. */
function ndjsonUmbauen(text: string, art: Umbauart): Umbau {
  const teile: string[] = [];
  let anfang = 0;
  while (anfang <= text.length) {
    const umbruch = text.indexOf("\n", anfang);
    const ende = umbruch === -1 ? text.length : umbruch;
    const cr = ende > anfang && text.charCodeAt(ende - 1) === 13;
    const zeile = text.slice(anfang, cr ? ende - 1 : ende);
    const leer = zeile.trim() === "";
    if (!(leer && art === "kompakt")) {
      let neu = "";
      if (!leer) {
        const d = new Drucker(art === "formatieren" ? "einzeilig" : "kompakt");
        neu = drucken(zeile, 0, zeile.length, d) === null ? d.teile.join("") : zeile;
      }
      teile.push(neu + (umbruch === -1 ? "" : cr ? "\r\n" : "\n"));
    }
    if (umbruch === -1) break;
    anfang = umbruch + 1;
  }
  return { ok: true, text: teile.join("") };
}

const RECHNER: Partial<Record<FormatKennung, (text: string, art: Umbauart) => Umbau>> = {
  json: jsonUmbauen,
  ndjson: ndjsonUmbauen,
};

/** Formate, deren Text sich formatieren, kompakt schreiben und nach Schlüsseln sortieren lässt. */
export const FORMATIERBAR: readonly FormatKennung[] = Object.keys(RECHNER) as FormatKennung[];

/** Formatieren (eingerückt) oder Kompakt (ohne Leerraum); ändert nur Leerraum, nie Werte. */
export function umbauen(kennung: FormatKennung, art: Umbauart, text: string): Umbau {
  const rechner = RECHNER[kennung];
  if (!rechner) return { ok: false, fehler: "Dieses Format lässt sich nicht formatieren" };
  return rechner(text, art);
}
