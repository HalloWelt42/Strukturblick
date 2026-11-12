// Konvertieren: ein Dokument in ein anderes Format umschreiben und ehrlich sagen, was das Ziel nicht kann. Jedes Ziel
// meldet sich in ZIELE an (Name, Endung, Optionen, Schreiben, Verluste); Oberfläche und Tests lesen nur diese Liste.
// Rein, ohne Browser. Texte in Verlustpunkten kennzeichnen Namen und Werte mit `Backticks`.

import { stringify } from "yaml";
import { tomlAus } from "./toml";
import { xmlAus, xmlQuellVerluste } from "./xml";
import { KEIN, KnotenArt, schluessel, type Strukturindex } from "../../kern/strukturindex";
import { listeFinden } from "../tabelle";
import { wertAus } from "../wert";
import { csvSchreiben, istObjekt, tabellieren, type Listenweise, type Objektweise, type Spalte, type Trennzeichen } from "./tabellieren";

export type Zielkennung = "json" | "ndjson" | "csv" | "yaml" | "toml" | "xml";

export interface Konvertieroptionen {
  readonly trennzeichen: Trennzeichen;
  readonly objekte: Objektweise;
  readonly listen: Listenweise;
  readonly kopfzeile: boolean;
}

export const VORGABEN: Konvertieroptionen = { trennzeichen: ";", objekte: "spalten", listen: "zeilen", kopfzeile: true };

/** Ein Punkt der Verlustkarte; `wahl` bietet Wege an, wo es mehrere gibt (Listen in CSV) */
export interface Verlustpunkt {
  readonly satz: string;
  readonly text: string;
  readonly wahl?: { readonly option: "listen"; readonly wege: readonly { readonly wert: Listenweise; readonly titel: string; readonly text: string }[] };
}

export interface Quelle {
  readonly index: Strukturindex;
  readonly text: string;
  readonly format: string;
  readonly formatName: string;
  /** Hat der Quelltext Kommentare? */
  readonly kommentare: boolean;
  /** Fehler beim Lesen; was nicht lesbar ist, kommt nur als Text mit */
  readonly fehler: number;
  /** Werte mit eigenem Typ für Datum und Zeit (TOML); in den übrigen Zielen werden sie Text */
  readonly datumswerte: number;
  /** Unterscheidet das Format Zahl, Text und Wahrheitswert? (CSV und XML nicht) */
  readonly typen: boolean;
}

export interface Umwandlung {
  readonly text: string;
  readonly verluste: readonly Verlustpunkt[];
  /** Bei Tabellen: Spalten und Zahl der Datenzeilen */
  readonly tabelle: { readonly spalten: readonly Spalte[]; readonly zeilen: number } | null;
  /** Bei Folgen (JSON Lines): Zahl der Datensätze */
  readonly datensaetze: number | null;
}

export interface Ziel {
  readonly kennung: Zielkennung;
  readonly name: string;
  readonly endung: string;
  readonly symbol: string;
  /** Welche Optionen für dieses Ziel gelten */
  readonly optionen: readonly (keyof Konvertieroptionen)[];
}

export const ZIELE: readonly Ziel[] = [
  { kennung: "csv", name: "CSV", endung: "csv", symbol: "fa-file-csv", optionen: ["trennzeichen", "objekte", "kopfzeile"] },
  { kennung: "ndjson", name: "JSON Lines", endung: "ndjson", symbol: "fa-file-lines", optionen: [] },
  { kennung: "json", name: "JSON", endung: "json", symbol: "fa-file-code", optionen: [] },
  { kennung: "yaml", name: "YAML", endung: "yaml", symbol: "fa-file-lines", optionen: [] },
  { kennung: "toml", name: "TOML", endung: "toml", symbol: "fa-file-lines", optionen: [] },
  { kennung: "xml", name: "XML", endung: "xml", symbol: "fa-file-code", optionen: [] },
];

export const ziel = (k: Zielkennung): Ziel => ZIELE.find((z) => z.kennung === k)!;

/** Ziele für ein Quellformat: alle außer dem eigenen */
export const zieleFuer = (format: string): Ziel[] => ZIELE.filter((z) => z.kennung !== format);

/** Die Liste, die eine Tabelle oder Folge wird, ihr Name und die obersten Felder, die außerhalb von ihr stehen */
function hauptliste(q: Quelle): { eintraege: unknown[]; name: string; aussen: string[] } {
  const k = listeFinden(q.index, KEIN, KEIN);
  if (k === KEIN || q.index.art[k] !== KnotenArt.liste) {
    const w = wertAus(q.index, q.text);
    return { eintraege: Array.isArray(w) ? w : [w], name: "", aussen: [] };
  }
  const eintraege = wertAus(q.index, q.text, k) as unknown[];
  if (k === 0) return { eintraege, name: "", aussen: [] };
  let oben = k;
  while (q.index.eltern[oben] !== 0) oben = q.index.eltern[oben];
  const aussen: string[] = [];
  for (let c = q.index.erstesKind[0]; c !== KEIN; c = q.index.naechstes[c]) if (c !== oben) aussen.push(schluessel(q.index, q.text, c) ?? "");
  return { eintraege, name: schluessel(q.index, q.text, k) ?? "", aussen };
}

