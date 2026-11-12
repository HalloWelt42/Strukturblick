// Einlesen von Dateien, die Strukturblick nicht als Text bearbeitet (Tabellendateien, HTML-Seiten): Sie werden beim
// Öffnen ein JSON-Dokument mit einer Liste je Tabelle. Hier liegt, was alle Einleser teilen: das Ergebnis, der Fehler
// und das Umformen von Tabellenzeilen in eine Liste von Objekten.

export type Zellwert = string | number | boolean | null;

export interface Geoeffnet {
  readonly name: string;
  readonly text: string;
  readonly meldung: string;
}

export interface Einleser {
  /** Für Menschen, etwa "Tabellendatei" */
  readonly name: string;
  readonly endungen: readonly string[];
  einlesen(bytes: Uint8Array, dateiname: string): Geoeffnet;
}

/** Die Datei passt nicht (kein ZIP, keine Tabelle ...); die Meldung ist für Menschen */
export class EinlesenFehler extends Error {}

export interface Tabelle {
  readonly name: string;
  readonly zeilen: readonly (readonly Zellwert[])[];
  /** Ist die erste Zeile die Kopfzeile? undefined: selbst erkennen (nur Texte) */
  readonly kopf?: boolean;
}

const spaltenName = (i: number): string => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/** Feldnamen aus der Kopfzeile: leere heißen nach der Spalte, doppelte bekommen eine Zahl */
function feldnamen(kopf: readonly Zellwert[], breite: number): string[] {
  const vergeben = new Map<string, number>();
  return Array.from({ length: breite }, (_, i) => {
    const roh = kopf[i] === null || kopf[i] === undefined || String(kopf[i]).trim() === "" ? `Spalte ${spaltenName(i)}` : String(kopf[i]).trim();
    const n = (vergeben.get(roh) ?? 0) + 1;
    vergeben.set(roh, n);
    return n === 1 ? roh : `${roh} ${n}`;
  });
}

/** Zeilen als Liste von Objekten; ganz leere Zeilen fallen weg, leere Zellen werden null */
export function zeilenAlsListe(t: Tabelle): Record<string, Zellwert>[] {
  const zeilen = t.zeilen.filter((z) => z.some((w) => w !== null && w !== ""));
  if (!zeilen.length) return [];
  const breite = Math.max(...zeilen.map((z) => z.length));
  const mitKopf = t.kopf ?? (zeilen[0].every((w) => w === null || typeof w === "string") && zeilen.length > 1);
  const namen = mitKopf ? feldnamen(zeilen[0], breite) : Array.from({ length: breite }, (_, i) => spaltenName(i));
  return zeilen.slice(mitKopf ? 1 : 0).map((z) => Object.fromEntries(namen.map((n, i) => [n, z[i] === undefined || z[i] === "" ? null : z[i]])));
}

/** Tabellen als JSON-Dokument mit einer Liste je Tabelle; die Meldung zählt und nennt die Hinweise */
export function tabellenAlsDokument(tabellen: readonly Tabelle[], dateiname: string, wort: { eins: string; viele: string }, hinweise: readonly string[]): Geoeffnet {
  const daten: Record<string, Record<string, Zellwert>[]> = {};
  const vergeben = new Map<string, number>();
  let zeilen = 0;
  for (const t of tabellen) {
    const n = (vergeben.get(t.name) ?? 0) + 1;
    vergeben.set(t.name, n);
    const liste = zeilenAlsListe(t);
    daten[n === 1 ? t.name : `${t.name} ${n}`] = liste;
    zeilen += liste.length;
  }
  const meldung = [`${dateiname} als JSON geöffnet: ${tabellen.length} ${tabellen.length === 1 ? wort.eins : wort.viele}, ${zeilen.toLocaleString("de-DE")} Zeilen`, ...hinweise].join("; ");
  return { name: `${dateiname.replace(/\.[^.]+$/, "")}.json`, text: JSON.stringify(daten, null, 2) + "\n", meldung };
}
