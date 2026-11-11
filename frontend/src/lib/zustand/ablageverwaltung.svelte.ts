// Verwaltung der Ablage (STB-18): Ordner, Umbenennen, Verschieben, Papierkorb mit Rückgängig, Herunterladen, Sichern und
// Einspielen. Offene Blätter werden mitgeführt (Name, Ordner) oder vor dem Entfernen geschlossen, damit ein späteres
// Speichern nichts zurückschreibt.

import { Ablagefehler, ordnerNameGueltig, type AbgelegtesDokument, type Papierkorbeintrag } from "../dienste/ablage";
import { arbeitsplatz } from "./arbeitsplatz.svelte";
import { meldungen } from "./meldungen.svelte";

// Für die Oberfläche (sie greift nicht direkt auf Dienste zu, Regel A1)
export { PAPIERKORB_TAGE, type Dokumentkopf, type Papierkorbeintrag } from "../dienste/ablage";

/** Inhalt einer Sicherungsdatei aller Dokumente */
export interface Sicherung {
  readonly art: "strukturblick-sicherung";
  readonly fassung: 1;
  readonly erstellt: string;
  readonly ordner: readonly string[];
  readonly dokumente: readonly AbgelegtesDokument[];
}

const neueKennung = (): string => globalThis.crypto.randomUUID();

async function mitMeldung(arbeit: () => Promise<void>): Promise<boolean> {
  try {
    await arbeit();
    return true;
  } catch (f) {
    meldungen.zeigen({ text: f instanceof Ablagefehler ? f.message : `Die Ablage antwortet nicht wie erwartet: ${(f as Error).message}`, art: "fehler" });
    return false;
  }
}

class Ablageverwaltung {
  ordner = $state.raw<string[]>([]);
  papierkorb = $state.raw<Papierkorbeintrag[]>([]);
  /** Gewählter Ordner der Seite Ablage ("" = oberste Ebene, null = Papierkorb) */
  ordnerWahl = $state<string | null>("");

  async neuLaden(): Promise<void> {
    const a = arbeitsplatz.ablage;
    const [ordner, papierkorb] = await Promise.all([a.ordner(), a.papierkorb(), arbeitsplatz.listeNeu()]);
    this.ordner = ordner;
    this.papierkorb = papierkorb;
    if (this.ordnerWahl && !ordner.includes(this.ordnerWahl)) this.ordnerWahl = "";
  }

  oeffnen(): void {
    arbeitsplatz.seite = "ablage";
    void this.neuLaden();
  }

  schliessen(): void {
    arbeitsplatz.seite = "blatt";
  }

  async umbenennen(kennung: string, name: string): Promise<void> {
    const neu = name.trim();
    if (!neu) return;
    const blatt = arbeitsplatz.blaetter.find((b) => b.kennung === kennung);
    if (await mitMeldung(() => arbeitsplatz.ablage.aendern(kennung, { name: neu }))) {
      if (blatt) blatt.name = neu;
      await this.neuLaden();
    }
  }

  async verschieben(kennungen: readonly string[], ordner: string): Promise<void> {
    const ok = await mitMeldung(async () => {
      for (const k of kennungen) await arbeitsplatz.ablage.aendern(k, { ordner });
    });
    for (const b of arbeitsplatz.blaetter) if (kennungen.includes(b.kennung)) b.ordner = ordner;
    if (ok) meldungen.zeigen({ text: `${kennungen.length === 1 ? "1 Dokument" : `${kennungen.length} Dokumente`} nach ${ordner || "Ablage"} verschoben`, art: "erfolg" });
    await this.neuLaden();
  }

  /** In den Papierkorb, mit Rückgängig in der Meldung. Offene Blätter werden vorher gespeichert und geschlossen. */
  async entfernen(kennungen: readonly string[]): Promise<void> {
    for (const b of [...arbeitsplatz.blaetter]) if (kennungen.includes(b.kennung)) await arbeitsplatz.schliessen(b);
    const ok = await mitMeldung(async () => {
      for (const k of kennungen) await arbeitsplatz.ablage.entfernen(k);
    });
    await this.neuLaden();
    if (ok) {
      const text = kennungen.length === 1 ? "1 Dokument liegt im Papierkorb" : `${kennungen.length} Dokumente liegen im Papierkorb`;
      meldungen.zeigen({ text, art: "erfolg", aktion: { titel: "Rückgängig", ausfuehren: () => void this.wiederherstellen(kennungen) } });
    }
  }

