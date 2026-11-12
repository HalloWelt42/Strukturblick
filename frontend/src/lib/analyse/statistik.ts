// Statistik (entwuerfe/statistik.html): Kennzahlen des ganzen Dokuments und ein Profil je Feld unterhalb einer Liste.
// Felder sind Musterpfade relativ zu den Einträgen ("kunde.plz", "positionen[].preis"); gezählt wird, wie oft ein
// Feld vorkommt, wie oft es fehlen könnte (Zahl der Objekte, in denen es stehen könnte), seine Typen, verschiedene
// Werte, Längen, Spannen und Muster. Ein Durchgang über die Knoten, rein und ohne Browser.

import { inhalt, KEIN, KnotenArt, schluessel, type Strukturindex } from "../kern/strukturindex";
import { siehtAusWie } from "./spaltenprofil";
import { zahlenwert } from "./tabelle";
import { datumAlsIso } from "./bereinigen/typen";
import { spanne } from "./klassen";

/** Bis zu so vielen verschiedenen Werten je Feld wird genau gezählt, darüber nur "mehr als" */
export const VERSCHIEDENE_HOECHSTENS = 50_000;
/** Anteil, ab dem ein Muster (Datum, Zahl) für ein Feld gilt */
const MUSTER_ANTEIL = 0.95;

export interface Kennzahlen {
  readonly knoten: number;
  readonly tiefe: number;
  /** Knoten an der tiefsten Stelle (für den Pfad in der Anzeige) */
  readonly tiefsterKnoten: number;
  /** Größe in Byte (UTF-8) */
  readonly groesse: number;
  readonly arten: readonly number[];          // Anzahl je KnotenArt (Stelle = Art)
}

export interface Feld {
  /** Musterpfad relativ zu den Einträgen ("" = der Eintrag selbst) */
  readonly pfad: string;
  /** Anzeige: Vorsilbe ("positionen[].") und Name ("preis") */
  readonly vorsilbe: string;
  readonly name: string;
  /** Erster Knoten mit diesem Pfad (zum Wählen) */
  readonly erster: number;
  readonly vorkommen: number;
  /** In wie vielen Objekten das Feld stehen könnte; null bei Listeneinträgen ([]) */
  readonly moeglich: number | null;
  readonly arten: readonly number[];          // Anzahl je KnotenArt
  /** null bei Behältern; bei mehr als VERSCHIEDENE_HOECHSTENS gilt `verschiedeneMehr` */
  readonly verschiedene: number | null;
  readonly verschiedeneMehr: boolean;
  readonly textLaenge: { readonly min: number; readonly max: number } | null;
  /** Spanne der Texte: bei Datum nach Datum (als JJJJ-MM-TT), bei Zahlen nach Zahl (wie geschrieben), sonst nur bei
   *  gleich langen Texten nach dem Alphabet (Kennungen, Postleitzahlen); sonst null */
  readonly textBereich: { readonly min: string; readonly max: string } | null;
  readonly zahlen: Float64Array;
  readonly ganz: boolean;
  readonly wahr: number;
  readonly falsch: number;
  readonly listenLaenge: { readonly min: number; readonly max: number } | null;
  readonly nichts: number;
  readonly leerText: number;
  /** Texte, die wie Datum, Zahl oder Betrag aussehen, und mit führender Null */
  readonly wieDatum: number;
  readonly wieZahl: number;
  readonly fuehrendeNullen: number;
  /** Texte, die wie Datum mit Uhrzeit aussehen, und Texte nur aus Ziffern */
  readonly datumZeit: number;
  /** Davon in ISO-Form (JJJJ-MM-TT, mit Zeit nach RFC 3339), wie JSON Schema "date" und "date-time" sie verlangt */
  readonly isoDatum: number;
  readonly isoDatumZeit: number;
  readonly nurZiffern: number;
  /** Wie viele Objekte an diesem Pfad stehen (darin können Felder stehen) */
  readonly objekte: number;
}

export interface Statistik {
  readonly kennzahlen: Kennzahlen;
  /** Knoten, dessen Einträge profiliert werden (Liste) oder die Wurzel */
  readonly basis: number;
  readonly eintraege: number;
  readonly felder: readonly Feld[];
}

