// Nachrichten zwischen Abfragedienst und Abfrage-Worker. Dokumente gehen nur mit, wenn der Worker ihre Revision noch
// nicht hat (der Dienst weiß, was er geschickt hat); sonst nur Kennung und Revision.

import type { Abfrageausgang } from "../../kern/abfrage";
import type { Abfrageauftrag } from "./maschine";
import type { Dokumentstand } from "./quellen";

export interface Dokumentverweis {
  readonly kennung: string;
  readonly revision: number;
}

export interface AbfrageNachricht {
  readonly nummer: number;
  readonly auftrag: Abfrageauftrag;
  /** Die Dokumente dieses Auftrags (für SQL alle offenen, sonst das eine) */
  readonly dokumente: readonly (Dokumentstand | Dokumentverweis)[];
  /** Kennungen aller offenen Dokumente; der Worker vergisst die übrigen */
  readonly offen: readonly string[];
}

export interface AbfrageAntwort {
  readonly nummer: number;
  readonly ausgang: Abfrageausgang;
}

export const istStand = (d: Dokumentstand | Dokumentverweis): d is Dokumentstand => "text" in d;
