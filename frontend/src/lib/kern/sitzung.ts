// Die Sitzung eines Dokuments ist der eine Einstiegspunkt für Änderungen (Leitgedanke 2): Oberfläche, Rezepte und Tests
// ändern den Text nur über ausfuehren(befehl, werte). Hier entstehen Revision, Verlauf, Rückgängig und die Ereignisse,
// auf die der Zustand reagiert. Ungültige Eingaben enden nie in einer Ausnahme, sondern in einem Ergebnis mit Fehler.

import type { Befehl, Umfeld, Analyse } from "./befehl";
import { Befehlsfehler } from "./befehl";
import { anwenden, Aenderungsfehler } from "./aenderung";
import { GRUNDBEFEHLE } from "./befehle";
import type { TextAenderung } from "./format";
import { hinzu, kannVor, kannZurueck, LEERER_VERLAUF, VORGABE_GRENZEN, type Aufruf, type Grenzen, type Verlauf } from "./verlauf";

export type Fehlerart = "unbekannt" | "werte" | "fachlich" | "intern";

export type Ergebnis =
  | { readonly ok: true; readonly titel: string; readonly geaendert: boolean }
  | { readonly ok: false; readonly art: Fehlerart; readonly fehler: string };

/** Was sich am Text geändert hat; der Editor übernimmt genau diese Änderungen, der Zustand liest neu. */
export interface Ereignis {
  readonly art: "ausgefuehrt" | "rueckgaengig" | "wiederholt" | "gesprungen" | "geladen";
  readonly revision: number;
  readonly aenderungen: readonly TextAenderung[];   // bezogen auf den Text vor dem Ereignis, in Reihenfolge
  readonly titel: string;
  readonly ort: string;
}

export interface Aufrufangaben {
  readonly ort: string;
  readonly geste?: string;
  /** Fachlicher Schritt, der im Verlauf mitreist (für Rezepte aus dem Verlauf) */
  readonly rezeptschritt?: unknown;
}

export class Sitzung {
  private textStand: string;
  private revisionStand = 0;
  private verlaufStand: Verlauf = LEERER_VERLAUF;
  private readonly befehle = new Map<string, Befehl>();
  private readonly beobachter = new Set<(e: Ereignis) => void>();

  constructor(text: string, private analyseQuelle: () => Analyse | null = () => null, private readonly grenzen: Grenzen = VORGABE_GRENZEN) {
    this.textStand = text;
    for (const b of GRUNDBEFEHLE) this.registrieren(b);
  }

  registrieren(b: Befehl): void {
    if (this.befehle.has(b.kennung)) throw new Error(`Befehl ${b.kennung} ist schon angemeldet`);
    this.befehle.set(b.kennung, b);
  }

  /** Verlauf eines gespeicherten Dokuments übernehmen (nur beim Laden, passend zum Text). */
  verlaufUebernehmen(v: Verlauf): void {
    this.verlaufStand = { eintraege: v.eintraege, zeiger: Math.min(v.zeiger, v.eintraege.length) };
  }

  /** Woher die Sitzung die Analyse der aktuellen Revision bekommt (vom Arbeitsblatt gesetzt). */
  analyseVon(quelle: () => Analyse | null): void {
    this.analyseQuelle = quelle;
  }

  get text(): string { return this.textStand; }
  get revision(): number { return this.revisionStand; }
  get verlauf(): Verlauf { return this.verlaufStand; }
  get kannZurueck(): boolean { return kannZurueck(this.verlaufStand); }
  get kannVor(): boolean { return kannVor(this.verlaufStand); }
  befehl(kennung: string): Befehl | undefined { return this.befehle.get(kennung); }

  beobachten(f: (e: Ereignis) => void): () => void {
    this.beobachter.add(f);
    return () => this.beobachter.delete(f);
  }

  private umfeld(): Umfeld {
    const analyse = this.analyseQuelle();
    return { text: this.textStand, revision: this.revisionStand, analyse: analyse && analyse.revision === this.revisionStand ? analyse : null };
  }

