// Zustand des Werkzeugs Konvertieren je Blatt: Zielformat und Optionen. Die Umwandlung wird je Analyse, Ziel und
// Optionen gemerkt, damit Hauptbereich und Inspektor dasselbe Ergebnis teilen.

import type { Analyse } from "../../../kern";
import { hatKommentare, umwandeln, VORGABEN, zieleFuer, type Konvertieroptionen, type Umwandlung, type Zielkennung } from "../../../analyse/konvertieren/konvertieren";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";

export class KonvertierenZustand {
  /** Gewähltes Ziel; null heißt das erste passende */
  gewaehltesZiel = $state<Zielkennung | null>(null);
  optionen = $state<Konvertieroptionen>({ ...VORGABEN });
  private merk: { analyse: Analyse; schluessel: string; umwandlung: Umwandlung } | null = null;

  ziel(blatt: Arbeitsblatt): Zielkennung | null {
    const ziele = zieleFuer(blatt.analyse?.format.kennung ?? "");
    return ziele.find((z) => z.kennung === this.gewaehltesZiel)?.kennung ?? ziele[0]?.kennung ?? null;
  }

  setzen<K extends keyof Konvertieroptionen>(option: K, wert: Konvertieroptionen[K]): void {
    this.optionen = { ...this.optionen, [option]: wert };
  }

  /** Umwandlung des aktuellen Stands; null, solange das Dokument nicht lesbar ist */
  umwandlung(blatt: Arbeitsblatt): Umwandlung | null {
    const a = blatt.analyse;
    const z = this.ziel(blatt);
    if (!a?.index || !z) return null;
    const schluessel = `${z} ${JSON.stringify(this.optionen)}`;
    if (this.merk?.analyse === a && this.merk.schluessel === schluessel) return this.merk.umwandlung;
    const text = blatt.analyseText;
    const umwandlung = umwandeln({ index: a.index, text, format: a.format.kennung, formatName: a.format.name, kommentare: hatKommentare(a.format.kennung, text, a.merkmale), fehler: a.diagnosen.filter((d) => d.schwere === "fehler").length, datumswerte: Number(a.merkmale.datumswerte ?? 0) }, z, this.optionen);
    this.merk = { analyse: a, schluessel, umwandlung };
    return umwandlung;
  }
}

export const konvertierenZustand = (blatt: Arbeitsblatt): KonvertierenZustand => blatt.zustandFuer("konvertieren", () => new KonvertierenZustand());
