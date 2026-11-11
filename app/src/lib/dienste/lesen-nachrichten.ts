// Nachrichten zwischen Oberfläche und Lese-Worker.

import type { Diagnose, FormatKennung, Leseoptionen, Merkmale } from "../kern/format";
import type { Strukturindex } from "../kern/strukturindex";

export interface LeseAuftrag {
  readonly auftrag: number;
  readonly revision: number;
  readonly text: string;
  readonly format: FormatKennung | null;     // null: erkennen
  readonly optionen: Leseoptionen;
  readonly dateiname?: string;
}

export type LeseAntwort =
  | {
      readonly ok: true;
      readonly auftrag: number;
      readonly revision: number;
      readonly format: FormatKennung;
      readonly index: Strukturindex | null;
      readonly diagnosen: readonly Diagnose[];
      readonly merkmale: Merkmale;
      readonly dauer: number;
    }
  | { readonly ok: false; readonly auftrag: number; readonly revision: number; readonly fehler: string };