  /** Vorschau: welche Änderungen würde der Befehl machen, ohne sie auszuführen (für Massenänderungen). */
  vorschau(kennung: string, werte: unknown): { ok: true; aenderungen: readonly TextAenderung[]; titel: string } | { ok: false; art: Fehlerart; fehler: string } {
    const b = this.befehle.get(kennung);
    if (!b) return { ok: false, art: "unbekannt", fehler: `Befehl ${kennung} gibt es nicht` };
    const geprueft = b.werte.safeParse(werte);
    if (!geprueft.success) return { ok: false, art: "werte", fehler: geprueft.error.issues.map((i) => `${i.path.join(".") || "werte"}: ${i.message}`).join("; ") };
    const u = this.umfeld();
    try {
      return { ok: true, aenderungen: b.aenderungen(geprueft.data, u), titel: b.beschreiben?.(geprueft.data, u) ?? b.titel };
    } catch (f) {
      if (f instanceof Befehlsfehler || f instanceof Aenderungsfehler) return { ok: false, art: "fachlich", fehler: f.message };
      return { ok: false, art: "intern", fehler: f instanceof Error ? f.message : String(f) };
    }
  }

  ausfuehren(kennung: string, werte: unknown, angaben: Aufrufangaben): Ergebnis {
    const v = this.vorschau(kennung, werte);
    if (!v.ok) return v;
    if (v.aenderungen.length === 0) return { ok: true, titel: v.titel, geaendert: false };
    let neu;
    try {
      neu = anwenden(this.textStand, v.aenderungen);
    } catch (f) {
      return { ok: false, art: "fachlich", fehler: f instanceof Error ? f.message : String(f) };
    }
    if (neu.text === this.textStand) return { ok: true, titel: v.titel, geaendert: false };
    const aufruf: Aufruf = {
      befehl: kennung, titel: v.titel, werte, zeit: new Date().toISOString(), ort: angaben.ort, geste: angaben.geste,
      ...(angaben.rezeptschritt !== undefined ? { rezeptschritt: angaben.rezeptschritt } : {}),
    };
    this.verlaufStand = hinzu(this.verlaufStand, aufruf, { aenderungen: neu.aenderungen, umkehrung: neu.umkehrung }, this.grenzen);
    this.setzen(neu.text, { art: "ausgefuehrt", aenderungen: neu.aenderungen, titel: v.titel, ort: angaben.ort });
    return { ok: true, titel: v.titel, geaendert: true };
  }

  rueckgaengig(): boolean {
    if (!this.kannZurueck) return false;
    const e = this.verlaufStand.eintraege[this.verlaufStand.zeiger - 1];
    const folge: TextAenderung[][] = [];
    let text = this.textStand;
    for (const s of [...e.schritte].reverse()) {
      text = anwenden(text, s.umkehrung).text;
      folge.push([...s.umkehrung]);
    }
    this.verlaufStand = { ...this.verlaufStand, zeiger: this.verlaufStand.zeiger - 1 };
    this.setzenFolge(text, folge, "rueckgaengig", e.aufruf);
    return true;
  }

  wiederholen(): boolean {
    if (!this.kannVor) return false;
    const e = this.verlaufStand.eintraege[this.verlaufStand.zeiger];
    const folge: TextAenderung[][] = [];
    let text = this.textStand;
    for (const s of e.schritte) {
      text = anwenden(text, s.aenderungen).text;
      folge.push([...s.aenderungen]);
    }
    this.verlaufStand = { ...this.verlaufStand, zeiger: this.verlaufStand.zeiger + 1 };
    this.setzenFolge(text, folge, "wiederholt", e.aufruf);
    return true;
  }

  /** Zu einem Stand springen (0 = Anfang); spätere Einträge bleiben zum Wiederholen erhalten. */
  springen(zeiger: number): void {
    const ziel = Math.max(0, Math.min(zeiger, this.verlaufStand.eintraege.length));
    while (this.verlaufStand.zeiger > ziel) this.rueckgaengig();
    while (this.verlaufStand.zeiger < ziel) this.wiederholen();
  }

  private setzenFolge(text: string, folge: TextAenderung[][], art: "rueckgaengig" | "wiederholt", aufruf: Aufruf): void {
    // Mehrere Schritte melden wir einzeln, damit der Editor jede Änderungsmenge auf ihren eigenen Ausgangstext bezieht.
    this.textStand = text;
    this.revisionStand++;
    for (const aenderungen of folge) this.melden({ art, revision: this.revisionStand, aenderungen, titel: aufruf.titel, ort: aufruf.ort });
  }

  private setzen(text: string, e: Omit<Ereignis, "revision">): void {
    this.textStand = text;
    this.revisionStand++;
    this.melden({ ...e, revision: this.revisionStand });
  }

  private melden(e: Ereignis): void {
    for (const f of this.beobachter) f(e);
  }
}
