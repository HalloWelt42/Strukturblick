// Lesedienst je Dokument: ein eigener Worker, der einen veralteten Auftrag wirklich abbricht (Worker beenden und neu
// starten), sobald eine neuere Revision gelesen werden soll (Leitgedanke 3). Antworten älterer Aufträge kommen nie an.

import type { Analyse } from "../kern/befehl";
import type { FormatKennung, Leseoptionen } from "../kern/format";
import { format } from "../formate/registrierung";
import type { LeseAntwort, LeseAuftrag } from "./lesen-nachrichten";

export interface Leseanfrage {
  readonly revision: number;
  readonly text: string;
  readonly format: FormatKennung | null;
  readonly optionen: Leseoptionen;
  readonly dateiname?: string;
}

export type Leseausgang = { readonly ok: true; readonly analyse: Analyse; readonly dauer: number } | { readonly ok: false; readonly fehler: string };

const neuerWorker = (): Worker => new Worker(new URL("./lesen.worker.ts", import.meta.url), { type: "module" });

export class Lesedienst {
  private worker: Worker | null = null;
  private laufend: { auftrag: number; fertig: (a: Leseausgang | null) => void } | null = null;
  private zaehler = 0;

  /** Liest den Text; ein noch laufender Auftrag wird abgebrochen und liefert null. */
  lesen(anfrage: Leseanfrage): Promise<Leseausgang | null> {
    if (this.laufend) {
      this.laufend.fertig(null);
      this.laufend = null;
      this.worker?.terminate();
      this.worker = null;
    }
    const w = (this.worker ??= neuerWorker());
    const auftrag = ++this.zaehler;
    return new Promise((fertig) => {
      this.laufend = { auftrag, fertig };
      w.onmessage = (e: MessageEvent<LeseAntwort>) => {
        const a = e.data;
        if (!this.laufend || a.auftrag !== this.laufend.auftrag) return;
        this.laufend = null;
        if (!a.ok) return fertig({ ok: false, fehler: a.fehler });
        fertig({
          ok: true,
          dauer: a.dauer,
          analyse: { revision: a.revision, format: format(a.format), index: a.index, diagnosen: a.diagnosen, merkmale: a.merkmale },
        });
      };
      w.onerror = (e) => {
        if (this.laufend?.auftrag !== auftrag) return;
        this.laufend = null;
        fertig({ ok: false, fehler: e.message || "Der Lese-Worker ist abgestürzt" });
      };
      const nachricht: LeseAuftrag = { auftrag, ...anfrage };
      w.postMessage(nachricht);
    });
  }

  beenden(): void {
    this.laufend?.fertig(null);
    this.laufend = null;
    this.worker?.terminate();
    this.worker = null;
  }
}
