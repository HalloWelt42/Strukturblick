// Einen Rezeptschritt auf einem gelesenen Dokument planen: welcher Befehl (werte.setzen oder eintraege.entfernen) mit
// welchen Werten, wie viele Zellen und Zeilen er trifft und Beispiele für die Vorschau. Fehlt eine Spalte, wird nur
// dieser Schritt übersprungen. Rein; ausgeführt wird erst in ausfuehren.ts über eine Sitzung.

import { inhalt, istBehaelter, KEIN, KnotenArt, type Strukturindex } from "../../kern/strukturindex";
import { zeigerAus } from "../../kern/pfade";
import type { Format, NeuerWert } from "../../kern/format";
import { listeFinden, tabelleBauen, zelle, zellZeiger, type Tabelle } from "../tabelle";
import { ersetzungen } from "../bereinigen/aehnlich";
import { zeilenFiltern, type Filterergebnis } from "../bereinigen/facetten";
import { betragAlsZahl, datumAlsIso } from "../bereinigen/typen";
import { schrittSpalten, type Rezeptschritt } from "./rezept";

export interface Beispiel {
  readonly vorher: string;
  /** null: nicht lesbar */
  readonly nachher: string | null;
  readonly anzahl: number;
}

export interface Befehlsaufruf {
  readonly kennung: string;
  readonly werte: unknown;
}

export type Plan =
  | { readonly status: "aus" }
  | { readonly status: "uebersprungen"; readonly grund: string }
  | {
      readonly status: "ok";
      /** null: der Schritt ändert in dieser Datei nichts */
      readonly befehl: Befehlsaufruf | null;
      readonly zellen: number;
      readonly zeilen: number;
      /** Nicht lesbare Werte (Betrag, Datum) */
      readonly unlesbar: number;
      readonly beispiele: readonly Beispiel[];
    };

/** So viele verschiedene Beispiele zeigt die Vorschau je Schritt */
const BEISPIELE = 5;
const SCHON_ZAHL = /^[-+]?\d+(?:\.\d+)?$/;

/** Die Tabelle, auf der Rezepte arbeiten: dieselbe Liste, die die Ansicht Tabelle ohne Wahl zeigt */
export function rezeptTabelle(index: Strukturindex, text: string): Tabelle | null {
  const liste = listeFinden(index, KEIN, KEIN);
  return liste === KEIN ? null : tabelleBauen(index, text, liste);
}

/** Leerer Wert passend zum Format: null, wo es Typen gibt, sonst leerer Text */
const leerFuer = (f: Format): NeuerWert => (f.faehigkeiten.typen ? { art: "nichts" } : { art: "text", wert: "" });

function beispieleAus(paare: readonly { vorher: string; nachher: string | null }[]): Beispiel[] {
  const z = new Map<string, Beispiel>();
  for (const p of paare) {
    const k = `${p.vorher}\u0000${p.nachher ?? ""}`;
    const b = z.get(k);
    z.set(k, { vorher: p.vorher, nachher: p.nachher, anzahl: (b?.anzahl ?? 0) + 1 });
  }
  return [...z.values()].sort((a, b) => b.anzahl - a.anzahl).slice(0, BEISPIELE);
}

/** Zeilen behalten: Stellen der übrigen Zeilen (für eintraege.entfernen) */
export function wegfallende(t: Tabelle, ergebnis: Filterergebnis): number[] {
  const bleiben = new Uint8Array(t.zeilen.length);
  for (const i of ergebnis.zeilen) bleiben[i] = 1;
  const weg: number[] = [];
  for (let i = 0; i < bleiben.length; i++) if (!bleiben[i]) weg.push(i);
  return weg;
}

export function schrittPlanen(schritt: Rezeptschritt, index: Strukturindex, text: string, format: Format): Plan {
  if (!schritt.an) return { status: "aus" };
  const t = rezeptTabelle(index, text);
  if (!t) return { status: "uebersprungen", grund: "In dieser Datei gibt es keine Liste gleich aufgebauter Einträge." };
  const fehlt = schrittSpalten(schritt).filter((s) => !t.spalteNach.has(s));
  if (fehlt.length) return { status: "uebersprungen", grund: `Die Spalte ${fehlt.join(", ")} gibt es in dieser Datei nicht.` };

  if (schritt.art === "behalten") {
    const ergebnis = zeilenFiltern(t, index, text, schritt.filter);
    if (!ergebnis.zeilen.length) return { status: "uebersprungen", grund: "Keine Zeile passt zu den Filtern; der Schritt würde alle Zeilen entfernen." };
    const stellen = wegfallende(t, ergebnis);
    return {
      status: "ok",
      befehl: stellen.length ? { kennung: "eintraege.entfernen", werte: { liste: zeigerAus(t.listeTeile), stellen } } : null,
      zellen: 0, zeilen: stellen.length, unlesbar: 0, beispiele: [],
    };
  }

  const j = t.spalteNach.get(schritt.spalte)!;
  if (schritt.art === "ersetzen") {
    const e = ersetzungen(t, index, text, j, new Map(schritt.karte.map((p) => [p.vorher, p.nachher])));
    return {
      status: "ok",
      befehl: e.length ? { kennung: "werte.setzen", werte: { aenderungen: e.map((x) => ({ zeiger: x.zeiger, neu: { art: "text", wert: x.nachher } })) } } : null,
      zellen: e.length, zeilen: 0, unlesbar: 0, beispiele: beispieleAus(e),
    };
  }

  // Betrag oder Datum: jede gefüllte Textzelle der Spalte lesen; Zahlen und schon passende Daten bleiben
  const aenderungen: { zeiger: string; neu: NeuerWert }[] = [];
  const paare: { vorher: string; nachher: string | null }[] = [];
  let unlesbar = 0;
  for (let i = 0; i < t.zeilen.length; i++) {
    const k = zelle(t, index, i, j);
    if (k === KEIN || istBehaelter(index.art[k]) || index.art[k] !== KnotenArt.text) continue;
    const vorher = inhalt(index, text, k);
    if (vorher.trim() === "") continue;
    // Schon eine Zahl in Rechenschreibweise (etwa aus einem früheren Lauf in einer CSV): bleibt
    if (schritt.art === "betrag" && SCHON_ZAHL.test(vorher.trim())) continue;
    const nachher = schritt.art === "betrag" ? betragAlsZahl(vorher) : datumAlsIso(vorher);
    if (nachher === vorher.trim() && schritt.art === "datum") continue;
    if (nachher === null) {
      unlesbar++;
      paare.push({ vorher, nachher: null });
      if (schritt.unlesbar === "leeren") aenderungen.push({ zeiger: zellZeiger(t, i, j), neu: leerFuer(format) });
      continue;
    }
    paare.push({ vorher, nachher });
    aenderungen.push({ zeiger: zellZeiger(t, i, j), neu: schritt.art === "betrag" ? { art: "zahl", roh: nachher } : { art: "text", wert: nachher } });
  }
  return {
    status: "ok",
    befehl: aenderungen.length ? { kennung: "werte.setzen", werte: { aenderungen } } : null,
    zellen: aenderungen.length, zeilen: 0, unlesbar, beispiele: beispieleAus(paare),
  };
}