const und = (teile: readonly string[]): string => (teile.length > 1 ? `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}` : (teile[0] ?? ""));
const code = (teile: readonly string[], hoechstens = 4): string => und([...teile.slice(0, hoechstens).map((t) => `\`${t}\``), ...(teile.length > hoechstens ? [`${teile.length - hoechstens} weitere`] : [])]);
const anzahl = (n: number): string => n.toLocaleString("de-DE");
const mal = (n: number, eins: string, viele: string): string => `${anzahl(n)} ${n === 1 ? eins : viele}`;

function aussenPunkt(aussen: readonly string[], name: string, zielName: string, art: string): Verlustpunkt[] {
  if (!aussen.length) return [];
  return [{ satz: `${code(aussen)} ${aussen.length === 1 ? "fehlt" : "fehlen"}`, text: `${zielName} kennt nur ${art}. Übernommen wird die Liste \`${name}\`.` }];
}

export function umwandeln(q: Quelle, zielKennung: Zielkennung, o: Konvertieroptionen = VORGABEN): Umwandlung {
  const z = ziel(zielKennung);
  const allgemein: Verlustpunkt[] = [];
  const vorn: Verlustpunkt[] = [];
  if (q.fehler) vorn.push({ satz: `${anzahl(q.fehler)} ${q.fehler === 1 ? "Stelle ist" : "Stellen sind"} nicht lesbar`, text: "Was der Leser nicht versteht, kommt nur als Text oder gar nicht mit. Vorher mit Reparieren lesbar machen." });
  if (q.kommentare) allgemein.push({ satz: "Kommentare gehen verloren", text: `${z.name} ${z.kennung === "yaml" ? "kennt Kommentare, sie werden aber nicht mitgenommen" : "kennt keine Kommentare"}; Werte und Aufbau bleiben.` });
  if (q.datumswerte && z.kennung !== q.format) allgemein.push({ satz: "Datum und Zeit werden Text", text: `${q.formatName} hat für ${anzahl(q.datumswerte)} ${q.datumswerte === 1 ? "Wert" : "Werte"} einen eigenen Typ für Datum oder Zeit; ${z.name} schreibt sie als Text. Der Inhalt bleibt gleich.` });
  if (!q.typen && z.kennung !== q.format) allgemein.push({ satz: "Werte bleiben Text", text: `${q.formatName} kennt keine Typen, deshalb kommen Zahlen und Datumsangaben als Text an. Umwandeln geht vorher mit Bereinigen, Typen.` });
  if (q.format === "xml" && z.kennung !== "xml") allgemein.unshift(...xmlQuellVerluste(wertAus(q.index, q.text), z.name));

  if (z.kennung === "json" || z.kennung === "yaml") {
    const wert = wertAus(q.index, q.text);
    // YAML nach den Regeln von 1.1: Texte wie yes, on oder 2026-11-01 stehen in Anführungszeichen und bleiben in jedem
    // Leser Text
    const text = z.kennung === "json" ? JSON.stringify(wert, null, 2) + "\n" : stringify(wert, { lineWidth: 0, version: "1.1" });
    return { text, verluste: [...vorn, ...allgemein], tabelle: null, datensaetze: null };
  }
  if (z.kennung === "xml") {
    const x = xmlAus(wertAus(q.index, q.text));
    return { text: x.text, verluste: [...vorn, ...x.verluste, ...allgemein], tabelle: null, datensaetze: null };
  }
  if (z.kennung === "toml") {
    const t = tomlAus(wertAus(q.index, q.text));
    return { text: t.text, verluste: [...vorn, ...t.verluste, ...allgemein], tabelle: null, datensaetze: null };
  }
  const h = hauptliste(q);
  if (z.kennung === "ndjson") {
    const text = h.eintraege.map((e) => JSON.stringify(e ?? null)).join("\n") + (h.eintraege.length ? "\n" : "");
    return { text, verluste: [...vorn, ...aussenPunkt(h.aussen, h.name, z.name, "eine Folge von Datensätzen"), ...allgemein], tabelle: null, datensaetze: h.eintraege.length };
  }
  const t = tabellieren(h.eintraege, o.objekte, o.listen);
  const text = csvSchreiben(t, o.trennzeichen, o.kopfzeile);
  return { text, verluste: [...vorn, ...csvVerluste(h, t, o), ...aussenPunkt(h.aussen, h.name, z.name, "eine Tabelle"), ...allgemein], tabelle: { spalten: t.spalten, zeilen: t.zeilen.length }, datensaetze: null };
}

