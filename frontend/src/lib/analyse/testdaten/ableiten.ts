// Spezifikation aus einer Vorlage ableiten (entwuerfe/testdaten.html): je Feld der Statistik einer Liste ein Erzeuger
// mit Einstellungen aus den Werten. Zuerst zählt, wonach die Werte aussehen (Datum, Zahl, Betrag, ja/nein, wenige
// feste Werte, eindeutige Nummern); der Feldname entscheidet dort, wo Werte allein es nicht sagen (Name, Ort, E-Mail,
// Telefon, Postleitzahl). Das Ergebnis ist ein Vorschlag, jede Zeile lässt sich in der Tafel ändern.

import { KnotenArt, type Strukturindex } from "../../kern/strukturindex";
import { lage, statistik, type Feld } from "../statistik";
import { pfadwerte } from "../pfadwerte";
import { zahlenwert } from "../tabelle";
import type { Einstellungen } from "./erzeuger";
import { vervollstaendigen, type Feldspec, type Leerart, type Spezifikation } from "./spezifikation";

/** Bis zu so vielen verschiedenen Werten wird ein Feld zur Auswahl, wenn sich Werte oft wiederholen */
const AUSWAHL_HOECHSTENS = 20;
/** Ab diesem Anteil gilt, wonach Werte aussehen */
const MEHRHEIT = 0.9;
/** Grob geschätzte Länge eines Worts samt Leerzeichen, für "Text aus Wörtern" */
const WORTLAENGE = 8;

export interface Ableitung {
  readonly spezifikation: Spezifikation;
  /** Zahl der Einträge, aus denen abgeleitet wurde */
  readonly eintraege: number;
  /** Was auffiel (gemischte Schreibweisen), für den Hinweis unter der Tafel */
  readonly hinweise: readonly string[];
}

const NAMEN: readonly [RegExp, string, Einstellungen][] = [
  [/mail/, "email", {}],
  [/^(tel|telefon|phone|fon|handy|mobil)/, "telefon", {}],
  [/^(plz|postleitzahl|zip)/, "plz", {}],
  [/^(ort|stadt|wohnort|city|gemeinde)$/, "ort", {}],
  [/(strasse|straße|street)/, "strasse", {}],
  [/^(vorname|first_?name)$/, "name", { teil: "vorname" }],
  [/^(nachname|familienname|last_?name|surname)$/, "name", { teil: "nachname" }],
  [/^(name|kundenname|vollname|person|ansprechpartner)$/, "name", { teil: "voll" }],
  [/(uuid|guid)/, "uuid", {}],
];

/** Domains, die niemandem gehören (RFC 2606, RFC 6761): nur sie werden aus einer Vorlage übernommen */
const RESERVIERT = /(^|\.)(example|test|invalid|localhost)$|(^|\.)example\.(com|org|net)$/i;

/** Gemeinsame Domain der Vorlage, wenn sie reserviert ist; sonst leer (dann nimmt der Erzeuger seine .example-Domains),
 *  damit erfundene Adressen nie an eine echte Domain gehen */
function domainVon(roh: readonly string[]): string {
  const d = roh[0]?.split("@")[1] ?? "";
  return d && roh.every((r) => r.split("@")[1] === d) && RESERVIERT.test(d) ? d : "";
}

const UUID_MUSTER = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Wie das Feld leer ist: der häufigste Grund und sein Anteil */
function leerVon(f: Feld): Feldspec["leer"] {
  const grund = f.moeglich ?? f.vorkommen;
  const fehlt = f.moeglich === null ? 0 : Math.max(0, f.moeglich - f.vorkommen);
  const arten: [Leerart, number][] = [["fehlt", fehlt], ["null", f.nichts], ["leertext", f.leerText]];
  const [als, n] = arten.reduce((a, b) => (b[1] > a[1] ? b : a));
  return { anteil: grund && n ? Math.round(((fehlt + f.nichts + f.leerText) / grund) * 100) : 0, als };
}

/** Nachkommastellen, wie die Werte sie schreiben (höchstens 6) */
const stellenVon = (roh: readonly string[]): number => Math.min(6, Math.max(0, ...roh.map((r) => /[.,](\d+)$/.exec(r.trim())?.[1].length ?? 0)));

