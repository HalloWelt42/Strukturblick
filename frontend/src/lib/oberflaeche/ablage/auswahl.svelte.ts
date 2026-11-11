// Zustand der Seite Ablage: Auswahl, Suche, Sortierung, laufendes Umbenennen. Lebt so lange wie die Seite.

import type { Dokumentkopf } from "../../zustand/ablageverwaltung.svelte";

export type Sortierung = "geaendert" | "name" | "groesse";

export class Ablageauswahl {
  gewaehlt = $state(new Set<string>());
  suche = $state("");
  sortierung = $state<Sortierung>("geaendert");
  umbenennen = $state<string | null>(null);

  istGewaehlt(kennung: string): boolean {
    return this.gewaehlt.has(kennung);
  }

  umschalten(kennung: string, mehrfach: boolean): void {
    const neu = new Set(mehrfach ? this.gewaehlt : []);
    if (mehrfach && neu.has(kennung)) neu.delete(kennung);
    else neu.add(kennung);
    this.gewaehlt = neu;
  }

  alleOderKeine(kennungen: readonly string[]): void {
    this.gewaehlt = kennungen.every((k) => this.gewaehlt.has(k)) ? new Set() : new Set(kennungen);
  }

  aufheben(): void {
    this.gewaehlt = new Set();
  }

  /** Dokumente eines Ordners, gefiltert und sortiert */
  sicht<T extends Dokumentkopf>(alle: readonly T[], ordner: string | null): T[] {
    const s = this.suche.trim().toLocaleLowerCase("de");
    const liste = alle.filter((d) => (ordner === null || s ? true : d.ordner === ordner) && (!s || d.name.toLocaleLowerCase("de").includes(s)));
    const nach: Record<Sortierung, (a: T, b: T) => number> = {
      geaendert: (a, b) => b.geaendert.localeCompare(a.geaendert),
      name: (a, b) => a.name.localeCompare(b.name, "de"),
      groesse: (a, b) => b.groesse - a.groesse,
    };
    return [...liste].sort(nach[this.sortierung]);
  }
}

export function groesse(zeichen: number): string {
  if (zeichen < 1024) return `${zeichen} Zeichen`;
  if (zeichen < 1024 * 1024) return `${Math.round(zeichen / 1024)} KB`;
  return `${(zeichen / 1048576).toFixed(1).replace(".", ",")} MB`;
}

export function zeitpunkt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const heute = new Date();
  const uhr = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === heute.toDateString()) return `heute ${uhr}`;
  return `${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })} ${uhr}`;
}

/** Endung als Abzeichen ("CSV"), ohne Formatwissen: nur der Dateiname */
export const endung = (name: string): string => (name.includes(".") ? name.split(".").pop()!.toUpperCase() : "");