function csvVerluste(h: ReturnType<typeof hauptliste>, t: ReturnType<typeof tabellieren>, o: Konvertieroptionen): Verlustpunkt[] {
  const punkte: Verlustpunkt[] = [];
  if (t.listenfeld) {
    const f = t.listenfeld;
    const wege = (["zeilen", "spalten", "json"] as const).map((w) => {
      const x = w === o.listen ? t : tabellieren(h.eintraege, o.objekte, w);
      const zeilen = mal(x.zeilen.length, "Zeile", "Zeilen");
      if (w === "zeilen") {
        const andere = Object.keys(h.eintraege.find(istObjekt) ?? {}).filter((k) => k !== f);
        return { wert: w, titel: `Eine Zeile je Eintrag in ${f}`, text: `${zeilen}; ${und(andere.slice(0, 3))}${andere.length > 3 ? " usw." : ""} wiederholen sich` };
      }
      if (w === "spalten") {
        const je = x.spalten.filter((s) => s.name.startsWith(`${f}.`));
        const leer = je.length ? x.zeilen.reduce((n, z) => n + je.filter((s) => z[x.spalten.indexOf(s)] === undefined).length, 0) / (je.length * Math.max(1, x.zeilen.length)) : 0;
        const von = je.length > 1 ? `${je[0].name} bis ${je[je.length - 1].name}, ` : "";
        return { wert: w, titel: "Spalten je Eintrag", text: `${zeilen}; ${von}${mal(je.length, "Spalte", "Spalten")}${leer > 0.5 ? ", meist leer" : ""}` };
      }
      return { wert: w, titel: "Liste als JSON-Text in einer Zelle", text: `${zeilen}; vollständig, aber nicht mehr rechenbar` };
    });
    const weitere = t.weitereListen.length ? ` Weitere Listen (${code(t.weitereListen)}) stehen als JSON-Text in einer Zelle.` : "";
    punkte.push({ satz: `\`${f}\` sind Listen: 3 Möglichkeiten`, text: `Eine Zeile hat nur Platz für einen Wert je Spalte.${weitere}`, wahl: { option: "listen", wege } });
  }
  // Typen: Beispiele für Zahl und Wahrheitswert, dazu eine Nummer mit führender Null
  const beispiele: string[] = [];
  let nullStelle: string | null = null;
  for (const z of t.zeilen.slice(0, 2000)) {
    z.forEach((w, i) => {
      if ((typeof w === "number" || typeof w === "boolean") && beispiele.length < 3 && !beispiele.includes(String(w))) beispiele.push(String(w));
      if (!nullStelle && typeof w === "string" && /^0\d+$/.test(w)) nullStelle = `Die Nummer \`${w}\` in \`${t.spalten[i].name}\` bleibt nur richtig, wenn das lesende Programm die Spalte als Text nimmt.`;
    });
  }
  if (beispiele.length) punkte.push({ satz: "Typen gehen verloren: Zahlen werden Text", text: `In CSV ist alles Text. ${code(beispiele)} kommen als Zeichen an; wer die Datei liest, muss die Typen neu erkennen.${nullStelle ? ` ${nullStelle}` : ""}` });
  // null und leer
  let meiste = { spalte: -1, n: 0 };
  t.spalten.forEach((s, i) => {
    const n = t.zeilen.reduce((m, z) => m + (z[i] === null ? 1 : 0), 0);
    if (n > meiste.n) meiste = { spalte: i, n };
  });
  if (meiste.n) punkte.push({ satz: "null und leer sehen gleich aus", text: `\`${t.spalten[meiste.spalte].name}\` ist in ${anzahl(meiste.n)} von ${anzahl(t.zeilen.length)} Zeilen \`null\` und wird zur leeren Zelle, wie ein leerer Text.` });
  if (!o.kopfzeile) punkte.push({ satz: "Ohne Kopfzeile fehlen die Namen", text: "Wer die Datei liest, sieht nur die Werte und muss die Reihenfolge der Spalten kennen." });
  return punkte;
}

/** Hat der Quelltext Kommentare? JSON meldet es beim Lesen, YAML erkennt sie an # am Zeilenanfang oder nach Leerraum. */
export function hatKommentare(format: string, text: string, merkmale: Readonly<Record<string, unknown>>): boolean {
  if (format === "json" || format === "toml" || format === "xml") return merkmale.kommentare === true;
  if (format === "yaml") return /(^|\s)#/m.test(text);
  return false;
}

/** Dateiname im Ziel: gleicher Stamm, neue Endung */
export const zielname = (name: string, z: Zielkennung): string => `${name.replace(/\.[^.]+$/, "")}.${ziel(z).endung}`;
