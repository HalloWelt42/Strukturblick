// Ein Arbeitsblatt je offenem Dokument (Leitgedanke 4): Sitzung, Analyse zur Revision, Gewähltes, offener Platz
// (genau eine Ansicht oder ein Werkzeug) und die Zustände der Ansichten. Ansichten bekommen das Blatt als Eigenschaft.

import { Sitzung, type Analyse, type Ereignis, type Ergebnis, type Aufrufangaben } from "../kern";
import type { FormatKennung, Leseoptionen } from "../kern/format";
import type { Verlauf } from "../kern/verlauf";
import { Lesedienst } from "../dienste/lesedienst";
import type { Ablage, AbgelegtesDokument } from "../dienste/ablage";
import { meldungen } from "./meldungen.svelte";

export type Platz = { readonly art: "ansicht" | "werkzeug"; readonly kennung: string };

/** Wartezeit nach einer Änderung, bevor neu gelesen wird (Tippen); Befehle, die Positionen brauchen, warten nicht. */
const LESEN_NACH_MS = 150;
const SPEICHERN_NACH_MS = 800;

export class Arbeitsblatt {
  readonly kennung: string;
  readonly sitzung: Sitzung;
  name = $state("");
  /** Ordner in der Ablage ("" = oberste Ebene) */
  ordner = $state("");
  formatWahl = $state<FormatKennung | null>(null);
  optionen = $state<Leseoptionen>({});
  text = $state.raw("");
  revision = $state(0);
  verlauf = $state.raw<Verlauf>({ eintraege: [], zeiger: 0 });
  /** Zuletzt gelesene Analyse; kann eine ältere Revision sein, solange gelesen wird (siehe `aktuell`). */
  analyse = $state.raw<Analyse | null>(null);
  /** Der Text, aus dem `analyse` gelesen wurde (gehört immer zu ihr; Positionen beziehen sich darauf). */
  analyseText = $state.raw("");
  lesefehler = $state<string | null>(null);
  liest = $state(false);
  gespeichert = $state(true);
  platz = $state<Platz>({ art: "ansicht", kennung: "baum" });
  /** Ansicht vor dem Öffnen eines Werkzeugs (dahin führt Schließen zurück) */
  ansichtVorher = $state("tabelle");
  /** Gewählte Stelle als JSON Pointer, null wenn nichts gewählt */
  gewaehlt = $state<string | null>(null);

  /** Leseweise geändert, neue Analyse steht noch aus: die alte gilt dann nicht mehr als aktuell */
  private leseweiseNeu = $state(false);
  readonly aktuell = $derived(this.analyse !== null && this.analyse.revision === this.revision && !this.leseweiseNeu);
  readonly kannZurueck = $derived(this.verlauf.zeiger > 0);
  readonly kannVor = $derived(this.verlauf.zeiger < this.verlauf.eintraege.length);

  private readonly lesedienst = new Lesedienst();
  private readonly zustaende = new Map<string, unknown>();
  private lesenZeit: ReturnType<typeof setTimeout> | null = null;
  private speichernZeit: ReturnType<typeof setTimeout> | null = null;
  private wartende: ((a: Analyse | null) => void)[] = [];

  constructor(dok: AbgelegtesDokument, private readonly ablage: Ablage) {
    this.kennung = dok.kennung;
    this.name = dok.name;
    this.ordner = dok.ordner ?? "";
    this.formatWahl = dok.formatWahl;
    this.optionen = dok.optionen;
    if (dok.platz) this.platz = dok.platz;
    this.sitzung = new Sitzung(dok.text);
    this.sitzung.verlaufUebernehmen(dok.verlauf);
    this.sitzung.analyseVon(() => this.analyse);
    this.text = dok.text;
    this.verlauf = this.sitzung.verlauf;
    this.sitzung.beobachten((e) => this.nachAenderung(e));
    void this.lesenJetzt();
  }

  /** Zustand einer Ansicht für dieses Blatt (Filter, Sortierung, Aufgeklapptes); entsteht beim ersten Zugriff. */
  zustandFuer<T>(ansicht: string, anlegen: () => T): T {
    if (!this.zustaende.has(ansicht)) this.zustaende.set(ansicht, anlegen());
    return this.zustaende.get(ansicht) as T;
  }

  /** Änderungen nur hierüber. Braucht der Befehl Positionen, wartet er auf die Analyse der aktuellen Revision. */
  async ausfuehren(befehl: string, werte: unknown, angaben: Aufrufangaben): Promise<Ergebnis> {
    if (this.sitzung.befehl(befehl)?.brauchtAnalyse && !this.aktuell) await this.analyseAbwarten();
    const e = this.sitzung.ausfuehren(befehl, werte, angaben);
    if (!e.ok) meldungen.zeigen({ text: e.fehler, art: "fehler" });
    return e;
  }

