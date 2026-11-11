// Registrierung der Formate: die eine Liste, aus der Erkennung, Öffnen-Dialog und Oberfläche lesen.

import type { Format, FormatKennung } from "./vertrag";
import { JSON_FORMAT } from "./json";
import { NDJSON_FORMAT } from "./ndjson";
import { CSV_FORMAT } from "./csv";
import { YAML_FORMAT } from "./yaml";

export const FORMATE: readonly Format[] = [JSON_FORMAT, NDJSON_FORMAT, CSV_FORMAT, YAML_FORMAT];

const NACH_KENNUNG = new Map<FormatKennung, Format>(FORMATE.map((f) => [f.kennung, f]));

export function format(kennung: FormatKennung): Format {
  const f = NACH_KENNUNG.get(kennung);
  if (!f) throw new Error(`Format ${kennung} ist nicht angemeldet`);
  return f;
}

/** Bestes Format für einen Text; bei Gleichstand gewinnt die Dateiendung, sonst die Reihenfolge der Liste. */
export function erkennen(text: string, dateiname?: string): Format {
  const endung = dateiname?.split(".").pop()?.toLowerCase();
  let bestes = FORMATE[0];
  let wert = -1;
  for (const f of FORMATE) {
    const w = f.erkennen(text, dateiname) + (endung && f.endungen.includes(endung) ? 0.25 : 0);
    if (w > wert) {
      wert = w;
      bestes = f;
    }
  }
  return bestes;
}

export const ENDUNGEN: readonly string[] = FORMATE.flatMap((f) => f.endungen);
