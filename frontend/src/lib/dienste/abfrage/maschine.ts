// Gemeinsamer Vertrag der Sprachmaschinen im Abfrage-Worker: ein Auftrag geht hinein, ein Ergebnis kommt heraus oder
// ein Abfragefehler mit Stelle wird geworfen.

import type { Abfrageergebnis, Abfragefehler, SprachKennung } from "../../kern/abfrage";
import type { Suchoptionen } from "../../analyse/abfrage/textsuche";
import type { Quellen } from "./quellen";

export interface Abfrageauftrag {
  readonly sprache: SprachKennung;
  readonly ausdruck: string;
  /** Kennung des Dokuments für Sprachen über ein Dokument; null bei SQL (alle) */
  readonly ziel: string | null;
  readonly suche: Suchoptionen;
  /** Das ganze Ergebnis als Text (für ein neues Dokument) statt der Anzeige */
  readonly ganz: boolean;
}

export type Maschine = (a: Abfrageauftrag, q: Quellen) => Promise<Abfrageergebnis>;

export class Abfragewurf extends Error {
  constructor(readonly fehler: Abfragefehler) {
    super(fehler.meldung);
  }
}

export const wurf = (meldung: string, zeile: number | null = null, spalte: number | null = null): Abfragewurf => new Abfragewurf({ meldung, zeile, spalte });

export function zielVon(a: Abfrageauftrag): string {
  if (!a.ziel) throw wurf("Kein Dokument gewählt");
  return a.ziel;
}