function utf8Laenge(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

export function kennzahlen(index: Strukturindex, text: string): Kennzahlen {
  const arten = new Array<number>(6).fill(0);
  const tiefen = new Int32Array(index.anzahl);
  let tiefe = 0;
  let tiefsterKnoten = index.anzahl ? 0 : KEIN;
  for (let k = 0; k < index.anzahl; k++) {
    arten[index.art[k]]++;
    const e = index.eltern[k];
    // Eltern stehen im Index vor ihren Kindern
    tiefen[k] = e === KEIN ? 0 : tiefen[e] + 1;
    if (tiefen[k] > tiefe) {
      tiefe = tiefen[k];
      tiefsterKnoten = k;
    }
  }
  return { knoten: index.anzahl, tiefe, tiefsterKnoten, groesse: utf8Laenge(text), arten };
}

class Sammler {
  vorkommen = 0;
  readonly arten = new Array<number>(6).fill(0);
  readonly werte = new Set<string>();
  mehr = false;
  laengeMin = Infinity;
  laengeMax = -Infinity;
  textMin: string | null = null;
  textMax: string | null = null;
  texte = 0;
  readonly zahlen: number[] = [];
  ganz = true;
  wahr = 0;
  falsch = 0;
  listeMin = Infinity;
  listeMax = -Infinity;
  nichts = 0;
  leerText = 0;
  wieDatum = 0;
  wieZahl = 0;
  fuehrendeNullen = 0;
  datumZeit = 0;
  isoDatum = 0;
  isoDatumZeit = 0;
  nurZiffern = 0;
  datumMin: string | null = null;
  datumMax: string | null = null;
  zahlMin: { z: number; s: string } | null = null;
  zahlMax: { z: number; s: string } | null = null;
  /** Objekte mit diesem Pfad: darin können Felder stehen */
  objekte = 0;
  constructor(readonly erster: number, readonly vorsilbe: string, readonly name: string) {}

  zaehlen(index: Strukturindex, text: string, k: number): void {
    this.vorkommen++;
    const art = index.art[k];
    this.arten[art]++;
    if (art === KnotenArt.objekt) { this.objekte++; return; }
    if (art === KnotenArt.liste) {
      const n = index.kinder[k];
      if (n < this.listeMin) this.listeMin = n;
      if (n > this.listeMax) this.listeMax = n;
      return;
    }
    if (art === KnotenArt.nichts) { this.nichts++; return; }
    const s = inhalt(index, text, k);
    if (!this.mehr) {
      this.werte.add(s);
      if (this.werte.size > VERSCHIEDENE_HOECHSTENS) { this.mehr = true; this.werte.clear(); }
    }
    if (art === KnotenArt.wahrheitswert) { if (s === "true") this.wahr++; else this.falsch++; return; }
    if (art === KnotenArt.zahl) {
      const z = Number(s);
      if (!Number.isNaN(z)) { this.zahlen.push(z); if (!Number.isSafeInteger(z) || /[.eE]/.test(s)) this.ganz = false; }
      return;
    }
    // Text
    this.texte++;
    if (s === "") this.leerText++;
    if (s.length < this.laengeMin) this.laengeMin = s.length;
    if (s.length > this.laengeMax) this.laengeMax = s.length;
    if (this.textMin === null || s < this.textMin) this.textMin = s;
    if (this.textMax === null || s > this.textMax) this.textMax = s;
    const a = siehtAusWie(s);
    if (/^\d+$/.test(s)) this.nurZiffern++;
    if (a === "datum") {
      this.wieDatum++;
      if (/\d[T ]\d{2}:\d{2}/.test(s)) this.datumZeit++;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) this.isoDatum++;
      else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(s)) this.isoDatumZeit++;
      const iso = datumAlsIso(s);
      if (iso !== null) {
        if (this.datumMin === null || iso < this.datumMin) this.datumMin = iso;
        if (this.datumMax === null || iso > this.datumMax) this.datumMax = iso;
      }
    } else if (a === "zahl" || a === "betrag") {
      this.wieZahl++;
      const z = zahlenwert(s);
      if (!Number.isNaN(z)) {
        if (this.zahlMin === null || z < this.zahlMin.z) this.zahlMin = { z, s };
        if (this.zahlMax === null || z > this.zahlMax.z) this.zahlMax = { z, s };
      }
    }
    if (/^0\d/.test(s.trim())) this.fuehrendeNullen++;
  }
}

