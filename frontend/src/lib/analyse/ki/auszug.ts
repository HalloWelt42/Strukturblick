// Auszug für die KI (STB-60): was über die Leitstelle an das Sprachmodell geht. Nie das ganze Dokument, sondern Name,
// Format, die Felder mit Art und Vorkommen und bis zu 20 Beispieleinträge, jeder gekürzt; für SQL die Tabellen mit
// Spalten und Beispielzeilen, für XPath der Anfang des Textes. Die Zahlen dazu zeigt der Inspektor unter "Gesendet".
// Rein, ohne Browser.

import { KEIN, KnotenArt, KNOTEN_NAME, schreiben, teileVon, type Strukturindex } from "../../kern";
import { jsonText } from "../../kern/json";
import { listeFinden } from "../tabelle";
import { statistik, type Feld } from "../statistik";
import { wertAus } from "../wert";
import { sqlTabellen } from "../abfrage/sqltabellen";

/** So viele Beispieleinträge höchstens */
export const BEISPIELE = 20;
/** So lang höchstens ein Beispieleintrag (Zeichen), länger wird gekürzt */
const EINTRAG_ZEICHEN = 1_200;
/** So lang höchstens der Anfang des Textes (XPath) */
const ROH_ZEICHEN = 2_500;
/** So lang höchstens der ganze Auszug; darüber kommen weniger Beispiele mit */
export const AUSZUG_ZEICHEN = 40_000;

export type Auszugart = "werte" | "sql" | "xml";

export interface Auszugquelle {
  readonly name: string;
  readonly format: string;
  /** Kennt das Format Typen (für die Tabellen in SQL)? */
  readonly typen: boolean;
  readonly index: Strukturindex;
  readonly text: string;
}

/** Ein weiterer Abschnitt, den die Aufgabe mitbringt (Schema, bisherige Spezifikation, Erzeuger) */
export interface Zusatz {
  readonly titel: string;
  readonly text: string;
}

export interface Auszug {
  readonly text: string;
  readonly felder: number;
  /** Beispieleinträge oder Beispielzeilen, die mitgehen */
  readonly zeilen: number;
  /** Einträge der Liste oder Zeilen der größten Tabelle im Dokument */
  readonly eintraege: number;
}

const prozent = (n: number, von: number | null): string => (von ? `${Math.round((n / von) * 100)} %` : `${n}`);

/** Art eines Felds in wenigen Worten: Arten mit Anteil, dazu was auffällt */
export function feldArt(f: Feld): string {
  const arten = f.arten.flatMap((n, art) => (n > 0 ? [`${KNOTEN_NAME[art as KnotenArt]}${f.arten.filter((x) => x > 0).length > 1 ? ` ${prozent(n, f.vorkommen)}` : ""}`] : []));
  const auffaellig: string[] = [];
  if (f.nurZiffern > 0 && f.arten[KnotenArt.text] > 0) auffaellig.push("nur Ziffern");
  if (f.fuehrendeNullen > 0) auffaellig.push(`${f.fuehrendeNullen} mit führender Null`);
  if (f.wieZahl > 0 && f.arten[KnotenArt.text] > 0) auffaellig.push("Text, der wie eine Zahl aussieht");
  if (f.wieDatum > 0) auffaellig.push("sieht aus wie Datum");
  if (f.nichts > 0) auffaellig.push(`${f.nichts} null`);
  if (f.leerText > 0) auffaellig.push(`${f.leerText} leer`);
  if (f.verschiedene !== null) auffaellig.push(`${f.verschiedene}${f.verschiedeneMehr ? "+" : ""} verschiedene`);
  const vorkommen = f.moeglich !== null && f.vorkommen < f.moeglich ? `, in ${prozent(f.vorkommen, f.moeglich)} der Einträge` : "";
  return `${arten.join(", ")}${vorkommen}${auffaellig.length ? `; ${auffaellig.join(", ")}` : ""}`;
}