  async wiederherstellen(kennungen: readonly string[]): Promise<void> {
    await mitMeldung(async () => {
      for (const k of kennungen) await arbeitsplatz.ablage.wiederherstellen(k);
    });
    await this.neuLaden();
  }

  async endgueltigEntfernen(kennungen: readonly string[]): Promise<void> {
    await mitMeldung(async () => {
      for (const k of kennungen) await arbeitsplatz.ablage.endgueltigEntfernen(k);
    });
    await this.neuLaden();
  }

  async ordnerAnlegen(name: string): Promise<boolean> {
    if (!ordnerNameGueltig(name)) {
      meldungen.zeigen({ text: "Ordnernamen haben 1 bis 80 Zeichen, ohne / und \\", art: "fehler" });
      return false;
    }
    const ok = await mitMeldung(() => arbeitsplatz.ablage.ordnerAnlegen(name.trim()));
    await this.neuLaden();
    if (ok) this.ordnerWahl = name.trim();
    return ok;
  }

  async ordnerUmbenennen(alt: string, neu: string): Promise<void> {
    if (await mitMeldung(() => arbeitsplatz.ablage.ordnerUmbenennen(alt, neu.trim()))) {
      for (const b of arbeitsplatz.blaetter) if (b.ordner === alt) b.ordner = neu.trim();
      this.ordnerWahl = neu.trim();
    }
    await this.neuLaden();
  }

  async ordnerEntfernen(name: string): Promise<void> {
    if (await mitMeldung(() => arbeitsplatz.ablage.ordnerEntfernen(name))) this.ordnerWahl = "";
    await this.neuLaden();
  }

  /** Text eines Dokuments zum Herunterladen (offene Blätter mit ihrem aktuellen Stand) */
  async textVon(kennung: string): Promise<{ name: string; text: string } | null> {
    const blatt = arbeitsplatz.blaetter.find((b) => b.kennung === kennung);
    if (blatt) return { name: blatt.name, text: blatt.text };
    const dok = await arbeitsplatz.ablage.laden(kennung);
    return dok ? { name: dok.name, text: dok.text } : null;
  }

  /** Alle Dokumente samt Verlauf als eine Sicherung */
  async sicherung(): Promise<Sicherung> {
    await arbeitsplatz.allesSpeichern();
    const dokumente: AbgelegtesDokument[] = [];
    for (const kopf of arbeitsplatz.dokumente) {
      const d = await arbeitsplatz.ablage.laden(kopf.kennung);
      if (d) dokumente.push(d);
    }
    return { art: "strukturblick-sicherung", fassung: 1, erstellt: new Date().toISOString(), ordner: this.ordner, dokumente };
  }

  /** Sicherung einspielen: kommt zu den vorhandenen Dokumenten dazu (neue Kennungen), nichts wird überschrieben. */
  async einspielen(inhalt: string): Promise<void> {
    let s: Sicherung;
    try {
      s = JSON.parse(inhalt) as Sicherung;
      if (s.art !== "strukturblick-sicherung" || !Array.isArray(s.dokumente)) throw new Error("keine Sicherung von Strukturblick");
    } catch (f) {
      meldungen.zeigen({ text: `Die Datei ist keine Sicherung von Strukturblick (${(f as Error).message})`, art: "fehler" });
      return;
    }
    const vorhanden = new Set(await arbeitsplatz.ablage.ordner());
    const ok = await mitMeldung(async () => {
      for (const o of s.ordner ?? []) if (!vorhanden.has(o) && ordnerNameGueltig(o)) await arbeitsplatz.ablage.ordnerAnlegen(o);
      for (const d of s.dokumente) await arbeitsplatz.ablage.speichern({ ...d, kennung: neueKennung() });
    });
    await this.neuLaden();
    if (ok) meldungen.zeigen({ text: `${s.dokumente.length} Dokumente aus der Sicherung übernommen`, art: "erfolg" });
  }
}

export const ablageverwaltung = new Ablageverwaltung();
