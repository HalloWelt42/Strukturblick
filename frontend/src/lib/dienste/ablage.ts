// Schnittstelle der Ablage (Leitgedanke 8): Bauart ohne Server speichert im Browser (IndexedDB), Bauart mit Server
// später auf pi5b. Der Zustand kennt nur diese Schnittstelle.

import type { FormatKennung, Leseoptionen } from "../kern/format";
import type { Verlauf } from "../kern/verlauf";

export interface AbgelegtesDokument {
  readonly kennung: string;                 // UUID
  readonly name: string;                    // Dateiname
  readonly formatWahl: FormatKennung | null;
  readonly optionen: Leseoptionen;
  readonly text: string;
  readonly verlauf: Verlauf;
  /** Zuletzt offene Ansicht oder offenes Werkzeug */
  readonly platz?: { readonly art: "ansicht" | "werkzeug"; readonly kennung: string };
  readonly geaendert: string;               // ISO-Zeit
}

export interface Dokumentkopf {
  readonly kennung: string;
  readonly name: string;
  readonly groesse: number;
  readonly geaendert: string;
}

export interface Arbeitsstand {
  readonly offen: readonly string[];        // Kennungen der offenen Dokumente in Reiterfolge
  readonly aktiv: string | null;
}

export interface Ablage {
  /** Für Menschen: wo die Dokumente liegen ("Dieser Browser", "Ablage auf pi5b") */
  readonly ort: string;
  /** Ein Satz für Menschen, wie sicher die Dokumente dort liegen */
  readonly hinweis: string;
  liste(): Promise<Dokumentkopf[]>;
  laden(kennung: string): Promise<AbgelegtesDokument | null>;
  speichern(dok: AbgelegtesDokument): Promise<void>;
  entfernen(kennung: string): Promise<void>;
  arbeitsstand(): Promise<Arbeitsstand>;
  arbeitsstandSpeichern(stand: Arbeitsstand): Promise<void>;
}
