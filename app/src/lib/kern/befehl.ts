// Vertrag eines Befehls: Kennung, Werteschema (zod: eine Quelle für Typ und Laufzeitprüfung) und eine reine Funktion,
// die aus dem aktuellen Stand Textänderungen berechnet (Leitgedanke 2). Befehle, die Positionen brauchen, bekommen die
// Analyse genau der aktuellen Revision; ist sie nicht da, rechnen sie nicht.

import type { z } from "zod";
import type { Format, Leseergebnis, TextAenderung } from "./format";

export interface Analyse extends Leseergebnis {
  readonly revision: number;
  readonly format: Format;
}

export interface Umfeld {
  readonly text: string;
  readonly revision: number;
  /** Analyse der aktuellen Revision oder null, wenn sie noch rechnet */
  readonly analyse: Analyse | null;
}

export interface Befehl<S extends z.ZodType = z.ZodType> {
  readonly kennung: string;
  readonly titel: string;
  readonly werte: S;
  /** true: rechnet nur mit der Analyse der aktuellen Revision */
  readonly brauchtAnalyse: boolean;
  /** Sprechender Titel für Verlauf und Meldung aus Werten und Stand davor */
  beschreiben?(werte: z.infer<S>, umfeld: Umfeld): string;
  aenderungen(werte: z.infer<S>, umfeld: Umfeld): readonly TextAenderung[];
}

/** Fachlicher Fehler eines Befehls; die Sitzung meldet ihn, statt abzustürzen. */
export class Befehlsfehler extends Error {}

export const befehl = <S extends z.ZodType>(b: Befehl<S>): Befehl<S> => b;

/** Analyse der aktuellen Revision oder Fehler mit verständlicher Meldung */
export function brauchtAnalyse(umfeld: Umfeld): Analyse {
  const a = umfeld.analyse;
  if (!a || a.revision !== umfeld.revision) throw new Befehlsfehler("Das Dokument wird gerade gelesen; bitte gleich noch einmal");
  if (!a.index) throw new Befehlsfehler("Das Dokument ist nicht lesbar; bitte zuerst im Editor berichtigen");
  return a;
}
