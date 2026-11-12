// Zustand des Lexikons (Hilfe): eine Instanz für die ganze Oberfläche, damit jeder i-Knopf dasselbe schwebende
// Fenster steuert. Lage, Größe, minimiert, maximiert und das zuletzt gezeigte Thema merkt der Browser. Die Suche kennt
// zwei Bereiche: "alle" (Weiterblättern führt von Thema zu Thema) und "thema" (nur das gezeigte).

import { alleThemen, thema as themaVon, trefferZahl } from "./themen";

const SCHLUESSEL = "strukturblick_lexikon";
export const KOPF_HOEHE = 48;
const MIN_BREITE = 420;
const MIN_HOEHE = 280;

export type Suchbereich = "alle" | "thema";

interface Gemerkt {
  x: number;
  y: number;
  breite: number;
  hoehe: number;
  minimiert: boolean;
  maximiert: boolean;
  thema: string;
}

interface Treffer {
  readonly thema: string;
  /** der wievielte Treffer innerhalb des Themas */
  readonly lokal: number;
}

const VORGABE: Gemerkt = { x: -1, y: -1, breite: 760, hoehe: 640, minimiert: false, maximiert: false, thema: "" };

function gemerktLesen(): Gemerkt {
  try {
    const roh = localStorage.getItem(SCHLUESSEL);
    if (roh) return { ...VORGABE, ...(JSON.parse(roh) as Partial<Gemerkt>) };
  } catch {
    // Gemerktes ist Bequemlichkeit; Fehler dürfen die Oberfläche nie stören
  }
  return { ...VORGABE };
}

class Lexikon {
  offen = $state(false);
  thema = $state("");
  /** Abschnitt, zu dem das Fenster rollen soll (einmalig, danach null) */
  abschnitt = $state<string | null>(null);
  suche = $state("");
  bereich = $state<Suchbereich>("alle");
  trefferIndex = $state(0);
  treffer = $state.raw<readonly Treffer[]>([]);
  x = $state(0);
  y = $state(0);
  breite = $state(VORGABE.breite);
  hoehe = $state(VORGABE.hoehe);
  minimiert = $state(false);
  maximiert = $state(false);
  private bereit = false;

  /** Einmalig Lage und Größe herstellen; ohne Gemerktes rechts unter dem Kopf, über dem Inspektor */
  private herstellen(): void {
    if (this.bereit) return;
    const g = gemerktLesen();
    this.breite = Math.min(g.breite, window.innerWidth - 16);
    this.hoehe = Math.min(g.hoehe, window.innerHeight - 16);
    this.x = g.x >= 0 ? g.x : Math.max(8, window.innerWidth - this.breite - 24);
    this.y = g.y >= 0 ? g.y : 64;
    this.minimiert = g.minimiert;
    this.maximiert = g.maximiert;
    if (!this.thema && themaVon(g.thema)) this.thema = g.thema;
    this.bereit = true;
  }

  /** Fenster öffnen und ein Thema zeigen, auf Wunsch an einem Abschnitt (Tiefenlink thema#abschnitt) */
  zeige(anker = "", abschnitt: string | null = null): void {
    this.herstellen();
    if (anker && themaVon(anker)) this.thema = anker;
    if (!this.thema) this.thema = alleThemen()[0]?.anker ?? "";
    this.abschnitt = abschnitt;
    this.offen = true;
    this.minimiert = false;
    this.suche = "";
    this.trefferIndex = 0;
    this.treffer = [];
    this.speichern();
  }

  /** Thema zeigen und darin einen Begriff suchen und markieren */
  finde(anker: string, begriff: string): void {
    this.zeige(anker);
    this.bereich = "thema";
    this.suche = begriff;
    this.neuBerechnen();
  }

  /** Thema wechseln; läuft eine Suche über alle Themen, zum ersten Treffer dort */
  waehle(anker: string): void {
    if (!themaVon(anker)) return;
    this.thema = anker;
    this.abschnitt = null;
    if (this.bereich === "alle" && this.suche.trim()) {
      const i = this.treffer.findIndex((t) => t.thema === anker);
      if (i !== -1) this.trefferIndex = i;
    } else {
      this.trefferIndex = 0;
      this.neuBerechnen();
    }
    this.speichern();
  }

