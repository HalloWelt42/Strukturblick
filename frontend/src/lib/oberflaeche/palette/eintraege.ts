// Einträge der Befehlspalette und ihre Ordnung: zuletzt benutzte oben, dann je Gruppe nach Güte des Treffers.
// Woher die Einträge kommen (Aktionen, Ansichten, Dokumente), regelt quellen.ts; hier zählt nur die Reihenfolge.

import { unscharf } from "./suche";

export type Gruppe = "befehl" | "dokument" | "ansicht";

export const GRUPPEN: readonly { readonly kennung: Gruppe; readonly titel: string }[] = [
  { kennung: "befehl", titel: "Befehle" },
  { kennung: "dokument", titel: "Dokumente" },
  { kennung: "ansicht", titel: "Ansichten" },
];

export interface Paletteneintrag {
  /** Eindeutig über alle Gruppen ("befehl:ablegen", "dokument:<uuid>"); so merkt sich die Palette Benutztes */
  readonly kennung: string;
  readonly gruppe: Gruppe;
  readonly titel: string;
  readonly beschreibung: string;
  readonly symbol: string;                 // Font-Awesome-Klasse
  readonly kappen?: readonly string[];     // Tastenkürzel als Kappen
  readonly abzeichen?: string;
  ausfuehren(): void;
}

export interface Fund {
  readonly eintrag: Paletteneintrag;
  /** Getroffene Stellen im Titel (leer, wenn nur die Beschreibung trifft oder nicht gesucht wird) */
  readonly stellen: readonly number[];
}

export interface Fundgruppe {
  readonly titel: string;
  readonly funde: readonly Fund[];
}

export interface Grenzen {
  /** Höchstens so viele zuletzt benutzte oben */
  readonly zuletzt: number;
  /** Höchstens so viele je Gruppe */
  readonly jeGruppe: number;
}

export const VORGABE_GRENZEN: Grenzen = { zuletzt: 5, jeGruppe: 8 };

/** Titel zählt voll, die Beschreibung nur wenig (sie hilft finden, soll aber nicht vor Titeltreffern stehen) */
function bewerten(e: Paletteneintrag, anfrage: string): { punkte: number; stellen: readonly number[] } | null {
  const t = unscharf(anfrage, e.titel);
  if (t) return t;
  const b = unscharf(anfrage, `${e.titel} ${e.beschreibung}`, false);
  return b ? { punkte: b.punkte / 10, stellen: [] } : null;
}

export function ordnen(eintraege: readonly Paletteneintrag[], anfrage: string, zuletzt: readonly string[], grenzen: Grenzen = VORGABE_GRENZEN): Fundgruppe[] {
  const bewertet = new Map<string, Fund & { punkte: number }>();
  for (const e of eintraege) {
    const b = bewerten(e, anfrage);
    if (b) bewertet.set(e.kennung, { eintrag: e, stellen: b.stellen, punkte: b.punkte });
  }

  const oben = zuletzt.map((k) => bewertet.get(k)).filter((f) => f !== undefined).slice(0, grenzen.zuletzt);
  const gezeigt = new Set(oben.map((f) => f.eintrag.kennung));
  const gruppen = GRUPPEN.map((g) => ({
    titel: g.titel,
    funde: [...bewertet.values()]
      .filter((f) => f.eintrag.gruppe === g.kennung && !gezeigt.has(f.eintrag.kennung))
      .sort((a, b) => b.punkte - a.punkte)       // stabil: ohne Anfrage bleibt die Reihenfolge der Quelle
      .slice(0, grenzen.jeGruppe),
  })).filter((g) => g.funde.length);
  // Mit Anfrage steht die Gruppe mit dem besten Treffer vorn; ohne bleibt die feste Folge
  if (anfrage.trim()) gruppen.sort((a, b) => b.funde[0].punkte - a.funde[0].punkte);
  return [...(oben.length ? [{ titel: "Zuletzt benutzt", funde: oben }] : []), ...gruppen];
}