/** Anfang, Ziffernzahl und Ende einer Kennung wie K-20001; null, wenn die Werte nicht so gebaut sind */
function nummernmuster(min: string, max: string): { muster: string; start: number } | null {
  const a = /^(\D*)(\d+)(\D*)$/.exec(min);
  const b = /^(\D*)(\d+)(\D*)$/.exec(max);
  if (!a || !b || a[1] !== b[1] || a[3] !== b[3] || a[2].length !== b[2].length) return null;
  return { muster: `${a[1]}${"#".repeat(a[2].length)}${a[3]}`, start: Number(a[2]) };
}

function einfacherErzeuger(index: Strukturindex, text: string, f: Feld, hinweise: string[]): Pick<Feldspec, "erzeuger" | "einstellungen"> {
  const name = f.name.toLowerCase();
  const texte = f.arten[KnotenArt.text] - f.leerText;
  const zahlen = f.arten[KnotenArt.zahl];
  const wahrheit = f.wahr + f.falsch;
  const gefuellt = texte + zahlen + wahrheit;
  // Häufigste gefüllte Werte (null und leerer Text zählen als leer, nicht als Wert)
  const haeufig = pfadwerte(index, text, f.erster, AUSWAHL_HOECHSTENS + 3).haeufigste.filter((h) => h.art !== KnotenArt.nichts && h.wert !== "").slice(0, AUSWAHL_HOECHSTENS + 1);
  const roh = haeufig.map((h) => h.wert);
  const eindeutig = f.verschiedene !== null && !f.verschiedeneMehr && f.verschiedene === gefuellt && gefuellt > 1;
  // Fast eindeutig: Kennungen mit einzelnen Dubletten (Vorlagen mit Unsauberkeiten)
  const fastEindeutig = eindeutig || (f.verschiedeneMehr || (f.verschiedene ?? 0) >= gefuellt * MEHRHEIT);

  if (gefuellt === 0) return { erzeuger: "konstante", einstellungen: { als: "null" } };
  if (wahrheit >= gefuellt * MEHRHEIT) return { erzeuger: "wahrheit", einstellungen: { anteil: Math.round((f.wahr / wahrheit) * 100) } };
  const jaNein = roh.length > 0 && roh.length <= 2 && roh.every((r) => /^(ja|nein)$/i.test(r));
  if (jaNein) return { erzeuger: "wahrheit", einstellungen: { anteil: Math.round(((haeufig.find((h) => /^ja$/i.test(h.wert))?.anzahl ?? 0) / gefuellt) * 100), schreibweise: "ja-nein" } };

  // Name zuerst, wo die Werte es allein nicht sagen
  for (const [muster, erz, e] of NAMEN) if (muster.test(name) && texte >= gefuellt * MEHRHEIT) {
    if (erz === "telefon") return { erzeuger: erz, einstellungen: { netz: roh.filter((r) => /^(\+49\s?1|01)/.test(r)).length > roh.length / 2 ? "mobil" : "festnetz", schreibweise: roh.some((r) => r.includes("/")) ? "strich" : roh.some((r) => r.startsWith("+")) ? "international" : "leerzeichen" } };
    if (erz === "plz" && f.textBereich) return { erzeuger: erz, einstellungen: { von: Math.max(1, Number(f.textBereich.min.slice(0, 2)) || 1), bis: Math.max(1, Number(f.textBereich.max.slice(0, 2)) || 99) } };
    if (erz === "email") return { erzeuger: erz, einstellungen: { domain: domainVon(roh), eindeutig: eindeutig ? "ja" : "nein" } };
    return { erzeuger: erz, einstellungen: e };
  }
  if (texte && roh.length && roh.every((r) => UUID_MUSTER.test(r))) return { erzeuger: "uuid", einstellungen: {} };

  // Datum und Zeitpunkt
  if (texte >= gefuellt * MEHRHEIT && f.wieDatum >= texte * MEHRHEIT && f.textBereich) {
    const iso = f.isoDatum + f.isoDatumZeit >= f.wieDatum / 2;
    if (f.isoDatum < f.wieDatum && f.isoDatum > 0) hinweise.push(`${f.pfad} steht mal als ISO-Datum, mal anders; die Testdaten nehmen eine Schreibweise.`);
    if (f.datumZeit >= f.wieDatum * MEHRHEIT) return { erzeuger: "zeitpunkt", einstellungen: { von: f.textBereich.min.slice(0, 10), bis: f.textBereich.max.slice(0, 10) } };
    return { erzeuger: "datum", einstellungen: { von: f.textBereich.min.slice(0, 10), bis: f.textBereich.max.slice(0, 10), schreibweise: iso ? "iso" : "deutsch" } };
  }

  // Eindeutige Nummern (K-20001, 1001)
  if (fastEindeutig && gefuellt > 1 && f.textBereich && texte >= gefuellt * MEHRHEIT) {
    const m = nummernmuster(f.textBereich.min, f.textBereich.max);
    if (m) return { erzeuger: "nummer", einstellungen: { muster: m.muster, start: m.start, schritt: 1, als: "text" } };
  }
  const z = lage(f.zahlen);
  if (eindeutig && zahlen >= gefuellt * MEHRHEIT && f.ganz && z) return { erzeuger: "nummer", einstellungen: { muster: "#", start: z.min, schritt: 1, als: "zahl" } };

  // Wenige feste Werte, die sich wiederholen
  if (f.verschiedene !== null && f.verschiedene <= AUSWAHL_HOECHSTENS + 1 && haeufig.length <= AUSWAHL_HOECHSTENS && haeufig.length * 3 <= gefuellt && haeufig.length) {
    const alleZahlen = haeufig.every((h) => h.art === KnotenArt.zahl);
    return { erzeuger: "auswahl", einstellungen: { werte: haeufig.map((h) => ({ wert: h.wert, gewicht: h.anzahl })), als: alleZahlen ? "zahl" : "text" } };
  }

  // Zahlen und Beträge
  if (zahlen >= gefuellt * MEHRHEIT && z) return { erzeuger: "zahl", einstellungen: { von: z.min, bis: z.max, stellen: f.ganz ? 0 : Math.max(1, stellenVon(roh)), schreibweise: "zahl" } };
  if (texte >= gefuellt * MEHRHEIT && f.wieZahl >= texte * MEHRHEIT && f.textBereich && !f.fuehrendeNullen) {
    const deutsch = roh.some((r) => /,\d+$/.test(r));
    return { erzeuger: "zahl", einstellungen: { von: zahlenwert(f.textBereich.min), bis: zahlenwert(f.textBereich.max), stellen: stellenVon(roh), schreibweise: deutsch ? "deutsch" : "text" } };
  }

  // Sonst Text in der Länge der Vorlage
  const l = f.textLaenge ?? { min: WORTLAENGE, max: WORTLAENGE * 3 };
  const von = Math.max(1, Math.round(l.min / WORTLAENGE));
  return { erzeuger: "text", einstellungen: { von, bis: Math.max(von, Math.round(l.max / WORTLAENGE)) } };
}

/** Spezifikation aus der Liste `basis` (oder dem ganzen Dokument) einer Vorlage */
export function ableiten(index: Strukturindex, text: string, basis: number): Ableitung {
  const st = statistik(index, text, basis);
  const hinweise: string[] = [];
  const felder: Feldspec[] = st.felder.map((f) => {
    const leer = leerVon(f);
    const objekte = f.arten[KnotenArt.objekt];
    const listen = f.arten[KnotenArt.liste];
    if (objekte && objekte >= listen && objekte * 2 >= f.vorkommen - f.nichts) return { pfad: f.pfad, erzeuger: "objekt", einstellungen: {}, leer };
    if (listen && listen * 2 >= f.vorkommen - f.nichts) {
      const l = f.listenLaenge ?? { min: 0, max: 3 };
      return { pfad: f.pfad, erzeuger: "liste", einstellungen: { von: l.min, bis: l.max }, leer };
    }
    return { pfad: f.pfad, ...einfacherErzeuger(index, text, f, hinweise), leer };
  });
  return { spezifikation: { felder: vervollstaendigen(felder) }, eintraege: st.eintraege, hinweise };
}
