// Zugang zur App je Bauart: ohne Server geht es sofort los; mit Server erst Anmeldung (Kellerwolke-Konto) oder erste
// Einrichtung, dann Start des Arbeitsplatzes mit der Ablage auf dem Server. Dazu der Abgleich der Fassung: eine neue
// Fassung lädt von selbst, aber nie, solange etwas noch nicht abgelegt ist.

import { BAUART, FASSUNG, ablageFuerBauart, serverteil, type Serverteil } from "../dienste/bauart";
import { arbeitsplatz } from "./arbeitsplatz.svelte";
import { ablageverwaltung } from "./ablageverwaltung.svelte";

export type Zugangsstand = "laedt" | "nicht-erreichbar" | "einrichtung" | "anmeldung" | "bereit";

class Zugang {
  /** Die Anbindung an den Server; null ohne Server */
  teil = $state.raw<Serverteil | null>(null);
  private gestartet = false;

  readonly stand: Zugangsstand = $derived.by((): Zugangsstand => {
    if (BAUART === "eigenstaendig") return "bereit";
    const s = this.teil?.sitzung;
    if (!s || !s.geladen) return "laedt";
    if (!s.app) return "nicht-erreichbar";
    if (s.app.einrichtung_noetig) return "einrichtung";
    if (!s.angemeldet) return "anmeldung";
    return "bereit";
  });

  /** Name des angemeldeten Kontos, sonst null */
  readonly konto = $derived(this.teil?.sitzung.konto?.name ?? null);

  async starten(): Promise<void> {
    this.teil = await serverteil();
    if (this.teil) {
      this.teil.fassungVerfolgen(FASSUNG, () => arbeitsplatz.blaetter.every((b) => b.gespeichert));
      await this.teil.sitzungStarten();
    }
  }

  /** Startet den Arbeitsplatz einmal, sobald der Zugang bereit ist (vom Einstieg aus einem Effekt gerufen). */
  async arbeitsplatzStarten(): Promise<void> {
    if (this.gestartet || this.stand !== "bereit") return;
    this.gestartet = true;
    await arbeitsplatz.starten(await ablageFuerBauart());
    await ablageverwaltung.neuLaden();
  }

  async abmelden(): Promise<void> {
    await arbeitsplatz.allesSpeichern();
    await this.teil?.abmelden();
    location.reload();
  }
}

export const zugang = new Zugang();
