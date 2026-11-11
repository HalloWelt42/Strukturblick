// Ablage im Browser (IndexedDB). Liegt nur in diesem Browser; gesichert wird per Herunterladen.
// Datenbankstufe 2 (STB-18): Ordner und Papierkorb; Dokumente der Stufe 1 bleiben, ohne Ordner und nicht entfernt.
// Datenbankstufe 3 (STB-7): Rezepte.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Rezept } from "../analyse/rezepte/rezept";
import { abgelaufen, Ablagefehler, ordnerNameGueltig, rezepteOrdnen, type Ablage, type AbgelegtesDokument, type Arbeitsstand, type Dokumentkopf, type Papierkorbeintrag } from "./ablage";

/** So liegt ein Dokument in der Datenbank: das Dokument, dazu wann es entfernt wurde ("" = nicht entfernt). */
type Gespeichert = AbgelegtesDokument & { readonly geloescht?: string };

interface Schema extends DBSchema {
  dokumente: { key: string; value: Gespeichert };
  stand: { key: string; value: Arbeitsstand };
  ordner: { key: string; value: { name: string } };
  rezepte: { key: string; value: Rezept };
}

const DATENBANK = "strukturblick-2";
const STUFE = 3;

/** Was beim Öffnen der Datenbank geschieht, für die Anzeige im Zustand */
export interface Ablageereignisse {
  /** Ein anderer Tab mit älterer Fassung hält die Datenbank; der Umstieg wartet, bis er geschlossen ist */
  wartet?(): void;
  /** Der Umstieg ist gelungen (der ältere Tab wurde geschlossen) */
  frei?(): void;
  /** Ein anderer Tab mit neuerer Fassung braucht die Datenbank: alles ablegen und neu laden */
  abgeloest?(): void;
}

const kopf = (d: Gespeichert): Dokumentkopf => ({ kennung: d.kennung, name: d.name, ordner: d.ordner ?? "", groesse: d.text.length, geaendert: d.geaendert });

export class BrowserAblage implements Ablage {
  readonly ort = "Dieser Browser";
  readonly hinweis = "Liegt nur in diesem Browser; sichern per Herunterladen.";
  private db: Promise<IDBPDatabase<Schema>> | null = null;

  constructor(private readonly ereignisse: Ablageereignisse = {}) {}

  private oeffnen(): Promise<IDBPDatabase<Schema>> {
    if (this.db) return this.db;
    let gewartet = false;
    const e = this.ereignisse;
    const db = openDB<Schema>(DATENBANK, STUFE, {
      upgrade(d, alt) {
        if (alt < 1) {
          d.createObjectStore("dokumente", { keyPath: "kennung" });
          d.createObjectStore("stand");
        }
        if (alt < 2) d.createObjectStore("ordner", { keyPath: "name" });
        if (alt < 3) d.createObjectStore("rezepte", { keyPath: "kennung" });
      },
      // Ältere Fassungen reagieren nicht auf einen Umstieg: dann warten, bis ihr Tab zu ist, und es sagen
      blocked: () => {
        gewartet = true;
        e.wartet?.();
      },
      // Eine neuere Fassung will umsteigen: Platz machen, statt sie warten zu lassen
      blocking: () => e.abgeloest?.(),
      // Der Browser hat die Verbindung geschlossen (Speicher geräumt): beim nächsten Zugriff neu öffnen
      terminated: () => {
        this.db = null;
      },
    }).then((d) => {
      if (gewartet) e.frei?.();
      return d;
    });
    // Schlägt das Öffnen fehl, beim nächsten Zugriff neu versuchen, statt den Fehler zu behalten
    db.catch(() => {
      if (this.db === db) this.db = null;
    });
    this.db = db;
    return db;
  }

  /** Verbindung schließen (vor dem Neuladen, damit eine neuere Fassung umsteigen kann) */
  async schliessen(): Promise<void> {
    const db = this.db;
    this.db = null;
    (await db?.catch(() => null))?.close();
  }

  private async alle(): Promise<Gespeichert[]> {
    return (await this.oeffnen()).getAll("dokumente");
  }

  private async aendernRoh(kennung: string, aendern: (d: Gespeichert) => Gespeichert): Promise<void> {
    const db = await this.oeffnen();
    const d = await db.get("dokumente", kennung);
    if (!d) throw new Ablagefehler("Das Dokument gibt es in der Ablage nicht");
    await db.put("dokumente", aendern(d));
  }