  /** Wie ausfuehren, aber mit Meldung und Rückgängig-Knopf (Änderungen aus Baum, Tabelle, Inspektor). */
  async ausfuehrenMitMeldung(befehl: string, werte: unknown, angaben: Aufrufangaben): Promise<Ergebnis> {
    const e = await this.ausfuehren(befehl, werte, angaben);
    if (e.ok && e.geaendert) meldungen.zeigen({ text: e.titel, art: "erfolg", aktion: { titel: "Rückgängig", ausfuehren: () => this.rueckgaengig() } });
    return e;
  }

  rueckgaengig(): void { this.sitzung.rueckgaengig(); }
  wiederholen(): void { this.sitzung.wiederholen(); }
  springen(zeiger: number): void { this.sitzung.springen(zeiger); }

  /** Format oder Leseweise ändern (CSV-Trennzeichen ...); gilt für dieses Blatt und wird mitgespeichert. */
  leseweise(formatWahl: FormatKennung | null, optionen: Leseoptionen = {}): void {
    this.formatWahl = formatWahl;
    this.optionen = optionen;
    this.leseweiseNeu = true;
    void this.lesenJetzt();
    this.speichernPlanen();
  }

  waehlen(zeiger: string | null): void { this.gewaehlt = zeiger; }
  zeigen(platz: Platz): void {
    if (platz.art === this.platz.art && platz.kennung === this.platz.kennung) return;
    if (this.platz.art === "ansicht") this.ansichtVorher = this.platz.kennung;
    this.platz = platz;
    this.speichernPlanen();
  }

  /** Offenes Werkzeug schließen: zurück zur Ansicht davor */
  werkzeugSchliessen(): void {
    if (this.platz.art === "werkzeug") this.zeigen({ art: "ansicht", kennung: this.ansichtVorher });
  }

  /** Beobachter für Textänderungen (Editor übernimmt sie, statt den ganzen Text neu zu setzen) */
  beobachten(f: (e: Ereignis) => void): () => void { return this.sitzung.beobachten(f); }

  analyseAbwarten(): Promise<Analyse | null> {
    if (this.aktuell) return Promise.resolve(this.analyse);
    if (this.lesenZeit) { clearTimeout(this.lesenZeit); this.lesenZeit = null; void this.lesenJetzt(); }
    return new Promise((fertig) => this.wartende.push(fertig));
  }

  private nachAenderung(e: Ereignis): void {
    this.text = this.sitzung.text;
    this.revision = e.revision;
    this.verlauf = this.sitzung.verlauf;
    this.gespeichert = false;
    if (this.lesenZeit) clearTimeout(this.lesenZeit);
    this.lesenZeit = setTimeout(() => { this.lesenZeit = null; void this.lesenJetzt(); }, e.ort === "Editor" ? LESEN_NACH_MS : 0);
    this.speichernPlanen();
  }

  private async lesenJetzt(): Promise<void> {
    this.liest = true;
    const revision = this.sitzung.revision;
    const gelesen = this.sitzung.text;
    const aus = await this.lesedienst.lesen({ revision, text: gelesen, format: this.formatWahl, optionen: $state.snapshot(this.optionen), dateiname: this.name });
    if (aus === null || revision !== this.sitzung.revision) return; // abgebrochen oder überholt
    this.liest = false;
    if (aus.ok) {
      this.analyseText = gelesen;
      this.analyse = aus.analyse;
      this.leseweiseNeu = false;
      this.lesefehler = null;
    } else {
      this.lesefehler = aus.fehler;
    }
    const w = this.wartende;
    this.wartende = [];
    for (const f of w) f(aus.ok ? aus.analyse : null);
  }

  private speichernPlanen(): void {
    if (this.speichernZeit) clearTimeout(this.speichernZeit);
    this.speichernZeit = setTimeout(() => void this.speichern(), SPEICHERN_NACH_MS);
  }

  async speichern(): Promise<void> {
    if (this.speichernZeit) { clearTimeout(this.speichernZeit); this.speichernZeit = null; }
    await this.ablage.speichern(this.abgelegt());
    this.gespeichert = true;
  }

  abgelegt(): AbgelegtesDokument {
    return {
      kennung: this.kennung,
      name: this.name,
      ordner: this.ordner,
      formatWahl: this.formatWahl,
      optionen: $state.snapshot(this.optionen),
      text: this.sitzung.text,
      verlauf: this.sitzung.verlauf,
      platz: $state.snapshot(this.platz),
      geaendert: new Date().toISOString(),
    };
  }

  async schliessen(): Promise<void> {
    if (!this.gespeichert || this.speichernZeit) await this.speichern();
    if (this.lesenZeit) clearTimeout(this.lesenZeit);
    this.lesedienst.beenden();
    for (const f of this.wartende) f(null);
    this.wartende = [];
    this.zustaende.clear();
  }
}
