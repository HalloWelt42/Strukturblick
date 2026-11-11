// Was Bereinigen am Dokument tut, jeweils als genau ein Befehl über das Blatt (ein Eintrag im Verlauf, Rückgängig mit
// Meldung): Zeilen behalten, ähnliche Werte zusammenführen, Typen umwandeln; dazu "Als neues Dokument" (lässt das
// Dokument ganz). Hauptbereich und Inspektor rufen dieselben Vorgänge.

import type { NeuerWert } from "../../../kern/format";
import type { Filterergebnis } from "../../../analyse/bereinigen/facetten";
import { sichtWerte, werteAusgeben, type Ausgabeformat } from "../../../analyse/ausgabe";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
import { arbeitsplatz } from "../../../zustand/arbeitsplatz.svelte";
import { meldungen } from "../../../zustand/meldungen.svelte";
import { anzahl } from "../../ansichten/tabelle/zahlen";
import type { BereinigenZustand, Tabellenstand } from "./bereinigenZustand.svelte";

const ORT = "Bereinigen";

/** Stellen der Zeilen, die beim Behalten wegfallen */
export function wegfallende(s: Tabellenstand, ergebnis: Filterergebnis): number[] {
  const bleiben = new Uint8Array(s.tabelle.zeilen.length);
  for (const i of ergebnis.zeilen) bleiben[i] = 1;
  const weg: number[] = [];
  for (let i = 0; i < bleiben.length; i++) if (!bleiben[i]) weg.push(i);
  return weg;
}

/** Nur die gefilterten Zeilen behalten: die übrigen Einträge verschwinden aus dem Text, alles andere bleibt. */
export async function zeilenBehalten(blatt: Arbeitsblatt, z: BereinigenZustand, s: Tabellenstand, ergebnis: Filterergebnis): Promise<void> {
  const stellen = wegfallende(s, ergebnis);
  if (!stellen.length || !ergebnis.zeilen.length) return;
  const titel = `Bereinigen: ${anzahl(ergebnis.zeilen.length)} von ${anzahl(s.tabelle.zeilen.length)} Zeilen behalten`;
  const e = await blatt.ausfuehrenMitMeldung("eintraege.entfernen", { liste: s.listeZeiger, stellen, titel }, { ort: ORT });
  if (e.ok) z.filterLeeren();
}

/** Gefilterte Zeilen als neues Dokument; CSV bleibt CSV, sonst JSON */
export async function alsNeuesDokument(blatt: Arbeitsblatt, s: Tabellenstand, zeilen: Int32Array): Promise<void> {
  const f = s.analyse.format.faehigkeiten;
  const format: Ausgabeformat = f.tabellarisch && !f.typen ? "csv" : "json";
  const stamm = blatt.name.replace(/\.[^.]+$/, "");
  const neu = await arbeitsplatz.neu(`${stamm}-auswahl.${format}`, werteAusgeben(sichtWerte(s.tabelle, s.index, s.text, zeilen), format), blatt.ordner);
  neu.zeigen({ art: "ansicht", kennung: "tabelle" });
  meldungen.zeigen({ text: `Neues Dokument ${neu.name} mit ${anzahl(zeilen.length)} Zeilen`, art: "erfolg" });
}

export interface Zellwechsel {
  readonly zeiger: string;
  readonly neu: NeuerWert;
}

/** Viele Zellen in einem Vorgang setzen (Zusammenführen, Umwandeln) */
export async function zellenSetzen(blatt: Arbeitsblatt, aenderungen: readonly Zellwechsel[], titel: string): Promise<boolean> {
  if (!aenderungen.length) return false;
  const e = await blatt.ausfuehrenMitMeldung("werte.setzen", { aenderungen, titel }, { ort: ORT });
  return e.ok;
}
