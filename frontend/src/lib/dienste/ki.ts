// Schnittstelle der KI (STB-60): Typen, wie der Server sie liefert (backend/app/ki/modelle.py). Gerechnet wird nur über
// den eigenen Server und von dort über die Leitstelle; die Aufrufe stehen in server/ki.ts und gibt es nur in der Bauart
// mit Server.

import type { KiAufgabe, KiSprache } from "../analyse/ki/aufgaben";

export interface KiModell {
  readonly id: string;
  readonly name: string;
  readonly zweck: string;
  readonly geladen: boolean;
  readonly rechner: string | null;
  readonly extern: boolean;
}

export interface KiStand {
  readonly an: boolean;
  readonly eingerichtet: boolean;
  readonly bereit: boolean;
  readonly meldung: string;
  readonly modell: string;
  readonly modellname: string;
  readonly modelle: readonly KiModell[];
}

export interface KiAuftrag {
  readonly aufgabe: KiAufgabe;
  readonly frage: string;
  readonly auszug: string;
  readonly sprache: KiSprache | null;
  /** Der vorige Vorschlag bei "Anders vorschlagen" */
  readonly vorher: string | null;
}

export interface KiVorschlag {
  readonly ergebnis: string;
  readonly erklaerung: readonly string[];
  /** Kennung des Modells, das gerechnet hat; den Namen kennt der Stand */
  readonly modell: string;
  readonly rechner: string | null;
  readonly dauer_ms: number;
  readonly verbrauch: { readonly eingabe: number; readonly ausgabe: number } | null;
  readonly auftrag: string | null;
}
