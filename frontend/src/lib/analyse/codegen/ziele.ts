// Gemeinsames der Zielsprachen für "Code erzeugen": Optionen, Ausgabe (Dateien, Abbildung vom Schema zum Typ, wie man
// einliest) und die Auswahl der Felder, deren Abbildung erklärenswert ist. Jede Sprache ist ein Codeziel mit eigener
// Schreibfunktion; die Liste der Ziele steht in codeziele.ts.

import { grenzenText, type Feld, type Feldtyp, type Klassenmodell } from "./modell";

export interface Codeoptionen {
  /** Name der Wurzelklasse */
  readonly wurzelname: string;
  /** PHP-Namensraum (nur wo die Sprache einen kennt) */
  readonly namensraum: string;
  /** readonly, frozen: Werte nach dem Anlegen nicht änderbar */
  readonly unveraenderlich: boolean;
  /** Je Klasse eine Datei statt einer gemeinsamen */
  readonly jeKlasse: boolean;
  /** Erste Kommentarzeile ("Erzeugt von Strukturblick 2.26.2 aus bestellungen.json") */
  readonly kopf: string;
  /** Stamm der Datei bei "eine Datei" ("bestellungen") */
  readonly dateistamm: string;
  /** Grenzen als Attribute der Sprache statt als Kommentar (nur wo das Ziel es kennt: PHP mit Symfony Validator) */
  readonly attribute: boolean;
}

/** Daten, die das Miniprojekt einliest: Dateiname im Ordner daten/ und Inhalt als JSON */
export interface Miniprojektdaten {
  readonly name: string;
  readonly text: string;
}

export interface Codedatei {
  readonly name: string;
  readonly text: string;
}

export interface Abbildung {
  readonly feld: string;
  readonly typ: string;
  readonly erklaerung: string;
}

export interface Codeausgabe {
  readonly dateien: readonly Codedatei[];
  readonly abbildung: readonly Abbildung[];
  /** Kurzer Code, der Daten einliest */
  readonly einlesen: string;
  /** Ein Satz unter dem Code (wo die Grenzen stehen) */
  readonly hinweis: string;
  /** Ab welcher Fassung von Sprache und Bibliothek der Code läuft ("PHP ab 8.2"); steht auch im Kopf jeder Datei */
  readonly voraussetzung: string;
}

export interface Codeziel {
  readonly kennung: "php" | "typescript" | "pydantic" | "dataclasses";
  readonly name: string;
  /** Sprache für die Hervorhebung im Code-Feld */
  readonly sprache: "php" | "typescript" | "python";
  /** Kennt die Sprache einen Namensraum im Code (PHP namespace)? */
  readonly namensraum: boolean;
  /** Lassen sich Grenzen als Attribute schreiben (Einstellung "Grenzen als")? */
  readonly attribute: boolean;
  schreiben(m: Klassenmodell, o: Codeoptionen): Codeausgabe;
  /** Lauffähiges kleines Projekt: Klassen, Daten, Leseprogramm, Abhängigkeiten, README (Pfade mit Ordnern) */
  miniprojekt(m: Klassenmodell, o: Codeoptionen, daten: Miniprojektdaten): Codedatei[];
}

/**
 * Klassennamen, die in einer Sprache nicht gehen (reservierte Wörter, eingebaute Typen, eigene Importe), bekommen ein
 * "Typ" angehängt; alle Verweise im Modell folgen. So muss kein Schreiber Sonderfälle der Quelle kennen.
 */
export function umbenannt(m: Klassenmodell, verboten: (name: string) => boolean): Klassenmodell {
  const neu = new Map<string, string>();
  const vergeben = new Set(m.klassen.map((k) => k.name));
  for (const k of m.klassen) {
    if (!verboten(k.name)) continue;
    let n = `${k.name}Typ`;
    for (let i = 2; vergeben.has(n) || verboten(n); i++) n = `${k.name}Typ${i}`;
    vergeben.add(n);
    neu.set(k.name, n);
  }
  if (!neu.size) return m;
  const typ = (t: Feldtyp): Feldtyp =>
    t.art === "klasse" ? { art: "klasse", name: neu.get(t.name) ?? t.name }
    : t.art === "liste" || t.art === "zuordnung" ? { ...t, von: typ(t.von) }
    : t.art === "vereinigung" ? { art: "vereinigung", teile: t.teile.map(typ) }
    : t;
  return {
    ...m,
    wurzel: typ(m.wurzel),
    klassen: m.klassen.map((k) => ({ ...k, name: neu.get(k.name) ?? k.name, felder: k.felder.map((f) => ({ ...f, typ: typ(f.typ) })) })),
  };
}

/** Felder, deren Abbildung einen Satz wert ist (null, optional, Datum, Liste, feste Werte, Grenzen), höchstens `grenze` */
export function abbildungen(m: Klassenmodell, typText: (f: Feld) => string, grenze = 8): Abbildung[] {
  const aus: Abbildung[] = [];
  const gesehen = new Set<string>();
  const wichtig = (t: Feldtyp): boolean => ["datum", "zeitpunkt", "liste", "zuordnung", "aufzaehlung", "vereinigung", "beliebig"].includes(t.art);
  for (const k of m.klassen) for (const f of k.felder) {
    if (aus.length >= grenze || gesehen.has(f.name)) continue;
    const regeln = grenzenText(f.regeln);
    if (!f.nullbar && f.pflicht && !wichtig(f.typ) && !regeln.length) continue;
    gesehen.add(f.name);
    const teile: string[] = [];
    if (f.nullbar) teile.push("darf null sein");
    if (!f.pflicht) teile.push("kann fehlen");
    if (f.typ.art === "datum") teile.push("aus format date");
    if (f.typ.art === "zeitpunkt") teile.push("aus format date-time");
    if (f.typ.art === "aufzaehlung") teile.push(`feste Werte: ${f.typ.werte.map((w) => JSON.stringify(w)).join(", ")}`);
    if (f.typ.art === "beliebig") teile.push("ohne feste Form");
    if (f.typ.art === "zuordnung") teile.push("Schlüssel frei, Werte gleich gebaut");
    teile.push(...regeln);
    aus.push({ feld: f.name, typ: typText(f), erklaerung: teile.join(", ") });
  }
  return aus;
}

/**
 * Bezeichner für Sprachen mit gleichen Regeln (Buchstaben, Ziffern, Unterstrich): Ungültiges wird Unterstrich, ein
 * führender Unterstrich fällt weg (Pydantic verbietet ihn), Ziffern am Anfang bekommen "f", Schlüsselwörter ein "_".
 */
export function bezeichner(name: string, reserviert: ReadonlySet<string>): string {
  let b = name.replace(/[^\p{L}\p{N}_]/gu, "_").replace(/^_+/, "");
  if (!b || /^\p{N}/u.test(b)) b = `f${b}`;
  if (reserviert.has(b)) b = `${b}_`;
  return b;
}

/** Bezeichner je Feld einer Klasse, eindeutig ("a-b" und "a_b" werden a_b und a_b2) */
export function feldnamen(namen: readonly string[], reserviert: ReadonlySet<string>): Map<string, string> {
  const aus = new Map<string, string>();
  const vergeben = new Set<string>();
  for (const n of namen) {
    const basis = bezeichner(n, reserviert);
    let b = basis;
    for (let i = 2; vergeben.has(b); i++) b = `${basis}${i}`;
    vergeben.add(b);
    aus.set(n, b);
  }
  return aus;
}