function textBereich(s: Sammler, gleichLang: boolean): { min: string; max: string } | null {
  if (!s.texte) return null;
  if (s.wieDatum >= s.texte * MUSTER_ANTEIL && s.datumMin !== null && s.datumMax !== null) return { min: s.datumMin, max: s.datumMax };
  if (s.wieZahl >= s.texte * MUSTER_ANTEIL && s.zahlMin && s.zahlMax && !s.fuehrendeNullen) return { min: s.zahlMin.s, max: s.zahlMax.s };
  return gleichLang && s.textMin !== null && s.textMax !== null ? { min: s.textMin, max: s.textMax } : null;
}

const BEZEICHNER = /^[\p{L}_$][\p{L}\p{N}_$]*$/u;
const teilName = (k: string): string => (BEZEICHNER.test(k) ? k : JSON.stringify(k));

/**
 * Alle Felder als Musterpfade unterhalb von `basis`: bei einer Liste relativ zu ihren Einträgen, sonst relativ zu
 * `basis` selbst (Pfad ""). Ungefiltert; Statistik und Schema wählen daraus.
 */
export function felderSammeln(index: Strukturindex, text: string, basis: number, eintraegeEinzeln = basis !== KEIN && index.art[basis] === KnotenArt.liste): { felder: Feld[]; eintraege: number } {
  const sammler = new Map<string, Sammler>();
  const sammeln = (pfad: string, k: number, vorsilbe: string, name: string): void => {
    let s = sammler.get(pfad);
    if (!s) sammler.set(pfad, (s = new Sammler(k, vorsilbe, name)));
    s.zaehlen(index, text, k);
  };
  // Tiefensuche je Eintrag mit eigenem Stapel (tiefe Dokumente sprengen sonst den Aufrufstapel)
  type Besuch = readonly [knoten: number, pfad: string, vorsilbe: string, name: string];
  const besuchen = (start: number): void => {
    const stapel: Besuch[] = [[start, "", "", ""]];
    while (stapel.length) {
      const [k, pfad, vorsilbe, name] = stapel.pop()!;
      sammeln(pfad, k, vorsilbe, name);
      const art = index.art[k];
      if (art !== KnotenArt.objekt && art !== KnotenArt.liste) continue;
      const kinder: Besuch[] = [];
      for (let c = index.erstesKind[k]; c !== KEIN; c = index.naechstes[c]) {
        if (art === KnotenArt.liste) kinder.push([c, `${pfad}[]`, pfad, "[]"]);
        else {
          const teil = teilName(schluessel(index, text, c) ?? "");
          kinder.push([c, pfad ? `${pfad}.${teil}` : teil, pfad ? `${pfad}.` : "", teil]);
        }
      }
      for (let i = kinder.length - 1; i >= 0; i--) stapel.push(kinder[i]);
    }
  };
  let eintraege = 0;
  if (eintraegeEinzeln) for (let c = index.erstesKind[basis]; c !== KEIN; c = index.naechstes[c], eintraege++) besuchen(c);
  else if (basis !== KEIN) { besuchen(basis); eintraege = 1; }

  const felder: Feld[] = [];
  for (const [pfad, s] of sammler) {
    // Wo das Feld stehen könnte: im Objekt am Pfad davor (Listeneinträge und der Eintrag selbst fehlen nie)
    const eltern = pfad === "" || s.name === "[]" ? null : s.vorsilbe.replace(/\.$/, "");
    const moeglich = eltern === null ? null : (sammler.get(eltern)?.objekte ?? 0);
    const name = pfad === "" ? "(Eintrag)" : s.name;
    const vorsilbe = s.vorsilbe;
    const einfach = s.vorkommen - s.arten[KnotenArt.objekt] - s.arten[KnotenArt.liste];
    const gleichLang = s.texte > 0 && s.laengeMin === s.laengeMax;
    felder.push({
      pfad, vorsilbe, name, erster: s.erster, vorkommen: s.vorkommen, moeglich, arten: s.arten,
      verschiedene: einfach > 0 ? (s.mehr ? VERSCHIEDENE_HOECHSTENS : s.werte.size) : null, verschiedeneMehr: s.mehr,
      textLaenge: s.texte ? { min: s.laengeMin, max: s.laengeMax } : null,
      textBereich: textBereich(s, gleichLang),
      zahlen: Float64Array.from(s.zahlen), ganz: s.ganz, wahr: s.wahr, falsch: s.falsch,
      listenLaenge: s.listeMin <= s.listeMax ? { min: s.listeMin, max: s.listeMax } : null,
      nichts: s.nichts, leerText: s.leerText, wieDatum: s.wieDatum, wieZahl: s.wieZahl, fuehrendeNullen: s.fuehrendeNullen,
      datumZeit: s.datumZeit, isoDatum: s.isoDatum, isoDatumZeit: s.isoDatumZeit, nurZiffern: s.nurZiffern, objekte: s.objekte,
    });
  }
  return { felder, eintraege };
}

