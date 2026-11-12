// Zufall mit Startwert für Testdaten: gleicher Startwert, gleiche Folge (mulberry32). Nicht für Geheimnisse gedacht,
// nur für wiederholbare Beispieldaten.

export class Zufall {
  private zustand: number;

  constructor(startwert: number) {
    this.zustand = Math.trunc(startwert) >>> 0 || 0x9e3779b9;
  }

  /** Gleichverteilt in [0, 1) */
  zahl(): number {
    let t = (this.zustand = (this.zustand + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Ganze Zahl von min bis max (beide eingeschlossen) */
  ganz(min: number, max: number): number {
    const [a, b] = min <= max ? [min, max] : [max, min];
    return a + Math.floor(this.zahl() * (b - a + 1));
  }

  /** Ein Eintrag der Liste */
  wahl<T>(liste: readonly T[]): T {
    return liste[Math.floor(this.zahl() * liste.length)];
  }

  /** Ein Eintrag nach Gewicht */
  gewichtet<T>(liste: readonly { readonly wert: T; readonly gewicht: number }[]): T {
    const summe = liste.reduce((n, e) => n + Math.max(0, e.gewicht), 0);
    let r = this.zahl() * summe;
    for (const e of liste) {
      r -= Math.max(0, e.gewicht);
      if (r < 0) return e.wert;
    }
    return liste[liste.length - 1].wert;
  }

  /** Wahr mit dem Anteil (0 bis 1) */
  ja(anteil: number): boolean {
    return this.zahl() < anteil;
  }
}
