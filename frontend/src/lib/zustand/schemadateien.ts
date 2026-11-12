// XML Schemas in der Ablage: welche es gibt und die eines Ordners als Kandidaten für Importe und Includes. Validieren
// (Prüfen gegen XSD) und die Ansicht Schema finden so dieselben Dateien.

import type { Schemadatei } from "../analyse/xsd/dateien";
import { ablageverwaltung } from "./ablageverwaltung.svelte";
import { arbeitsplatz } from "./arbeitsplatz.svelte";

export interface SchemaInAblage {
  readonly kennung: string;
  readonly name: string;
  readonly ordner: string;
}

export const istXsdName = (name: string): boolean => /\.xsd$/i.test(name);

/** Alle XSD-Dokumente der Ablage, nach Namen */
export function schemasDerAblage(): SchemaInAblage[] {
  return arbeitsplatz.dokumente
    .filter((d) => istXsdName(d.name))
    .map((d) => ({ kennung: d.kennung, name: d.name, ordner: d.ordner }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

/** Die XSD eines Ordners mit Text (offene Blätter mit ihrem aktuellen Stand), ohne das Dokument `ausser` */
export async function schemasImOrdner(ordner: string, ausser?: string): Promise<Schemadatei[]> {
  const aus: Schemadatei[] = [];
  for (const d of schemasDerAblage().filter((x) => x.ordner === ordner && x.kennung !== ausser)) {
    const t = await ablageverwaltung.textVon(d.kennung);
    if (t) aus.push({ pfad: d.name, text: t.text });
  }
  return aus;
}

/** Namen der Dokumente in einem Ordner */
export const belegteNamen = (ordner: string): Set<string> => new Set(arbeitsplatz.dokumente.filter((d) => d.ordner === ordner).map((d) => d.name));

/** Freier Name im Ordner: "a.xsd", sonst "a 2.xsd", "a 3.xsd" ...; merkt ihn sich in `belegt` */
export function freierName(wunsch: string, belegt: Set<string>): string {
  let name = wunsch;
  for (let i = 2; belegt.has(name); i++) name = wunsch.replace(/(\.[^.]+)?$/, ` ${i}$1`);
  belegt.add(name);
  return name;
}
