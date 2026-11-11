// Zugang zur App je Bauart: ohne Server geht es sofort los; mit Server erst Anmeldung (Kellerwolke-Konto) oder erste
// Einrichtung, dann Start des Arbeitsplatzes mit der Ablage auf dem Server. Dazu der Abgleich der Fassung: eine neue
// Fassung lädt von selbst, aber nie, solange etwas noch nicht abgelegt ist.

import { BAUART, FASSUNG, ablageFuerBauart, ausweichAblage, fassungOhneServerVerfolgen, serverteil, type Serverteil } from "../dienste/bauart";
import { arbeitsplatz } from "./arbeitsplatz.svelte";
import { ablageverwaltung } from "./ablageverwaltung.svelte";
import { meldungen } from "./meldungen.svelte";

const WARTET_AUF_ALTEN_TAB =
  "Strukturblick ist in einem anderen Tab dieses Browsers noch mit einer älteren Fassung offen. Bitte jenen Tab schließen oder neu laden; danach geht es hier von selbst weiter.";

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
    const ruhig = () => arbeitsplatz.blaetter.every((b) => b.gespeichert);
    if (this.teil) {
      this.teil.fassungVerfolgen(FASSUNG, ruhig);
      await this.teil.sitzungStarten();
    } else fassungOhneServerVerfolgen(FASSUNG, ruhig);
  }

  /** Startet den Arbeitsplatz einmal, sobald der Zugang bereit ist (vom Einstieg aus einem Effekt gerufen). Tolerant:
   *  hält ein älterer Tab die Ablage, sagt der Start, worauf er wartet, und geht danach von selbst weiter; braucht ein
   *  neuerer Tab sie, legt dieser hier alles ab und lädt neu; geht die Ablage gar nicht, startet er im Arbeitsspeicher. */
  async arbeitsplatzStarten(): Promise<void> {
    if (this.gestartet || this.stand !== "bereit") return;
    this.gestartet = true;
    const ablage = await ablageFuerBauart({
      wartet: () => (arbeitsplatz.start = { ...arbeitsplatz.start, hinweis: WARTET_AUF_ALTEN_TAB }),
      frei: () => (arbeitsplatz.start = { ...arbeitsplatz.start, hinweis: null }),
      abgeloest: () => void arbeitsplatz.allesSpeichern().finally(() => location.reload()),
    });
    try {
      await arbeitsplatz.starten(ablage);
    } catch (f) {
      // Mit Server wäre der Arbeitsspeicher irreführend (man hielte die Dokumente für abgelegt): Fehler zeigen, neu versuchen
      if (BAUART === "server") {
        arbeitsplatz.start = { ...arbeitsplatz.start, hinweis: `Die Ablage antwortet nicht (${(f as Error).message}).`, fehler: true };
        this.gestartet = false;
        return;
      }
      await arbeitsplatz.starten(ausweichAblage());
      meldungen.zeigen({ text: `Dieser Browser lässt hier kein Speichern zu (${(f as Error).message}). Die Dokumente bleiben nur, solange das Fenster offen ist; sichern per Herunterladen.`, art: "fehler" });
    }
    await ablageverwaltung.neuLaden();
  }

  async abmelden(): Promise<void> {
    await arbeitsplatz.allesSpeichern();
    await this.teil?.abmelden();
    location.reload();
  }
}

export const zugang = new Zugang();