  async liste(): Promise<Dokumentkopf[]> {
    return (await this.alle()).filter((d) => !d.geloescht).map(kopf).sort((a, b) => b.geaendert.localeCompare(a.geaendert));
  }

  async laden(kennung: string): Promise<AbgelegtesDokument | null> {
    const d = await (await this.oeffnen()).get("dokumente", kennung);
    return d && !d.geloescht ? d : null;
  }

  async speichern(dok: AbgelegtesDokument): Promise<void> {
    await (await this.oeffnen()).put("dokumente", { ...dok, geloescht: "" });
  }

  async aendern(kennung: string, teil: { name?: string; ordner?: string }): Promise<void> {
    await this.aendernRoh(kennung, (d) => ({ ...d, ...(teil.name !== undefined ? { name: teil.name } : {}), ...(teil.ordner !== undefined ? { ordner: teil.ordner } : {}) }));
  }

  async entfernen(kennung: string): Promise<void> {
    await this.aendernRoh(kennung, (d) => ({ ...d, geloescht: new Date().toISOString() }));
  }

  async papierkorb(): Promise<Papierkorbeintrag[]> {
    const db = await this.oeffnen();
    const weg = (await this.alle()).filter((d) => d.geloescht);
    for (const d of weg.filter((d) => abgelaufen(d.geloescht!))) await db.delete("dokumente", d.kennung);
    return weg.filter((d) => !abgelaufen(d.geloescht!)).map((d) => ({ ...kopf(d), geloescht: d.geloescht! })).sort((a, b) => b.geloescht.localeCompare(a.geloescht));
  }

  async wiederherstellen(kennung: string): Promise<void> {
    await this.aendernRoh(kennung, (d) => ({ ...d, geloescht: "" }));
  }

  async endgueltigEntfernen(kennung: string): Promise<void> {
    await (await this.oeffnen()).delete("dokumente", kennung);
  }

  async ordner(): Promise<string[]> {
    const db = await this.oeffnen();
    const namen = new Set((await db.getAll("ordner")).map((o) => o.name));
    for (const d of await this.alle()) if (d.ordner) namen.add(d.ordner);
    return [...namen].sort((a, b) => a.localeCompare(b, "de"));
  }

  async ordnerAnlegen(name: string): Promise<void> {
    if (!ordnerNameGueltig(name)) throw new Ablagefehler("Ordnernamen haben 1 bis 80 Zeichen, ohne / und \\");
    if ((await this.ordner()).includes(name.trim())) throw new Ablagefehler(`Den Ordner ${name.trim()} gibt es schon`);
    await (await this.oeffnen()).put("ordner", { name: name.trim() });
  }

  async ordnerUmbenennen(alt: string, neu: string): Promise<void> {
    if (!ordnerNameGueltig(neu)) throw new Ablagefehler("Ordnernamen haben 1 bis 80 Zeichen, ohne / und \\");
    if ((await this.ordner()).includes(neu.trim())) throw new Ablagefehler(`Den Ordner ${neu.trim()} gibt es schon`);
    const db = await this.oeffnen();
    for (const d of await this.alle()) if (d.ordner === alt) await db.put("dokumente", { ...d, ordner: neu.trim() });
    await db.delete("ordner", alt);
    await db.put("ordner", { name: neu.trim() });
  }

  async ordnerEntfernen(name: string): Promise<void> {
    if ((await this.alle()).some((d) => d.ordner === name && !d.geloescht)) throw new Ablagefehler(`Im Ordner ${name} liegen noch Dokumente`);
    const db = await this.oeffnen();
    for (const d of await this.alle()) if (d.ordner === name) await db.put("dokumente", { ...d, ordner: "" });
    await db.delete("ordner", name);
  }

  async arbeitsstand(): Promise<Arbeitsstand> {
    return (await (await this.oeffnen()).get("stand", "arbeitsplatz")) ?? { offen: [], aktiv: null };
  }

  async arbeitsstandSpeichern(stand: Arbeitsstand): Promise<void> {
    await (await this.oeffnen()).put("stand", stand, "arbeitsplatz");
  }

  async rezepte(): Promise<Rezept[]> {
    return rezepteOrdnen(await (await this.oeffnen()).getAll("rezepte"));
  }

  async rezeptSpeichern(r: Rezept): Promise<void> {
    await (await this.oeffnen()).put("rezepte", r);
  }

  async rezeptEntfernen(kennung: string): Promise<void> {
    await (await this.oeffnen()).delete("rezepte", kennung);
  }
}