export function statistik(index: Strukturindex, text: string, basis: number): Statistik {
  const { felder, eintraege } = felderSammeln(index, text, basis);
  // Felder, die immer Objekte sind (kunde, positionen[]), sagen nichts, was ihre Felder darunter nicht sagen; der Eintrag
  // selbst zählt nur, wenn die Einträge einfache Werte sind
  const nurObjekt = (f: Feld) => f.arten[KnotenArt.objekt] === f.vorkommen;
  const gezeigt = felder.filter((f) => !nurObjekt(f) && (f.pfad !== "" || f.arten[KnotenArt.liste] === 0));
  return { kennzahlen: kennzahlen(index, text), basis, eintraege, felder: gezeigt };
}

/** Anteil leerer Stellen eines Felds: fehlt im Objekt, null oder leerer Text (0 bis 1) */
export function leerAnteil(f: Feld): number {
  const grund = f.moeglich ?? f.vorkommen;
  if (!grund) return 0;
  const fehlt = f.moeglich === null ? 0 : Math.max(0, f.moeglich - f.vorkommen);
  return (fehlt + f.nichts + f.leerText) / grund;
}

/** Mittel und Median der Zahlen eines Felds */
export function lage(zahlen: Float64Array): { min: number; max: number; mittel: number; median: number } | null {
  const s = spanne(zahlen);
  if (!s) return null;
  let summe = 0;
  for (const z of zahlen) summe += z;
  const sortiert = Float64Array.from(zahlen).sort();
  const m = sortiert.length >> 1;
  return { ...s, mittel: summe / zahlen.length, median: sortiert.length % 2 ? sortiert[m] : (sortiert[m - 1] + sortiert[m]) / 2 };
}

export interface Muster {
  readonly art: "eindeutig" | "datum" | "zahl-als-text";
  readonly feld: Feld;
  readonly anteil: number;
}

/** Auffälliges je Feld: taugt als Schlüssel, Datumsangaben, Nummern mit führender Null */
export function musterFinden(st: Statistik): Muster[] {
  const m: Muster[] = [];
  for (const f of st.felder) {
    const einfach = f.vorkommen - f.arten[KnotenArt.objekt] - f.arten[KnotenArt.liste] - f.nichts;
    const texte = f.arten[KnotenArt.text];
    if (f.verschiedene !== null && !f.verschiedeneMehr && einfach > 1 && f.verschiedene === einfach && f.arten[KnotenArt.wahrheitswert] === 0 && (f.moeglich === null || f.vorkommen === f.moeglich)) m.push({ art: "eindeutig", feld: f, anteil: 1 });
    if (texte && f.wieDatum >= texte * MUSTER_ANTEIL) m.push({ art: "datum", feld: f, anteil: f.wieDatum / texte });
    if (texte && f.fuehrendeNullen > 0 && f.wieZahl >= texte * MUSTER_ANTEIL) m.push({ art: "zahl-als-text", feld: f, anteil: f.wieZahl / texte });
  }
  return m;
}
