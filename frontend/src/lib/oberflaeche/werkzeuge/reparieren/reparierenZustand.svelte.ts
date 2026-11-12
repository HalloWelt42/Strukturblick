// Zustand des Werkzeugs Reparieren je Blatt: Leseart (gewählt oder vermutet), Zeilen, die so bleiben sollen, und die
// gewählte Zeile. Reparatur und Nachprüfung werden je Text gemerkt, damit Hauptbereich und Inspektor dasselbe teilen.

import { lesartVermuten, nachher, reparieren, vorhaben, type Leseart, type Reparatur, type Vorhaben, type Zeilenbefund } from "../../../analyse/reparatur/reparatur";
import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";

export class ReparierenZustand {
  /** Vom Menschen gewählte Leseart; null heißt vermutet */
  gewaehlteLeseart = $state<Leseart | null>(null);
  /** Zeilen, die so bleiben sollen, gültig für genau einen Textstand */
  private gelassen = $state.raw<{ revision: number; zeilen: ReadonlySet<number> }>({ revision: -1, zeilen: new Set() });
  /** Gewählte Zeile (Textzeile ab 1) */
  gewaehlt = $state<number | null>(null);
  private merkReparatur: { text: string; als: Leseart; reparatur: Reparatur } | null = null;
  private merkNachher: { text: string; als: Leseart; schluessel: string; vorhaben: Vorhaben; nachher: ReturnType<typeof nachher> } | null = null;

  leseart(blatt: Arbeitsblatt): { als: Leseart; grund: string } {
    const vermutet = lesartVermuten(blatt.text, blatt.analyse?.format.kennung ?? blatt.formatWahl);
    return this.gewaehlteLeseart ? { als: this.gewaehlteLeseart, grund: this.gewaehlteLeseart === vermutet.als ? vermutet.grund : "von Hand gewählt" } : vermutet;
  }

  reparatur(blatt: Arbeitsblatt): Reparatur {
    const als = this.leseart(blatt).als;
    const m = this.merkReparatur;
    if (m && m.text === blatt.text && m.als === als) return m.reparatur;
    const reparatur = reparieren(blatt.text, als);
    this.merkReparatur = { text: blatt.text, als, reparatur };
    return reparatur;
  }

  bleibt(blatt: Arbeitsblatt, zeile: number): boolean {
    return this.gelassen.revision === blatt.revision && this.gelassen.zeilen.has(zeile);
  }

  setzen(blatt: Arbeitsblatt, zeile: number, lassen: boolean): void {
    const zeilen = new Set(this.gelassen.revision === blatt.revision ? this.gelassen.zeilen : []);
    if (lassen) zeilen.add(zeile);
    else zeilen.delete(zeile);
    this.gelassen = { revision: blatt.revision, zeilen };
  }

  /** Befunde, deren Vorschlag übernommen werden soll */
  gewaehlteBefunde(blatt: Arbeitsblatt): Zeilenbefund[] {
    return this.reparatur(blatt).befunde.filter((b) => b.eingriffe.length && !this.bleibt(blatt, b.zeile));
  }

  /** Was Übernehmen täte und wie lesbar der Text danach ist */
  ergebnis(blatt: Arbeitsblatt): { vorhaben: Vorhaben; nachher: ReturnType<typeof nachher> } {
    const als = this.leseart(blatt).als;
    const gewaehlt = this.gewaehlteBefunde(blatt);
    const schluessel = gewaehlt.map((b) => b.zeile).join(",");
    const m = this.merkNachher;
    if (m && m.text === blatt.text && m.als === als && m.schluessel === schluessel) return m;
    const v = vorhaben(blatt.text, gewaehlt);
    this.merkNachher = { text: blatt.text, als, schluessel, vorhaben: v, nachher: nachher(v.text, als) };
    return this.merkNachher;
  }

  /** Die gewählten Vorschläge als ein Vorgang; liest danach in der gewählten Leseart, falls sie abweicht. */
  async uebernehmen(blatt: Arbeitsblatt): Promise<void> {
    const als = this.leseart(blatt).als;
    const { vorhaben: v } = this.ergebnis(blatt);
    if (!v.aenderungen.length) return;
    const titel = `Repariert: ${v.zeilen} ${v.zeilen === 1 ? "Zeile" : "Zeilen"}, ${v.ergaenzt} Zeichen ergänzt${v.geloescht ? `, ${v.geloescht} gelöscht` : ""}`;
    const e = await blatt.ausfuehrenMitMeldung("text.aendern", { aenderungen: v.aenderungen, titel }, { ort: "Reparieren" });
    if (!e.ok) return;
    this.gewaehlt = null;
    if ((blatt.analyse?.format.kennung ?? blatt.formatWahl) !== als) blatt.leseweise(als);
  }
}

export const reparierenZustand = (blatt: Arbeitsblatt): ReparierenZustand => blatt.zustandFuer("reparieren", () => new ReparierenZustand());
