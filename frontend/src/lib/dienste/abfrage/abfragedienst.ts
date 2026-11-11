// Abfragedienst: ein Worker für alle Abfragen (SQL braucht alle Dokumente zugleich). Er schickt ein Dokument nur, wenn
// der Worker dessen Revision noch nicht hat. Läuft schon ein Auftrag, wartet höchstens einer dahinter (der neueste);
// ältere, die nie liefen, gelten als abgelöst. Rechnet ein Auftrag länger als die Zeitgrenze, wird der Worker beendet
// (Regex mit Rückverfolgung, Endlosschleife in jq) und beim nächsten Auftrag neu gestartet.

import { ABFRAGE_GRENZEN, type Abfrageausgang } from "../../kern/abfrage";
import type { Abfrageauftrag } from "./maschine";
import type { AbfrageAntwort, AbfrageNachricht, Dokumentverweis } from "./nachrichten";
import type { Dokumentstand } from "./quellen";

export type { Dokumentstand } from "./quellen";
export type { Abfrageauftrag } from "./maschine";

const neuerWorker = (): Worker => new Worker(new URL("./abfrage.worker.ts", import.meta.url), { type: "module" });

interface Wartend {
  readonly auftrag: Abfrageauftrag;
  readonly dokumente: readonly Dokumentstand[];
  readonly offen: readonly string[];
  readonly fertig: (a: Abfrageausgang | null) => void;
}

export class Abfragedienst {
  private worker: Worker | null = null;
  private readonly gesendet = new Map<string, number>();
  private laufend: { nummer: number; fertig: (a: Abfrageausgang | null) => void; zeit: ReturnType<typeof setTimeout> } | null = null;
  private wartend: Wartend | null = null;
  private zaehler = 0;

  /** Rechnet; null heißt abgelöst (ein neuerer Auftrag kam, bevor dieser lief). */
  rechnen(auftrag: Abfrageauftrag, dokumente: readonly Dokumentstand[], offen: readonly string[]): Promise<Abfrageausgang | null> {
    return new Promise((fertig) => {
      this.wartend?.fertig(null);
      this.wartend = { auftrag, dokumente, offen, fertig };
      if (!this.laufend) this.weiter();
    });
  }

  beenden(): void {
    this.wartend?.fertig(null);
    this.wartend = null;
    this.abbrechen();
  }

  private weiter(): void {
    const w = this.wartend;
    if (!w) return;
    this.wartend = null;
    const worker = (this.worker ??= this.starten());
    const nummer = ++this.zaehler;
    const dokumente: (Dokumentstand | Dokumentverweis)[] = w.dokumente.map((d) => {
      if (this.gesendet.get(d.kennung) === d.revision) return { kennung: d.kennung, revision: d.revision };
      this.gesendet.set(d.kennung, d.revision);
      return d;
    });
    for (const k of [...this.gesendet.keys()]) if (!w.offen.includes(k)) this.gesendet.delete(k);
    const zeit = setTimeout(() => {
      const sekunden = Math.round(ABFRAGE_GRENZEN.zeitMs / 1000);
      w.fertig({ ok: false, fehler: { meldung: `Nach ${sekunden} s abgebrochen (Zeitgrenze). Bei regulären Ausdrücken helfen weniger verschachtelte Wiederholungen, bei jq eine Grenze wie limit(100; ...).`, zeile: null, spalte: null } });
      this.abbrechen();
      this.weiter();
    }, ABFRAGE_GRENZEN.zeitMs);
    this.laufend = { nummer, fertig: w.fertig, zeit };
    const nachricht: AbfrageNachricht = { nummer, auftrag: w.auftrag, dokumente, offen: w.offen };
    worker.postMessage(nachricht);
  }

  private starten(): Worker {
    const worker = neuerWorker();
    worker.onmessage = (e: MessageEvent<AbfrageAntwort>) => {
      const l = this.laufend;
      if (!l || e.data.nummer !== l.nummer) return;
      clearTimeout(l.zeit);
      this.laufend = null;
      l.fertig(e.data.ausgang);
      this.weiter();
    };
    worker.onerror = (e) => {
      const l = this.laufend;
      if (!l) return;
      clearTimeout(l.zeit);
      l.fertig({ ok: false, fehler: { meldung: `Der Abfrage-Worker ist abgestürzt: ${e.message || "ohne Meldung"}`, zeile: null, spalte: null } });
      this.abbrechen();
      this.weiter();
    };
    return worker;
  }

  /** Worker beenden; seine Dokumente sind dann weg und gehen beim nächsten Auftrag wieder mit */
  private abbrechen(): void {
    if (this.laufend) clearTimeout(this.laufend.zeit);
    this.laufend = null;
    this.worker?.terminate();
    this.worker = null;
    this.gesendet.clear();
  }
}
