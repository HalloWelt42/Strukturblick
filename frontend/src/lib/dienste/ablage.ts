// Schnittstelle der Ablage (Leitgedanke 8): Bauart ohne Server speichert im Browser (IndexedDB), Bauart mit Server auf
// pi5b. Der Zustand kennt nur diese Schnittstelle. Ordner sind eine Ebene tief (Name, "" ist die oberste Ebene).
// Entfernen legt in den Papierkorb; nach PAPIERKORB_TAGE Tagen löscht die Ablage dort endgültig.

import type { FormatKennung, Leseoptionen } from "../kern/format";
import type { Verlauf } from "../kern/verlauf";
import { rezeptLesen, type Rezept } from "../analyse/rezepte/rezept";

export const PAPIERKORB_TAGE = 30;

export interface AbgelegtesDokument {
  readonly kennung: string;                 // UUID
  readonly name: string;                    // Dateiname
  readonly ordner?: string;                 // "" oder fehlend: oberste Ebene
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
  readonly ordner: string;
  readonly groesse: number;
  readonly geaendert: string;
}

export interface Papierkorbeintrag extends Dokumentkopf {
  readonly geloescht: string;               // ISO-Zeit des Entfernens
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
  /** Name und Ordner ändern, ohne den Inhalt zu übertragen */
  aendern(kennung: string, teil: { readonly name?: string; readonly ordner?: string }): Promise<void>;
  /** In den Papierkorb */
  entfernen(kennung: string): Promise<void>;
  papierkorb(): Promise<Papierkorbeintrag[]>;
  wiederherstellen(kennung: string): Promise<void>;
  endgueltigEntfernen(kennung: string): Promise<void>;
  ordner(): Promise<string[]>;
  ordnerAnlegen(name: string): Promise<void>;
  /** Benennt den Ordner um und zieht seine Dokumente mit */
  ordnerUmbenennen(alt: string, neu: string): Promise<void>;
  /** Nur leere Ordner lassen sich entfernen */
  ordnerEntfernen(name: string): Promise<void>;
  arbeitsstand(): Promise<Arbeitsstand>;
  arbeitsstandSpeichern(stand: Arbeitsstand): Promise<void>;
  /** Rezepte (STB-7) des Kontos, zuletzt geänderte zuerst; nicht lesbare bleiben weg */
  rezepte(): Promise<Rezept[]>;
  rezeptSpeichern(rezept: Rezept): Promise<void>;
  /** Endgültig (Rezepte lassen sich vorher herunterladen) */
  rezeptEntfernen(kennung: string): Promise<void>;
}

/** Gespeicherte Rezepte prüfen und ordnen: nur gültige, zuletzt geänderte zuerst */
export const rezepteOrdnen = (roh: readonly unknown[]): Rezept[] =>
  roh.flatMap((r) => {
    const g = rezeptLesen(r);
    return g.ok ? [g.rezept] : [];
  }).sort((a, b) => b.geaendert.localeCompare(a.geaendert));

/** Fachlicher Fehler der Ablage (Ordner nicht leer, Name doppelt); der Zustand meldet ihn. */
export class Ablagefehler extends Error {}

export const ordnerNameGueltig = (name: string): boolean => name.trim().length > 0 && name.trim().length <= 80 && !/[/\\]/.test(name);

export const abgelaufen = (geloescht: string, jetzt = Date.now()): boolean =>
  jetzt - Date.parse(geloescht) > PAPIERKORB_TAGE * 24 * 3600 * 1000;
