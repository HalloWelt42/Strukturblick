// Der Arbeitsplatz: die offenen Arbeitsblätter in Reiterfolge, das aktive Blatt und die Liste der abgelegten
// Dokumente. Nur die Schale greift hierauf zu; Ansichten bekommen ihr Blatt als Eigenschaft (Regel A5).

import type { Ablage, Dokumentkopf } from "../dienste/ablage";
import { Arbeitsblatt } from "./arbeitsblatt.svelte";
import { meldungen } from "./meldungen.svelte";
import { textAusBytes } from "../formate/kodierung";
import { einleserFuer } from "../formate/einlesen/registrierung";
import { EinlesenFehler, type Einleser } from "../formate/einlesen/tabellen";

/** Größte Datei, die ohne Rückfrage geöffnet wird (Zeichen); darüber wird gewarnt (Einstellungen folgen in STB-8). */
const WARNUNG_AB_ZEICHEN = 50 * 1024 * 1024;

const neueKennung = (): string => globalThis.crypto.randomUUID();

class Arbeitsplatz {
  blaetter = $state<Arbeitsblatt[]>([]);
  aktivesBlatt = $state<Arbeitsblatt | null>(null);
  dokumente = $state.raw<Dokumentkopf[]>([]);
  bereit = $state(false);
  /** Was der Hauptbereich zeigt: das aktive Blatt oder die Ablage (genau eins) */
  seite = $state<"blatt" | "ablage">("blatt");

  /** Fortschritt des Starts für die Startanzeige: Schritt, Anteil (0 bis 1, null: unbestimmt), ein Hinweis, worauf
   *  gewartet wird, und ob der Start gescheitert ist (dann bietet die Anzeige "Neu versuchen") */
  start = $state<{ schritt: string; anteil: number | null; hinweis: string | null; fehler?: boolean }>({ schritt: "Ablage öffnen", anteil: null, hinweis: null });

  private ablageStand: Ablage | null = null;

  /** Wo die Dokumente liegen; steht ab `starten` fest (Bauart, nach der Anmeldung). */
  get ablage(): Ablage {
    if (!this.ablageStand) throw new Error("Der Arbeitsplatz ist noch nicht gestartet");
    return this.ablageStand;
  }

  /** Startet mit einer Ablage; ein erneuter Start ersetzt die offenen Blätter, statt sie zu verdoppeln. Ein Dokument,
   *  das sich nicht laden lässt, wird gemeldet und übersprungen; der Start geht weiter. */
  async starten(ablage: Ablage): Promise<void> {
    for (const b of this.blaetter) await b.schliessen();
    this.ablageStand = ablage;
    this.start = { schritt: "Ablage öffnen", anteil: null, hinweis: null };
    const stand = await this.ablage.arbeitsstand();
    const blaetter: Arbeitsblatt[] = [];
    for (const [i, kennung] of stand.offen.entries()) {
      this.start = { ...this.start, schritt: `Dokument ${i + 1} von ${stand.offen.length} laden`, anteil: i / stand.offen.length };
      try {
        const dok = await this.ablage.laden(kennung);
        if (dok) blaetter.push(new Arbeitsblatt(dok, this.ablage));
      } catch (f) {
        meldungen.zeigen({ text: `Ein Dokument ließ sich nicht laden und bleibt zu (${(f as Error).message})`, art: "fehler" });
      }
    }
    this.start = { ...this.start, schritt: "Liste der Dokumente lesen", anteil: 1 };
    this.blaetter = blaetter;
    this.aktivesBlatt = this.blaetter.find((b) => b.kennung === stand.aktiv) ?? this.blaetter[0] ?? null;
    await this.listeNeu();
    this.bereit = true;
  }

  async listeNeu(): Promise<void> {
    this.dokumente = await this.ablage.liste();
  }

  waehlen(blatt: Arbeitsblatt): void {
    this.aktivesBlatt = blatt;
    this.seite = "blatt";
    void this.standSpeichern();
  }

  /** Neues Dokument aus Text (Einfügen, Leer); öffnet je nach Inhalt im Editor oder in der Struktur. */
  async neu(name: string, text: string, ordner = ""): Promise<Arbeitsblatt> {
    const blatt = new Arbeitsblatt(
      { kennung: neueKennung(), name, ordner, formatWahl: null, optionen: {}, text, verlauf: { eintraege: [], zeiger: 0 }, geaendert: new Date().toISOString() },
      this.ablage,
    );
    if (text.trim() === "") blatt.zeigen({ art: "ansicht", kennung: "editor" });
    this.blaetter.push(blatt);
    this.aktivesBlatt = blatt;
    this.seite = "blatt";
    await blatt.speichern();
    await this.standSpeichern();
    await this.listeNeu();
    return blatt;
  }

  /** Leeres Dokument "unbenannt", bei mehreren durchgezählt; öffnet im Editor */
  async leeresDokument(ordner = ""): Promise<Arbeitsblatt> {
    const zahl = this.blaetter.filter((b) => b.name.startsWith("unbenannt")).length + 1;
    return this.neu(zahl === 1 ? "unbenannt" : `unbenannt ${zahl}`, "", ordner);
  }

  async dateiOeffnen(datei: File, ordner = ""): Promise<void> {
    if (datei.size > WARNUNG_AB_ZEICHEN) meldungen.zeigen({ text: `${datei.name} ist groß (${Math.round(datei.size / 1048576)} MB); das Lesen kann dauern`, art: "hinweis" });
    const bytes = new Uint8Array(await datei.arrayBuffer());
    const einleser = einleserFuer(datei.name);
    if (einleser) return this.einlesen(einleser, datei.name, bytes, ordner);
    const gelesen = textAusBytes(bytes);
    await this.neu(datei.name, gelesen.text, ordner);
    if (gelesen.grund === "angabe" && gelesen.kodierung !== "UTF-8") meldungen.zeigen({ text: `${datei.name} ist in ${gelesen.kodierung} gespeichert und so gelesen; Herunterladen schreibt UTF-8`, art: "hinweis" });
    if (gelesen.grund === "ersatz") meldungen.zeigen({ text: `${datei.name} ist kein gültiges UTF-8 und wurde als Windows-1252 gelesen; Umlaute bitte prüfen`, art: "hinweis" });
  }

  /** Datei, die nicht als Text bearbeitet wird (Tabellendatei, HTML-Seite), als JSON-Dokument; die Datei bleibt, wie sie ist */
  private async einlesen(einleser: Einleser, name: string, bytes: Uint8Array, ordner: string): Promise<void> {
    try {
      const d = einleser.einlesen(bytes, name);
      await this.neu(d.name, d.text, ordner);
      meldungen.zeigen({ text: d.meldung, art: "hinweis" });
    } catch (e) {
      if (!(e instanceof EinlesenFehler)) throw e;
      meldungen.zeigen({ text: `${name}: ${e.message}`, art: "fehler" });
    }
  }

  async ausAblageOeffnen(kennung: string): Promise<void> {
    const offen = this.blaetter.find((b) => b.kennung === kennung);
    if (offen) return this.waehlen(offen);
    this.seite = "blatt";
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

export const arbeitsplatz = new Arbeitsplatz();
