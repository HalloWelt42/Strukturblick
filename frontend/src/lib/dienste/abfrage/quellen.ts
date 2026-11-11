// Dokumente im Abfrage-Worker: Text und Index je Dokument und Revision, dazu bei Bedarf der daraus erzeugte Wert und die
// Eingabe für jq. Beides wird je Revision einmal gebaut und behalten, damit Tippen in der Abfrage nicht jedes Mal das
// ganze Dokument neu umsetzt.

import { format } from "../../formate/registrierung";
import type { FormatKennung, Merkmale } from "../../kern/format";
import type { Strukturindex } from "../../kern/strukturindex";
import { wertAus } from "../../analyse/wert";

export interface Dokumentstand {
  readonly kennung: string;
  readonly name: string;
  readonly revision: number;
  readonly format: FormatKennung;
  readonly merkmale: Merkmale;
  readonly text: string;
  readonly index: Strukturindex;
}

/** Eingabe für jq: Text und ob jq ihn als Folge (eine Zeile je Wert) zur Liste fassen soll */
export interface JqEingabe {
  readonly text: string;
  readonly folge: boolean;
}

interface Eintrag {
  readonly stand: Dokumentstand;
  wert?: unknown;
  jq?: JqEingabe;
}

export class Quellen {
  private readonly eintraege = new Map<string, Eintrag>();

  hat(kennung: string, revision: number): boolean {
    return this.eintraege.get(kennung)?.stand.revision === revision;
  }

  setzen(stand: Dokumentstand): void {
    this.eintraege.set(stand.kennung, { stand });
  }

  /** Nur diese Dokumente behalten (geschlossene fallen weg) */
  behalten(kennungen: readonly string[]): void {
    for (const k of [...this.eintraege.keys()]) if (!kennungen.includes(k)) this.eintraege.delete(k);
  }

  stand(kennung: string): Dokumentstand {
    const e = this.eintraege.get(kennung);
    if (!e) throw new Error(`Dokument ${kennung} fehlt im Abfrage-Worker`);
    return e.stand;
  }

  alle(): Dokumentstand[] {
    return [...this.eintraege.values()].map((e) => e.stand);
  }

  wert(kennung: string): unknown {
    const e = this.eintraege.get(kennung);
    if (!e) throw new Error(`Dokument ${kennung} fehlt im Abfrage-Worker`);
    if (!("wert" in e)) e.wert = wertAus(e.stand.index, e.stand.text);
    return e.wert;
  }

  /** Reines JSON geht unverändert an jq (schnell, große Zahlen bleiben genau); sonst der erzeugte Wert als JSON */
  jqEingabe(kennung: string): JqEingabe {
    const e = this.eintraege.get(kennung);
    if (!e) throw new Error(`Dokument ${kennung} fehlt im Abfrage-Worker`);
    if (!e.jq) {
      const art = format(e.stand.format).jsonText?.(e.stand.merkmale) ?? null;
      e.jq = art ? { text: e.stand.text, folge: art === "folge" } : { text: JSON.stringify(this.wert(kennung)), folge: false };
    }
    return e.jq;
  }

  /** Kennung der Gesamtlage für Zwischenstände über alle Dokumente (SQL) */
  lage(): string {
    return [...this.eintraege.values()].map((e) => `${e.stand.kennung}:${e.stand.revision}`).sort().join(",");
  }
}
