// Schemadateien finden: Importe und Includes nennen einen Ort (schemaLocation), relativ zur importierenden Datei. Gesucht
// wird erst nach vollem Pfad (Schema-Paket als ZIP), dann nach passendem Pfadende, zuletzt nach Dateinamen (Ordner der
// Ablage). Prüfen (libxml2) und Lesen (Schema-Übersicht) finden so dieselben Dateien.

export interface Schemadatei {
  /** Pfad im Paket ("bipro/basis/basis.xsd") oder Name in der Ablage */
  readonly pfad: string;
  readonly text: string;
}

export const dateiname = (p: string): string => p.split(/[\\/]/).pop() ?? p;

/** Pfad ohne ./ und ../ und ohne führende Schrägstriche */
export function normal(p: string): string {
  const aus: string[] = [];
  for (const t of p.replace(/\\/g, "/").split("/")) {
    if (t === "..") aus.pop();
    else if (t && t !== ".") aus.push(t);
  }
  return aus.join("/");
}

/** Ort relativ zur Datei `von` auflösen ("../basis/a.xsd" neben "paket/haupt/h.xsd" wird "paket/basis/a.xsd") */
export function aufloesen(ort: string, von: string): string {
  const o = ort.replace(/^file:\/\//, "");
  if (/^[a-z]+:\/\//i.test(o) || o.startsWith("/")) return normal(o);
  const ordner = normal(von).split("/").slice(0, -1).join("/");
  return normal(ordner ? `${ordner}/${o}` : o);
}

/** Nachschlagen nach Pfad, Pfadende und Dateinamen; der erste Treffer je Name gewinnt */
export class Dateisuche<T> {
  private readonly nachPfad = new Map<string, T>();
  private readonly nachName = new Map<string, T>();

  constructor(eintraege: Iterable<readonly [string, T]> = []) {
    for (const [p, w] of eintraege) this.hinzu(p, w);
  }

  hinzu(pfad: string, wert: T): void {
    const n = normal(pfad);
    this.nachPfad.set(n, wert);
    if (!this.nachName.has(dateiname(n))) this.nachName.set(dateiname(n), wert);
  }

  leeren(): void {
    this.nachPfad.clear();
    this.nachName.clear();
  }

  finden(anfrage: string): T | undefined {
    const n = normal(anfrage.replace(/^file:\/\//, ""));
    const direkt = this.nachPfad.get(n);
    if (direkt !== undefined) return direkt;
    for (const [p, w] of this.nachPfad) if (n.endsWith(`/${p}`) || p.endsWith(`/${n}`)) return w;
    return this.nachName.get(dateiname(n));
  }
}