  umschalten(anker = ""): void {
    if (this.offen) this.schliessen();
    else this.zeige(anker);
  }

  schliessen(): void {
    this.offen = false;
    this.speichern();
  }

  setzeSuche(text: string): void {
    this.suche = text;
    this.trefferIndex = 0;
    this.neuBerechnen();
  }

  setzeBereich(bereich: Suchbereich): void {
    this.bereich = bereich;
    this.trefferIndex = 0;
    this.neuBerechnen();
  }

  /** Trefferliste zum Suchbegriff; im Bereich "alle" über alle Themen in ihrer Reihenfolge */
  neuBerechnen(): void {
    const nadel = this.suche.trim();
    const liste: Treffer[] = [];
    if (nadel) {
      const kandidaten = this.bereich === "alle" ? alleThemen().map((t) => t.anker) : [this.thema];
      for (const anker of kandidaten) for (let i = 0, n = trefferZahl(anker, nadel); i < n; i++) liste.push({ thema: anker, lokal: i });
    }
    this.treffer = liste;
    if (this.trefferIndex >= liste.length) this.trefferIndex = 0;
    this.demAktivenFolgen();
  }

  private demAktivenFolgen(): void {
    const t = this.treffer[this.trefferIndex];
    if (t && t.thema !== this.thema) this.thema = t.thema;
  }

  naechster(): void {
    if (!this.treffer.length) return;
    this.trefferIndex = (this.trefferIndex + 1) % this.treffer.length;
    this.demAktivenFolgen();
  }

  voriger(): void {
    if (!this.treffer.length) return;
    this.trefferIndex = (this.trefferIndex - 1 + this.treffer.length) % this.treffer.length;
    this.demAktivenFolgen();
  }

  trefferJeThema(anker: string): number {
    return this.treffer.reduce((n, t) => (t.thema === anker ? n + 1 : n), 0);
  }

  /** Index des aktiven Treffers im gezeigten Thema (für die Hervorhebung), sonst -1 */
  aktivLokal(): number {
    const t = this.treffer[this.trefferIndex];
    return t && t.thema === this.thema ? t.lokal : -1;
  }

  minimierenUmschalten(): void {
    this.minimiert = !this.minimiert;
    if (this.minimiert) this.maximiert = false;
    this.speichern();
  }

  maximierenUmschalten(): void {
    this.maximiert = !this.maximiert;
    if (this.maximiert) this.minimiert = false;
    else this.einpassen();
    this.speichern();
  }

  /** Sichtschutz: geraten die Bedienelemente aus dem Bild, ins Vollbild (dort ist alles erreichbar) */
  sichern(): void {
    if (!this.offen || this.maximiert) return;
    const unten = this.minimiert ? this.y + KOPF_HOEHE : this.y + this.hoehe;
    if (this.x < 0 || this.y < 0 || this.x + this.breite > window.innerWidth || unten > window.innerHeight) {
      this.maximiert = true;
      this.minimiert = false;
      this.speichern();
    }
  }

  /** Lage und Größe so, dass das Fenster ganz im Browserfenster liegt */
  einpassen(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.breite = Math.min(this.breite, Math.max(MIN_BREITE, w - 16));
    this.hoehe = Math.min(this.hoehe, Math.max(MIN_HOEHE, h - 16));
    this.x = Math.min(Math.max(0, this.x), Math.max(0, w - this.breite));
    this.y = Math.min(Math.max(0, this.y), Math.max(0, h - this.hoehe));
  }

  setzeLage(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  setzeGroesse(breite: number, hoehe: number): void {
    this.breite = Math.max(MIN_BREITE, breite);
    this.hoehe = Math.max(MIN_HOEHE, hoehe);
  }

  speichern(): void {
    try {
      const g: Gemerkt = { x: this.x, y: this.y, breite: this.breite, hoehe: this.hoehe, minimiert: this.minimiert, maximiert: this.maximiert, thema: this.thema };
      localStorage.setItem(SCHLUESSEL, JSON.stringify(g));
    } catch {
      // siehe oben
    }
  }
}

export const lexikon = new Lexikon();
