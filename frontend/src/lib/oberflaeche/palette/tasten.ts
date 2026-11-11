// Tastenkürzel als Daten: eine Beschreibung je Kürzel, daraus das Erkennen im Tastendruck und die Anzeige als
// Tastenkappen (am Mac Zeichen, sonst Wörter). "befehl" ist am Mac die Befehlstaste, sonst Strg.
//
// Buchstaben und Ziffern vergleicht das Erkennen über `key` (folgt der Tastaturbelegung, Z und Y bleiben auf einer
// deutschen Tastatur, wo sie stehen). Mit Alt liefert der Mac in `key` Sonderzeichen (Alt N ist "~"); dann zählt die
// Lage der Taste (`code`).

export interface Tasten {
  /** Buchstabe oder Ziffer klein ("k", "1") oder Name nach KeyboardEvent.key ("Enter", "ArrowDown") */
  readonly taste: string;
  readonly befehl?: true;
  readonly umschalt?: true;
  readonly alt?: true;
}

/** Der Teil eines Tastendrucks, den das Erkennen braucht (damit es ohne Browser testbar ist) */
export interface Tastendruck {
  readonly key: string;
  readonly code: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly shiftKey: boolean;
  readonly altKey: boolean;
}

const lage = (taste: string): string | null =>
  /^[a-z]$/.test(taste) ? `Key${taste.toUpperCase()}` : /^[0-9]$/.test(taste) ? `Digit${taste}` : null;

export function passt(t: Tasten, e: Tastendruck, mac: boolean): boolean {
  const befehl = mac ? e.metaKey : e.ctrlKey;
  const fremd = mac ? e.ctrlKey : e.metaKey;
  if (befehl !== !!t.befehl || fremd || e.shiftKey !== !!t.umschalt || e.altKey !== !!t.alt) return false;
  if (t.alt && lage(t.taste)) return e.code === lage(t.taste);
  return e.key.toLowerCase() === t.taste.toLowerCase();
}

const NAMEN: Readonly<Record<string, string>> = {
  ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", Enter: "Enter", Escape: "Escape",
};

/** Tastenkappen in der Reihenfolge der Plattform (Mac: ⌥ ⇧ ⌘, sonst Strg Alt Umschalt) */
export function kappen(t: Tasten, mac: boolean): string[] {
  const taste = NAMEN[t.taste] ?? t.taste.toUpperCase();
  if (mac) return [...(t.alt ? ["⌥"] : []), ...(t.umschalt ? ["⇧"] : []), ...(t.befehl ? ["⌘"] : []), taste];
  return [...(t.befehl ? ["Strg"] : []), ...(t.alt ? ["Alt"] : []), ...(t.umschalt ? ["Umschalt"] : []), taste];
}

/** Für Hinweise im Titel eines Knopfs: "⇧ ⌘ Z" oder "Strg Umschalt Z" */
export const kuerzelText = (t: Tasten, mac: boolean): string => kappen(t, mac).join(" ");

/** Läuft die App auf einem Gerät von Apple? (Befehlstaste statt Strg) */
export const istMac = (plattform: string): boolean => /Mac|iPhone|iPad|iPod/.test(plattform);
