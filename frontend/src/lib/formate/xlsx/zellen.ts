// Zellbezüge (A1), Spaltennamen und Datumswerte von Tabellendateien (XLSX). Datum und Zeit stehen dort als Zahl
// (Tage seit 1900 oder 1904, Bruchteil für die Uhrzeit); erst das Zahlenformat der Zelle sagt, dass es ein Datum ist.

/** Spaltenname zur Stelle ab 0: 0 A, 25 Z, 26 AA */
export function spaltenName(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Stelle (ab 0) von Spalte und Zeile eines Bezugs wie AB12; null, wenn es keiner ist */
export function bezug(ref: string): { spalte: number; zeile: number } | null {
  const m = /^\$?([A-Z]{1,3})\$?(\d+)$/.exec(ref.toUpperCase());
  if (!m) return null;
  let spalte = 0;
  for (const c of m[1]) spalte = spalte * 26 + (c.charCodeAt(0) - 64);
  return { spalte: spalte - 1, zeile: Number(m[2]) - 1 };
}

/** Eingebaute Zahlenformate für Datum und Zeit (ECMA-376, 18.8.30) */
const EINGEBAUT_DATUM = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

/** Ist das Zahlenformat eines für Datum oder Zeit? Texte in Anführungszeichen, Maskiertes und [Farben] zählen nicht. */
export function istDatumsformat(id: number, code: string | undefined): boolean {
  if (EINGEBAUT_DATUM.has(id)) return true;
  if (!code) return false;
  const kern = code.replace(/"[^"]*"/g, "").replace(/\\./g, "").replace(/\[[^\]]*\]/g, "").replace(/_.|\*./g, "");
  return /[ydhs]|m(?!.*[#0?])/i.test(kern) && !/^general$/i.test(kern.trim());
}

const TAG = 86400000;
const zwei = (n: number): string => String(n).padStart(2, "0");

/** Seriennummer (Tage) als Datum, Zeit oder beides in ISO-Schreibweise */
export function datumAusSerie(serie: number, system1904: boolean): string {
  const ganz = Math.floor(serie);
  const sekunden = Math.round((serie - ganz) * 86400);
  const zeit = `${zwei(Math.floor(sekunden / 3600) % 24)}:${zwei(Math.floor(sekunden / 60) % 60)}:${zwei(sekunden % 60)}`;
  if (ganz === 0 && !system1904) return zeit;
  // 1900: Excel zählt den 29.02.1900 mit, den es nicht gab; ab Tag 61 gilt deshalb der 30.12.1899 als Tag 0
  const null_ = system1904 ? Date.UTC(1904, 0, 1) : ganz < 61 ? Date.UTC(1899, 11, 31) : Date.UTC(1899, 11, 30);
  const d = new Date(null_ + ganz * TAG);
  const datum = `${d.getUTCFullYear()}-${zwei(d.getUTCMonth() + 1)}-${zwei(d.getUTCDate())}`;
  return sekunden ? `${datum}T${zeit}` : datum;
}

/** ISO-Datum (mit oder ohne Zeit, ohne Zeitzone) als Seriennummer im 1900-System; null, wenn es keins ist */
export function serieAusDatum(s: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (!m) return null;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0));
  const d = new Date(ms);
  if (d.getUTCMonth() !== Number(m[2]) - 1 || d.getUTCFullYear() < 1900) return null;
  const tage = (ms - Date.UTC(1899, 11, 30)) / TAG;
  return tage < 61 ? tage - 1 : tage;
}