function gekuerzt(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n)} ... (gekürzt)`;
}

/** Einträge der Liste, aus der die Felder stammen (oder die Wurzel als einziger Eintrag) */
function eintraegeVon(index: Strukturindex, basis: number): number[] {
  if (index.art[basis] !== KnotenArt.liste) return [basis];
  const aus: number[] = [];
  for (let c = index.erstesKind[basis]; c !== KEIN && aus.length < BEISPIELE; c = index.naechstes[c]) aus.push(c);
  return aus;
}

function werteTeil(q: Auszugquelle): { kopf: string[]; felder: number; beispiele: string[]; eintraege: number } {
  const { index, text } = q;
  const gefunden = listeFinden(index, KEIN, KEIN);
  const basis = gefunden === KEIN ? 0 : gefunden;
  const s = statistik(index, text, basis);
  const pfad = basis === 0 ? "." : schreiben(teileVon(index, text, basis), "jq");
  const kopf = index.art[basis] === KnotenArt.liste
    ? [`Liste ${pfad} mit ${s.eintraege} Einträgen; die Felder gelten je Eintrag (jq: ${pfad === "." ? "" : pfad}[].feld).`]
    : ["Die Wurzel ist ein einzelner Wert; die Felder gelten ab der Wurzel."];
  const felder = s.felder.filter((f) => f.pfad !== "");
  kopf.push("", "Felder (Pfad: Art):", ...felder.map((f) => `- ${f.pfad}: ${feldArt(f)}`));
  const beispiele = eintraegeVon(index, basis).map((k) => gekuerzt(jsonText(wertAus(index, text, k)), EINTRAG_ZEICHEN));
  return { kopf, felder: felder.length, beispiele, eintraege: s.eintraege };
}

function sqlTeil(q: Auszugquelle): { kopf: string[]; felder: number; beispiele: string[]; eintraege: number } {
  const tabellen = sqlTabellen([{ name: q.name, wert: wertAus(q.index, q.text), typen: q.typen }]);
  const kopf: string[] = ["SQL-Tabellen (SQLite):"];
  const beispiele: string[] = [];
  let felder = 0;
  let eintraege = 0;
  for (const t of tabellen) {
    felder += t.spalten.length;
    eintraege = Math.max(eintraege, t.zeilen.length);
    kopf.push(`- ${t.name}${t.notiz ? ` (${t.notiz})` : ""}, ${t.zeilen.length} Zeilen: ${t.spalten.map((s) => `${s.name} ${s.typ} (${s.art})`).join(", ")}`);
    beispiele.push(`Tabelle ${t.name}:`, t.spalten.map((s) => s.name).join("\t"));
    for (const z of t.zeilen.slice(0, BEISPIELE)) beispiele.push(gekuerzt(z.map((w) => (w === null ? "NULL" : String(w))).join("\t"), EINTRAG_ZEICHEN));
  }
  return { kopf, felder, beispiele, eintraege };
}

/** Den Auszug bauen. Reicht der Platz nicht, gehen weniger Beispiele mit, nie mehr als AUSZUG_ZEICHEN. */
export function auszugBauen(q: Auszugquelle, art: Auszugart, zusatz: readonly Zusatz[] = []): Auszug {
  const teil = art === "sql" ? sqlTeil(q) : werteTeil(q);
  const anfang = [`Dokument: ${q.name} (${q.format})`, ...teil.kopf];
  if (art === "xml") anfang.push("", "Anfang des Dokuments im Original:", gekuerzt(q.text, ROH_ZEICHEN));
  const nach = zusatz.flatMap((z) => ["", `${z.titel}:`, z.text]);
  const titel = art === "sql" ? "Beispielzeilen, durch Tabulator getrennt" : "Beispieleinträge als JSON";
  let beispiele = teil.beispiele;
  const bauen = (b: readonly string[]): string => [...anfang, "", `${titel} (${zeilenZahl(b, art)} von ${teil.eintraege}):`, ...b, ...nach].join("\n");
  let text = bauen(beispiele);
  while (text.length > AUSZUG_ZEICHEN && beispiele.length > 1) {
    beispiele = beispiele.slice(0, Math.floor(beispiele.length / 2));
    text = bauen(beispiele);
  }
  if (text.length > AUSZUG_ZEICHEN) text = gekuerzt(text, AUSZUG_ZEICHEN);
  return { text, felder: teil.felder, zeilen: zeilenZahl(beispiele, art), eintraege: teil.eintraege };
}

/** Zeilen ohne die Kopfzeilen der Tabellen */
function zeilenZahl(b: readonly string[], art: Auszugart): number {
  return art === "sql" ? b.filter((z) => !z.startsWith("Tabelle ")).length - b.filter((z) => z.startsWith("Tabelle ")).length : b.length;
}
