// Der Arbeitsplatz: die offenen Arbeitsblätter in Reiterfolge, das aktive Blatt und die Liste der abgelegten
// Dokumente. Nur die Schale greift hierauf zu; Ansichten bekommen ihr Blatt als Eigenschaft (Regel A5).

import type { Ablage, Dokumentkopf } from "../dienste/ablage";
import { ablageFuerBauart } from "../dienste/bauart";
import { Arbeitsblatt } from "./arbeitsblatt.svelte";
import { meldungen } from "./meldungen.svelte";

/** Größte Datei, die ohne Rückfrage geöffnet wird (Zeichen); darüber wird gewarnt (Einstellungen folgen in STB-8). */
const WARNUNG_AB_ZEICHEN = 50 * 1024 * 1024;

const neueKennung = (): string => globalThis.crypto.randomUUID();

class Arbeitsplatz {
  blaetter = $state<Arbeitsblatt[]>([]);
  aktivesBlatt = $state<Arbeitsblatt | null>(null);
  dokumente = $state.raw<Dokumentkopf[]>([]);
  bereit = $state(false);

  constructor(readonly ablage: Ablage) {}

  async starten(): Promise<void> {
    const stand = await this.ablage.arbeitsstand();
    for (const kennung of stand.offen) {
      const dok = await this.ablage.laden(kennung);
      if (dok) this.blaetter.push(new Arbeitsblatt(dok, this.ablage));
    }
    this.aktivesBlatt = this.blaetter.find((b) => b.kennung === stand.aktiv) ?? this.blaetter[0] ?? null;
    await this.listeNeu();
    this.bereit = true;
  }

  async listeNeu(): Promise<void> {
    this.dokumente = await this.ablage.liste();
  }

  waehlen(blatt: Arbeitsblatt): void {
    this.aktivesBlatt = blatt;
    void this.standSpeichern();
  }

  /** Neues Dokument aus Text (Einfügen, Leer); öffnet je nach Inhalt im Editor oder in der Struktur. */
  async neu(name: string, text: string): Promise<Arbeitsblatt> {
    const blatt = new Arbeitsblatt(
      { kennung: neueKennung(), name, formatWahl: null, optionen: {}, text, verlauf: { eintraege: [], zeiger: 0 }, geaendert: new Date().toISOString() },
      this.ablage,
    );
    if (text.trim() === "") blatt.zeigen({ art: "ansicht", kennung: "editor" });
    this.blaetter.push(blatt);
    this.aktivesBlatt = blatt;
    await blatt.speichern();
    await this.standSpeichern();
    await this.listeNeu();
    return blatt;
  }

  async dateiOeffnen(datei: File): Promise<void> {
    if (datei.size > WARNUNG_AB_ZEICHEN) meldungen.zeigen({ text: `${datei.name} ist groß (${Math.round(datei.size / 1048576)} MB); das Lesen kann dauern`, art: "hinweis" });
    const text = await datei.text();
    await this.neu(datei.name, text);
  }

  async ausAblageOeffnen(kennung: string): Promise<void> {
    const offen = this.blaetter.find((b) => b.kennung === kennung);
    if (offen) return this.waehlen(offen);
    const dok = await this.ablage.laden(kennung);
    if (!dok) return meldungen.zeigen({ text: "Das Dokument gibt es in der Ablage nicht mehr", art: "fehler" });
    const blatt = new Arbeitsblatt(dok, this.ablage);
    this.blaetter.push(blatt);
    this.aktivesBlatt = blatt;
    await this.standSpeichern();
  }

  /** Schließen speichert immer zuerst; es geht nichts verloren, das Dokument bleibt in der Ablage. */
  async schliessen(blatt: Arbeitsblatt): Promise<void> {
    const i = this.blaetter.indexOf(blatt);
    if (i < 0) return;
    await blatt.schliessen();
    this.blaetter.splice(i, 1);
    if (this.aktivesBlatt === blatt) this.aktivesBlatt = this.blaetter[Math.min(i, this.blaetter.length - 1)] ?? null;
    await this.standSpeichern();
    await this.listeNeu();
  }

  async umbenennen(blatt: Arbeitsblatt, name: string): Promise<void> {
    const neu = name.trim();
    if (!neu || neu === blatt.name) return;
    blatt.name = neu;
    await blatt.speichern();
    await this.listeNeu();
  }

  async standSpeichern(): Promise<void> {
    await this.ablage.arbeitsstandSpeichern({ offen: this.blaetter.map((b) => b.kennung), aktiv: this.aktivesBlatt?.kennung ?? null });
  }

  /** Vor dem Verlassen der Seite: alles Ungespeicherte sofort ablegen. */
  async allesSpeichern(): Promise<void> {
    await Promise.all(this.blaetter.filter((b) => !b.gespeichert).map((b) => b.speichern()));
  }
}

export const arbeitsplatz = new Arbeitsplatz(ablageFuerBauart());
