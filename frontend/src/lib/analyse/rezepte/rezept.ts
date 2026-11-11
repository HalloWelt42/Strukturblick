// Rezepte (entwuerfe/rezepte.html): benannte Folgen fachlicher Schritte, die auf neue Dateien passen. Ein Schritt nennt
// Spalten und Regeln, nie Stellen im Text (die gibt es in der nächsten Datei nicht). Das Schema prüft Rezepte aus der
// Ablage und aus heruntergeladenen Dateien; die Typen folgen daraus (eine Quelle).

import { z } from "zod";

const spalte = z.string().min(1).max(200);
const unlesbar = z.enum(["lassen", "leeren"]);
const an = z.boolean().default(true);

const auswahl = z.discriminatedUnion("art", [
  z.object({ art: z.literal("werte"), werte: z.array(z.string()).min(1) }),
  z.object({ art: z.literal("bereich"), von: z.number().nullable(), bis: z.number().nullable() }),
  z.object({ art: z.literal("monate"), von: z.string().nullable(), bis: z.string().nullable() }),
]);

export const REZEPTSCHRITT = z.discriminatedUnion("art", [
  /** Schreibweisen ersetzen (Ähnliche Werte zusammenführen) */
  z.object({ art: z.literal("ersetzen"), spalte, karte: z.array(z.object({ vorher: z.string(), nachher: z.string() })).min(1), an }),
  /** Beträge in deutscher Schreibweise als Zahl */
  z.object({ art: z.literal("betrag"), spalte, unlesbar, an }),
  /** Datumsangaben als JJJJ-MM-TT */
  z.object({ art: z.literal("datum"), spalte, unlesbar, an }),
  /** Nur Zeilen behalten, die zu allen Filtern passen (Facetten) */
  z.object({ art: z.literal("behalten"), filter: z.array(z.object({ spalte, auswahl })).min(1), an }),
  /** Doppelte Zeilen auflösen: gleich in `spalten` (leer: ganze Zeile), es bleibt die Zeile nach `behalten` */
  z.object({ art: z.literal("duplikate"), spalten: z.array(spalte), behalten: z.enum(["erste", "letzte", "meiste"]), an }),
  /** Eine Spalte aus allen Einträgen entfernen */
  z.object({ art: z.literal("spalte-entfernen"), spalte, an }),
]);

export type Rezeptschritt = z.infer<typeof REZEPTSCHRITT>;

export const REZEPT = z.object({
  kennung: z.string().regex(/^[0-9a-fA-F-]{36}$/),
  name: z.string().trim().min(1).max(120),
  schritte: z.array(REZEPTSCHRITT).max(200),
  /** Spalten der Datei, aus der das Rezept entstand (zum Prüfen neuer Dateien) */
  spalten: z.array(spalte).max(500),
  /** Woraus es entstand, für Menschen ("kunden.csv") */
  quelle: z.string().max(255),
  angelegt: z.string().max(40),
  geaendert: z.string().max(40),
  /** Zuletzt angewendet, neueste zuerst */
  zuletzt: z.array(z.object({ zeit: z.string().max(40), dokument: z.string().max(255), ergebnis: z.string().max(255) })).max(10).default([]),
});

export type Rezept = z.infer<typeof REZEPT>;

/** Rezept aus unbekannter Quelle prüfen; null mit Grund, wenn es keins ist */
export function rezeptLesen(daten: unknown): { ok: true; rezept: Rezept } | { ok: false; fehler: string } {
  const r = REZEPT.safeParse(daten);
  return r.success ? { ok: true, rezept: r.data } : { ok: false, fehler: r.error.issues.map((i) => `${i.path.join(".") || "Rezept"}: ${i.message}`).join("; ") };
}

/** Kurzer Name eines Schritts ("ort zusammenführen") */
export function schrittTitel(s: Rezeptschritt): string {
  switch (s.art) {
    case "ersetzen": return `${s.spalte} zusammenführen`;
    case "betrag": return `${s.spalte} als Betrag`;
    case "datum": return `${s.spalte} vereinheitlichen`;
    case "behalten": return `Zeilen nach ${s.filter.map((f) => f.spalte).join(", ")} behalten`;
    case "duplikate": return s.spalten.length ? `Duplikate nach ${s.spalten.join(", ")}` : "Doppelte Zeilen";
    case "spalte-entfernen": return `Spalte ${s.spalte} entfernen`;
  }
}

/** Art eines Schritts als Abzeichen */
export const SCHRITT_ART: Record<Rezeptschritt["art"], string> = { ersetzen: "Bereinigen", betrag: "Typ", datum: "Datum", behalten: "Zeilen", duplikate: "Zeilen", "spalte-entfernen": "Spalten" };

const BEHALTEN_TEXT = { erste: "die erste Zeile", letzte: "die letzte Zeile", meiste: "die Zeile mit den meisten Angaben" } as const;

/** Ein Satz, was der Schritt tut */
export function schrittErklaerung(s: Rezeptschritt): string {
  const rest = "unlesbar" in s ? (s.unlesbar === "leeren" ? " Nicht lesbare Werte werden leer." : " Nicht lesbare Werte bleiben stehen.") : "";
  switch (s.art) {
    case "ersetzen": return `${s.karte.length} ${s.karte.length === 1 ? "Schreibweise wird" : "Schreibweisen werden"} ersetzt.`;
    case "betrag": return `Beträge wie 1.234,50 werden zur Zahl 1234.50.${rest}`;
    case "datum": return `Alle Daten als Jahr-Monat-Tag, TT.MM.JJJJ wird umgestellt.${rest}`;
    case "behalten": return `Es bleiben nur Zeilen, die zu ${s.filter.length === 1 ? "dem Filter" : `allen ${s.filter.length} Filtern`} passen; die übrigen entfallen.`;
    case "duplikate": return `${s.spalten.length ? `Gleiche ${s.spalten.join(", ")}` : "Ganz gleiche Zeilen"}: ${BEHALTEN_TEXT[s.behalten]} bleibt.`;
    case "spalte-entfernen": return `${s.spalte} fällt aus allen Einträgen weg.`;
  }
}

/** Spalten, die ein Schritt braucht */
export function schrittSpalten(s: Rezeptschritt): string[] {
  if (s.art === "behalten") return [...new Set(s.filter.map((f) => f.spalte))];
  if (s.art === "duplikate") return [...s.spalten];
  return [s.spalte];
}
