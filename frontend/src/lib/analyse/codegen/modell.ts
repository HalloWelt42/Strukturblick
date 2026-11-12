// Klassenmodell für "Code erzeugen": was eine Zielsprache braucht, unabhängig von der Quelle. Klassen mit Feldern, jedes
// Feld mit Typ, Pflicht, null-fähig, Erklärung und Grenzen in Worten. Quelle ist immer ein JSON Schema (aus den Daten
// abgeleitet oder aus der Ablage); die Schreiber je Sprache lesen nur dieses Modell.

export type Feldtyp =
  | { readonly art: "text" | "ganz" | "zahl" | "wahrheit" | "datum" | "zeitpunkt" | "null" | "beliebig" }
  | { readonly art: "klasse"; readonly name: string }
  | { readonly art: "liste"; readonly von: Feldtyp }
  | { readonly art: "aufzaehlung"; readonly werte: readonly (string | number | boolean | null)[] }
  | { readonly art: "vereinigung"; readonly teile: readonly Feldtyp[] };

/** Grenzen aus dem Schema, wie sie dort stehen (Längen bei Text, Anzahl bei Listen, Bereich bei Zahlen) */
export interface Regeln {
  readonly minLaenge?: number;
  readonly maxLaenge?: number;
  readonly muster?: string;
  readonly min?: number;
  readonly max?: number;
  readonly minExklusiv?: number;
  readonly maxExklusiv?: number;
  readonly vielfaches?: number;
  readonly minAnzahl?: number;
  readonly maxAnzahl?: number;
  readonly ohneDoppel?: boolean;
}

export interface Feld {
  /** Schlüssel in den Daten, wie er dort steht */
  readonly name: string;
  readonly typ: Feldtyp;
  /** Muss im Objekt stehen (required) */
  readonly pflicht: boolean;
  /** Darf null sein */
  readonly nullbar: boolean;
  readonly beschreibung: string | null;
  readonly regeln: Regeln;
}

/** Grenzen in Worten ("1 bis 3 Einträge", "Muster ^B-[0-9]{5}$") für Kommentare im Code */
export function grenzenText(r: Regeln): string[] {
  const aus: string[] = [];
  const bereich = (min: number | undefined, max: number | undefined, einheit: string) => {
    if (min !== undefined && max !== undefined) aus.push(min === max ? `genau ${min} ${einheit}` : `${min} bis ${max} ${einheit}`);
    else if (min !== undefined) aus.push(`mindestens ${min} ${einheit}`);
    else if (max !== undefined) aus.push(`höchstens ${max} ${einheit}`);
  };
  bereich(r.minLaenge, r.maxLaenge, "Zeichen");
  bereich(r.minAnzahl, r.maxAnzahl, "Einträge");
  if (r.muster !== undefined) aus.push(`Muster ${r.muster}`);
  if (r.min !== undefined) aus.push(`mindestens ${r.min}`);
  if (r.minExklusiv !== undefined) aus.push(`größer als ${r.minExklusiv}`);
  if (r.max !== undefined) aus.push(`höchstens ${r.max}`);
  if (r.maxExklusiv !== undefined) aus.push(`kleiner als ${r.maxExklusiv}`);
  if (r.vielfaches !== undefined) aus.push(`Vielfaches von ${r.vielfaches}`);
  if (r.ohneDoppel) aus.push("ohne Doppel");
  return aus;
}

/** Kommentar zu einem Feld: Erklärung (ohne Schlusspunkt), Zusätze und Grenzen, mit Semikolon getrennt */
export function feldKommentar(f: Feld, ...zusaetze: (string | null)[]): string {
  return [f.beschreibung?.replace(/[.\s]+$/, "") ?? null, ...zusaetze, ...grenzenText(f.regeln)].filter(Boolean).join("; ");
}

export interface Klasse {
  readonly name: string;
  readonly beschreibung: string | null;
  readonly felder: readonly Feld[];
}

export interface Klassenmodell {
  /** Wurzelklasse zuerst, dann in der Reihenfolge des ersten Bezugs */
  readonly klassen: readonly Klasse[];
  /** Was die Wurzel ist: meist die erste Klasse, sonst etwa eine Liste von ihr */
  readonly wurzel: Feldtyp;
  /** Was sich nicht abbilden ließ (unbekannte Verweise, freie Objekte) */
  readonly hinweise: readonly string[];
}

/** Alle Klassen, die ein Typ braucht (für Importe je Datei) */
export function klassenIn(t: Feldtyp, aus: Set<string> = new Set()): Set<string> {
  if (t.art === "klasse") aus.add(t.name);
  else if (t.art === "liste") klassenIn(t.von, aus);
  else if (t.art === "vereinigung") for (const x of t.teile) klassenIn(x, aus);
  return aus;
}

/** Name als Klassenname: Wortanfänge groß, nur Buchstaben und Ziffern, nicht mit Ziffer beginnend */
export function klassenname(roh: string): string {
  const teile = roh.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const name = teile.map((t) => t[0].toUpperCase() + t.slice(1)).join("") || "Eintrag";
  return /^\p{N}/u.test(name) ? `K${name}` : name;
}
