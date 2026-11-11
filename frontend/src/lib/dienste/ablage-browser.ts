// Ablage im Browser (IndexedDB). Liegt nur in diesem Browser; gesichert wird per Herunterladen.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Ablage, AbgelegtesDokument, Arbeitsstand, Dokumentkopf } from "./ablage";

interface Schema extends DBSchema {
  dokumente: { key: string; value: AbgelegtesDokument };
  stand: { key: string; value: Arbeitsstand };
}

const DATENBANK = "strukturblick-2";

export class BrowserAblage implements Ablage {
  readonly ort = "Dieser Browser";
  readonly hinweis = "Liegt nur in diesem Browser; sichern per Herunterladen.";
  private db: Promise<IDBPDatabase<Schema>> | null = null;

  private oeffnen(): Promise<IDBPDatabase<Schema>> {
    return (this.db ??= openDB<Schema>(DATENBANK, 1, {
      upgrade(db) {
        db.createObjectStore("dokumente", { keyPath: "kennung" });
        db.createObjectStore("stand");
      },
    }));
  }

  async liste(): Promise<Dokumentkopf[]> {
    const alle = await (await this.oeffnen()).getAll("dokumente");
    return alle
      .map((d) => ({ kennung: d.kennung, name: d.name, groesse: d.text.length, geaendert: d.geaendert }))
      .sort((a, b) => b.geaendert.localeCompare(a.geaendert));
  }

  async laden(kennung: string): Promise<AbgelegtesDokument | null> {
    return (await (await this.oeffnen()).get("dokumente", kennung)) ?? null;
  }

  async speichern(dok: AbgelegtesDokument): Promise<void> {
    await (await this.oeffnen()).put("dokumente", dok);
  }

  async entfernen(kennung: string): Promise<void> {
    await (await this.oeffnen()).delete("dokumente", kennung);
  }

  async arbeitsstand(): Promise<Arbeitsstand> {
    return (await (await this.oeffnen()).get("stand", "arbeitsplatz")) ?? { offen: [], aktiv: null };
  }

  async arbeitsstandSpeichern(stand: Arbeitsstand): Promise<void> {
    await (await this.oeffnen()).put("stand", stand, "arbeitsplatz");
  }
}
