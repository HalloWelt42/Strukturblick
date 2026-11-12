// Tabellenziele beim Konvertieren: CSV (Text) und XLSX (Tabellendatei). Beide machen aus der Hauptliste eine Tabelle
// (tabellieren) und teilen sich die Verlustpunkte zu Listen und null; was nur CSV verliert (Typen, Kopfzeile, Felder
// außerhalb der Liste), steht nur bei CSV. XLSX behält die Typen und legt Felder außerhalb der Liste auf ein Blatt
// "Angaben".

import { GRENZEN, xlsxSchreiben, type Ausgabeblatt } from "../../formate/xlsx/schreiben";
import type { Konvertieroptionen, Verlustpunkt } from "./konvertieren";
import { csvSchreiben, istObjekt, tabellieren, type Tabellierung } from "./tabellieren";

/** Die Liste, die eine Tabelle wird, ihr Name und die obersten Felder außerhalb von ihr samt Werten */
export interface Hauptliste {
  readonly eintraege: unknown[];
  readonly name: string;
  readonly aussen: string[];
  readonly aussenWerte: Record<string, unknown>;
}

export const ANGABEN = "Angaben";

const und = (teile: readonly string[]): string => (teile.length > 1 ? `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}` : (teile[0] ?? ""));
export const code = (teile: readonly string[], hoechstens = 4): string => und([...teile.slice(0, hoechstens).map((t) => `\`${t}\``), ...(teile.length > hoechstens ? [`${teile.length - hoechstens} weitere`] : [])]);
const anzahl = (n: number): string => n.toLocaleString("de-DE");
const mal = (n: number, eins: string, viele: string): string => `${anzahl(n)} ${n === 1 ? eins : viele}`;

/** Listen in den Einträgen: drei Wege mit Zeilen- und Spaltenzahl vorab */
function listenPunkt(h: Hauptliste, t: Tabellierung, o: Konvertieroptionen): Verlustpunkt[] {
  if (!t.listenfeld) return [];
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
  return [{ satz: `\`${f}\` sind Listen: 3 Möglichkeiten`, text: `Eine Zeile hat nur Platz für einen Wert je Spalte.${weitere}`, wahl: { option: "listen", wege } }];
}

function nullPunkt(t: Tabellierung): Verlustpunkt[] {
  let meiste = { spalte: -1, n: 0 };
  t.spalten.forEach((_, i) => {
    const n = t.zeilen.reduce((m, z) => m + (z[i] === null ? 1 : 0), 0);
    if (n > meiste.n) meiste = { spalte: i, n };
  });
  return meiste.n ? [{ satz: "null und leer sehen gleich aus", text: `\`${t.spalten[meiste.spalte].name}\` ist in ${anzahl(meiste.n)} von ${anzahl(t.zeilen.length)} Zeilen \`null\` und wird zur leeren Zelle, wie ein leerer Text.` }] : [];
}

/** CSV: Text mit Trennzeichen; alles wird Text */
export function csvZiel(h: Hauptliste, o: Konvertieroptionen): { text: string; t: Tabellierung; verluste: Verlustpunkt[] } {
  const t = tabellieren(h.eintraege, o.objekte, o.listen);
  const punkte = listenPunkt(h, t, o);
  const beispiele: string[] = [];
  let nullStelle: string | null = null;
  for (const z of t.zeilen.slice(0, 2000)) {
    z.forEach((w, i) => {
      if ((typeof w === "number" || typeof w === "boolean") && beispiele.length < 3 && !beispiele.includes(String(w))) beispiele.push(String(w));
      if (!nullStelle && typeof w === "string" && /^0\d+$/.test(w)) nullStelle = `Die Nummer \`${w}\` in \`${t.spalten[i].name}\` bleibt nur richtig, wenn das lesende Programm die Spalte als Text nimmt.`;
    });
  }
  if (beispiele.length) punkte.push({ satz: "Typen gehen verloren: Zahlen werden Text", text: `In CSV ist alles Text. ${code(beispiele)} kommen als Zeichen an; wer die Datei liest, muss die Typen neu erkennen.${nullStelle ? ` ${nullStelle}` : ""}` });
  punkte.push(...nullPunkt(t));
  if (!o.kopfzeile) punkte.push({ satz: "Ohne Kopfzeile fehlen die Namen", text: "Wer die Datei liest, sieht nur die Werte und muss die Reihenfolge der Spalten kennen." });
  if (h.aussen.length) punkte.push({ satz: `${code(h.aussen)} ${h.aussen.length === 1 ? "fehlt" : "fehlen"}`, text: `CSV kennt nur eine Tabelle. Übernommen wird die Liste \`${h.name}\`.` });
  return { text: csvSchreiben(t, o.trennzeichen, o.kopfzeile), t, verluste: punkte };
}

/** XLSX: Tabellendatei mit Typen; Felder außerhalb der Liste auf dem Blatt Angaben. Vorschau als CSV-Text. */
export function xlsxZiel(h: Hauptliste, o: Konvertieroptionen): { daten: Uint8Array; vorschau: string; t: Tabellierung; verluste: Verlustpunkt[] } {
  const t = tabellieren(h.eintraege, o.objekte, o.listen);
  const punkte = [...listenPunkt(h, t, o), ...nullPunkt(t)];
  if (t.zeilen.length + 1 > GRENZEN.zeilen) punkte.push({ satz: "Zu viele Zeilen für XLSX", text: `Ein Blatt fasst ${anzahl(GRENZEN.zeilen)} Zeilen; ${anzahl(t.zeilen.length + 1 - GRENZEN.zeilen)} fallen weg.` });
  if (t.spalten.length > GRENZEN.spalten) punkte.push({ satz: "Zu viele Spalten für XLSX", text: `Ein Blatt fasst ${anzahl(GRENZEN.spalten)} Spalten; die übrigen fallen weg.` });
  const lang = t.zeilen.reduce((n, z) => n + z.filter((w) => typeof w === "string" && w.length > GRENZEN.zeichen).length, 0);
  if (lang) punkte.push({ satz: "Sehr lange Texte werden gekürzt", text: `Eine Zelle fasst ${anzahl(GRENZEN.zeichen)} Zeichen; ${mal(lang, "Text wird", "Texte werden")} gekürzt.` });
  const blaetter: Ausgabeblatt[] = [{ name: h.name || "Daten", spalten: t.spalten.map((s) => s.name), zeilen: t.zeilen }];
  if (h.aussen.length) blaetter.push({ name: ANGABEN, spalten: ["Feld", "Wert"], zeilen: h.aussen.map((k) => [k, h.aussenWerte[k]]) });
  return { daten: xlsxSchreiben(blaetter), vorschau: csvSchreiben(t, ";", true), t, verluste: punkte };
}
