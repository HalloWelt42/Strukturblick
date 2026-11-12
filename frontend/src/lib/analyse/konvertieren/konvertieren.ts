// Konvertieren: ein Dokument in ein anderes Format umschreiben und ehrlich sagen, was das Ziel nicht kann. Jedes Ziel
// meldet sich in ZIELE an (Name, Endung, Optionen, Schreiben, Verluste); Oberfläche und Tests lesen nur diese Liste.
// Rein, ohne Browser. Texte in Verlustpunkten kennzeichnen Namen und Werte mit `Backticks`.

import { jsonText } from "../../kern/json";
import { stringify } from "yaml";
import { tomlAus } from "./toml";
import { xmlAus, xmlQuellVerluste } from "./xml";
import { KEIN, KnotenArt, schluessel, type Strukturindex } from "../../kern/strukturindex";
import { listeFinden } from "../tabelle";
import { wertAus } from "../wert";
import type { Listenweise, Objektweise, Spalte, Trennzeichen } from "./tabellieren";
import { code, csvZiel, textabellenZiel, xlsxZiel, type Hauptliste } from "./tabellenziele";

export type Zielkennung = "json" | "ndjson" | "csv" | "yaml" | "toml" | "xml" | "xlsx" | "markdown" | "html";

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
  /** Titel für Ziele mit Überschrift (HTML), etwa der Dokumentname ohne Endung */
  readonly titel?: string;
}

export interface Umwandlung {
  /** Ergebnis als Text; bei Dateizielen (XLSX) die Vorschau der Zellen */
  readonly text: string;
  /** Bei Dateizielen: der Inhalt der Datei */
  readonly daten?: Uint8Array;
  /** Bei Tabellendateien: Zahl der Blätter */
  readonly blaetter?: number;
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
  /** Ergebnis ist eine Datei, kein Text (nur herunterladen, kein neues Dokument) */
  readonly datei?: { readonly art: string };
}

export const ZIELE: readonly Ziel[] = [
  { kennung: "csv", name: "CSV", endung: "csv", symbol: "fa-file-csv", optionen: ["trennzeichen", "objekte", "kopfzeile"] },
  { kennung: "ndjson", name: "JSON Lines", endung: "ndjson", symbol: "fa-file-lines", optionen: [] },
  { kennung: "json", name: "JSON", endung: "json", symbol: "fa-file-code", optionen: [] },
  { kennung: "yaml", name: "YAML", endung: "yaml", symbol: "fa-file-lines", optionen: [] },
  { kennung: "toml", name: "TOML", endung: "toml", symbol: "fa-file-lines", optionen: [] },
  { kennung: "xml", name: "XML", endung: "xml", symbol: "fa-file-code", optionen: [] },
  { kennung: "markdown", name: "Markdown", endung: "md", symbol: "fa-table-list", optionen: ["objekte"] },
  { kennung: "html", name: "HTML", endung: "html", symbol: "fa-table", optionen: ["objekte"], datei: { art: "text/html;charset=utf-8" } },
  { kennung: "xlsx", name: "XLSX", endung: "xlsx", symbol: "fa-table-cells", optionen: ["objekte"], datei: { art: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" } },
];

export const ziel = (k: Zielkennung): Ziel => ZIELE.find((z) => z.kennung === k)!;

/** Ziele für ein Quellformat: alle außer dem eigenen */
export const zieleFuer = (format: string): Ziel[] => ZIELE.filter((z) => z.kennung !== format);

/** Die Liste, die eine Tabelle oder Folge wird, ihr Name und die obersten Felder, die außerhalb von ihr stehen */
function hauptliste(q: Quelle): Hauptliste {
  const k = listeFinden(q.index, KEIN, KEIN);
  if (k === KEIN || q.index.art[k] !== KnotenArt.liste) {
    const w = wertAus(q.index, q.text);
    return { eintraege: Array.isArray(w) ? w : [w], name: "", aussen: [], aussenWerte: {} };
  }
  const eintraege = wertAus(q.index, q.text, k) as unknown[];
  if (k === 0) return { eintraege, name: "", aussen: [], aussenWerte: {} };
  let oben = k;
  while (q.index.eltern[oben] !== 0) oben = q.index.eltern[oben];
  const aussen: string[] = [];
  const aussenWerte: Record<string, unknown> = {};
  for (let c = q.index.erstesKind[0]; c !== KEIN; c = q.index.naechstes[c]) {
    if (c === oben) continue;
    const name = schluessel(q.index, q.text, c) ?? "";
    aussen.push(name);
    aussenWerte[name] = wertAus(q.index, q.text, c);
  }
  return { eintraege, name: schluessel(q.index, q.text, k) ?? "", aussen, aussenWerte };
}

const anzahl = (n: number): string => n.toLocaleString("de-DE");

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
    const text = z.kennung === "json" ? jsonText(wert, 2) + "\n" : stringify(wert, { lineWidth: 0, version: "1.1" });
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
    const text = h.eintraege.map((e) => jsonText(e ?? null)).join("\n") + (h.eintraege.length ? "\n" : "");
    return { text, verluste: [...vorn, ...aussenPunkt(h.aussen, h.name, z.name, "eine Folge von Datensätzen"), ...allgemein], tabelle: null, datensaetze: h.eintraege.length };
  }
  if (z.kennung === "xlsx") {
    const x = xlsxZiel(h, o);
    return { text: x.vorschau, daten: x.daten, blaetter: h.aussen.length ? 2 : 1, verluste: [...vorn, ...x.verluste, ...allgemein], tabelle: { spalten: x.t.spalten, zeilen: x.t.zeilen.length }, datensaetze: null };
  }
  if (z.kennung === "markdown" || z.kennung === "html") {
    const x = textabellenZiel(h, o, z.kennung, q.titel ?? h.name);
    const daten = z.kennung === "html" ? new TextEncoder().encode(x.text) : undefined;
    return { text: x.text, daten, blaetter: undefined, verluste: [...vorn, ...x.verluste, ...allgemein], tabelle: { spalten: x.t.spalten, zeilen: x.t.zeilen.length }, datensaetze: null };
  }
  const c = csvZiel(h, o);
  return { text: c.text, verluste: [...vorn, ...c.verluste, ...allgemein], tabelle: { spalten: c.t.spalten, zeilen: c.t.zeilen.length }, datensaetze: null };
}


/** Hat der Quelltext Kommentare? JSON meldet es beim Lesen, YAML erkennt sie an # am Zeilenanfang oder nach Leerraum. */
export function hatKommentare(format: string, text: string, merkmale: Readonly<Record<string, unknown>>): boolean {
  if (format === "json" || format === "toml" || format === "xml") return merkmale.kommentare === true;
  if (format === "yaml") return /(^|\s)#/m.test(text);
  return false;
}

/** Dateiname im Ziel: gleicher Stamm, neue Endung */
export const zielname = (name: string, z: Zielkennung): string => `${name.replace(/\.[^.]+$/, "")}.${ziel(z).endung}`;
