// Tabellenmodell: reine, DOM-freie Funktionen zum Aufbereiten eines
// JsonWert-Baums als Tabelle. Grundlage der Tabellen-Ansicht - hier steckt
// die gesamte Logik (tabellarisch erkennen, Spalten bilden, sortieren,
// filtern, Spaltentyp), damit die Svelte-Komponente selbst nur die Darstellung
// und die Kopplung übernimmt. Alle Funktionen sind rein und direkt testbar.

import type { JsonWert } from '../api/typen'
import { typVon, type WertTyp } from './wertZugriff'

export type Sortierrichtung = 'auf' | 'ab'

/** Ein Objekt-Element im Sinne der Tabelle (eine Zeile). */
type TabellenZeile = { [schluessel: string]: JsonWert }

/** Wahr, wenn der Wert ein Objekt (kein Array, kein null) ist. */
function istObjekt(wert: JsonWert): wert is TabellenZeile {
  return wert !== null && typeof wert === 'object' && !Array.isArray(wert)
}

/**
 * Tabellarisch ist ein Array, dessen Elemente überwiegend Objekte sind und das
 * mindestens ein Objekt enthält. Das deckt CSV (Array gleichförmiger Objekte)
 * ebenso ab wie JSON-/YAML-Arrays von Objekten.
 */
export function istTabellarisch(wurzel: JsonWert): boolean {
  if (!Array.isArray(wurzel) || wurzel.length === 0) return false
  const objekte = wurzel.filter(istObjekt).length
  return objekte >= 1 && objekte * 2 >= wurzel.length
}

/**
 * Spaltennamen als Vereinigung der Schlüssel aller Objekt-Elemente in
 * Erst-Auftritt-Reihenfolge. Verschachtelte Werte bleiben als einzelne Zelle
 * (keine Pfad-Spalten in dieser Ausbaustufe).
 */
export function spaltenAus(wurzel: JsonWert): string[] {
  if (!Array.isArray(wurzel)) return []
  const gesehen = new Set<string>()
  const spalten: string[] = []
  for (const element of wurzel) {
    if (!istObjekt(element)) continue
    for (const schluessel of Object.keys(element)) {
      if (!gesehen.has(schluessel)) {
        gesehen.add(schluessel)
        spalten.push(schluessel)
      }
    }
  }
  return spalten
}

/** Alle Zeilen-Indizes (0 .. n-1) der Wurzel als Ausgangsliste. */
export function alleZeilen(wurzel: JsonWert): number[] {
  if (!Array.isArray(wurzel)) return []
  return wurzel.map((_, index) => index)
}

/** Wert einer Zelle; undefined, wenn die Zeile kein Objekt ist oder der Schlüssel fehlt. */
export function zellwert(
  wurzel: JsonWert,
  zeile: number,
  spalte: string,
): JsonWert | undefined {
  if (!Array.isArray(wurzel)) return undefined
  const element = wurzel[zeile]
  if (element === undefined || !istObjekt(element)) return undefined
  if (!Object.prototype.hasOwnProperty.call(element, spalte)) return undefined
  return element[spalte]
}

/**
 * Zelle als Klartext für Filter, Export und Darstellung: verschachtelte Werte
 * als kompaktes JSON, Zahlen/Wahrheitswerte als deren Textform, null als leerer
 * String (die Ansicht zeigt dafür "(leer)"). undefined (fehlender Schlüssel)
 * wird ebenfalls zu leerem String.
 */
export function zellText(wert: JsonWert | undefined): string {
  if (wert === undefined || wert === null) return ''
  if (typeof wert === 'string') return wert
  if (typeof wert === 'number' || typeof wert === 'boolean') return String(wert)
  return JSON.stringify(wert)
}

/** Vergleichbarer Zahlwert einer Zelle oder null, wenn sie keine Zahl trägt. */
function alsZahl(wert: JsonWert | undefined): number | null {
  return typeof wert === 'number' && Number.isFinite(wert) ? wert : null
}

/**
 * Stabile Sortierung der Zeilen-Indizes nach dem Spaltenwert. null/undefined
 * kommen ans Ende (unabhängig von der Richtung). Zahlen numerisch, sonst
 * String-Vergleich mit deutscher Lokalisierung.
 */
export function sortiere(
  indizes: number[],
  wurzel: JsonWert,
  spalte: string,
  richtung: Sortierrichtung,
): number[] {
  const faktor = richtung === 'auf' ? 1 : -1
  const vergleicher = new Intl.Collator('de', { numeric: true, sensitivity: 'base' })
  // Reihenfolge-Index bewahrt die Stabilität bei Gleichstand.
  const paare = indizes.map((zeile, position) => ({ zeile, position }))
  paare.sort((a, b) => {
    const wertA = zellwert(wurzel, a.zeile, spalte)
    const wertB = zellwert(wurzel, b.zeile, spalte)
    const leerA = wertA === undefined || wertA === null
    const leerB = wertB === undefined || wertB === null
    if (leerA && leerB) return a.position - b.position
    if (leerA) return 1
    if (leerB) return -1
    const zahlA = alsZahl(wertA)
    const zahlB = alsZahl(wertB)
    let ordnung: number
    if (zahlA !== null && zahlB !== null) {
      ordnung = zahlA - zahlB
    } else {
      ordnung = vergleicher.compare(zellText(wertA), zellText(wertB))
    }
    if (ordnung !== 0) return faktor * ordnung
    return a.position - b.position
  })
  return paare.map((paar) => paar.zeile)
}

/**
 * Behält die Zeilen, deren Text (über alle angegebenen Spalten verbunden) den
 * Suchbegriff als Teilzeichenkette enthält (ohne Groß-/Kleinschreibung). Ein
 * leerer Begriff lässt alle Zeilen durch.
 */
export function filtere(
  indizes: number[],
  wurzel: JsonWert,
  spalten: string[],
  begriff: string,
): number[] {
  const gesucht = begriff.trim().toLowerCase()
  if (gesucht === '') return indizes
  return indizes.filter((zeile) => {
    for (const spalte of spalten) {
      const text = zellText(zellwert(wurzel, zeile, spalte)).toLowerCase()
      if (text.includes(gesucht)) return true
    }
    return false
  })
}

/**
 * Wie sortiere, aber auf den ANGEZEIGTEN (übersetzten) Werten. Ein leerer
 * Rohwert, der per Wert-Karte einen Ersatz erhält, sortiert dann als dieser
 * Ersatz - nicht mehr als leer. Numerisch, wenn der angezeigte Text eine Zahl
 * ist; sonst deutscher String-Vergleich.
 */
export function sortiereAngezeigt(
  indizes: number[],
  wurzel: JsonWert,
  spalte: string,
  richtung: Sortierrichtung,
  wertKarten: Record<string, Record<string, string>>,
): number[] {
  const faktor = richtung === 'auf' ? 1 : -1
  const vergleicher = new Intl.Collator('de', { numeric: true, sensitivity: 'base' })
  const paare = indizes.map((zeile, position) => ({ zeile, position }))
  paare.sort((a, b) => {
    const textA = zellAnzeige(wurzel, a.zeile, spalte, wertKarten)
    const textB = zellAnzeige(wurzel, b.zeile, spalte, wertKarten)
    const leerA = textA === ''
    const leerB = textB === ''
    if (leerA && leerB) return a.position - b.position
    if (leerA) return 1
    if (leerB) return -1
    const zahlA = textAlsZahl(textA)
    const zahlB = textAlsZahl(textB)
    let ordnung: number
    if (zahlA !== null && zahlB !== null) {
      ordnung = zahlA - zahlB
    } else {
      ordnung = vergleicher.compare(textA, textB)
    }
    if (ordnung !== 0) return faktor * ordnung
    return a.position - b.position
  })
  return paare.map((paar) => paar.zeile)
}

/** Vergleichbarer Zahlwert eines Textes oder null, wenn er keine reine Zahl ist. */
function textAlsZahl(text: string): number | null {
  if (text.trim() === '') return null
  const zahl = Number(text)
  return Number.isFinite(zahl) ? zahl : null
}

/**
 * Wie filtere, aber auf den ANGEZEIGTEN (übersetzten) Werten - der Filter greift
 * also auf das, was der Nutzer in der Tabelle sieht.
 */
export function filtereAngezeigt(
  indizes: number[],
  wurzel: JsonWert,
  spalten: string[],
  begriff: string,
  wertKarten: Record<string, Record<string, string>>,
): number[] {
  const gesucht = begriff.trim().toLowerCase()
  if (gesucht === '') return indizes
  return indizes.filter((zeile) => {
    for (const spalte of spalten) {
      const text = zellAnzeige(wurzel, zeile, spalte, wertKarten).toLowerCase()
      if (text.includes(gesucht)) return true
    }
    return false
  })
}

/**
 * Dominanter Werttyp einer Spalte (für das Typ-Abzeichen im Kopf). Gezählt
 * werden nur vorhandene, nicht-leere Zellen; gibt es keine, ist der Typ 'null'.
 * Bei Gleichstand gewinnt der zuerst gezählte Typ (Reihenfolge über die Zeilen).
 */
export function typVonSpalte(
  indizes: number[],
  wurzel: JsonWert,
  spalte: string,
): WertTyp {
  const zaehler = new Map<WertTyp, number>()
  for (const zeile of indizes) {
    const wert = zellwert(wurzel, zeile, spalte)
    if (wert === undefined || wert === null) continue
    const typ = typVon(wert)
    zaehler.set(typ, (zaehler.get(typ) ?? 0) + 1)
  }
  let besterTyp: WertTyp = 'null'
  let besteAnzahl = 0
  for (const [typ, anzahl] of zaehler) {
    if (anzahl > besteAnzahl) {
      besterTyp = typ
      besteAnzahl = anzahl
    }
  }
  return besterTyp
}

/** Quotet ein CSV-Feld, falls es Trenner, Anführungszeichen oder Umbruch enthält. */
function csvFeld(text: string, trenner: string): string {
  if (text.includes(trenner) || text.includes('"') || text.includes('\n') || text.includes('\r')) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

/**
 * Baut aus den (bereits gefilterten und sortierten) Zeilen-Indizes eine
 * CSV-Zeichenkette: Kopfzeile aus den Spalten, danach je Zeile die Zellen als
 * Text. Trenner ist standardmäßig das Semikolon (deutsche Tabellen-Konvention).
 */
export function alsCsv(
  indizes: number[],
  wurzel: JsonWert,
  spalten: string[],
  trenner = ';',
): string {
  const zeilen: string[] = []
  zeilen.push(spalten.map((spalte) => csvFeld(spalte, trenner)).join(trenner))
  for (const zeile of indizes) {
    const felder = spalten.map((spalte) =>
      csvFeld(zellText(zellwert(wurzel, zeile, spalte)), trenner),
    )
    zeilen.push(felder.join(trenner))
  }
  return zeilen.join('\r\n')
}

// ----- Anzeige-Umbau: Reihenfolge, Sichtbarkeit, Umbenennung, Übersetzung ----

/**
 * Die tatsächlich anzuzeigenden Spalten: die gewählte Reihenfolge, gefiltert
 * auf vorhandene und nicht versteckte Spalten. Spalten in der Reihenfolge, die
 * es nicht (mehr) gibt, fallen heraus.
 */
export function sichtbareSpalten(
  alleSpalten: string[],
  reihenfolge: string[],
  versteckt: ReadonlySet<string>,
): string[] {
  const vorhanden = new Set(alleSpalten)
  return reihenfolge.filter((spalte) => vorhanden.has(spalte) && !versteckt.has(spalte))
}

/** Anzeigename einer Spalte: die Umbenennung, sonst der Rohname. */
export function anzeigeName(spalte: string, umbenennung: Record<string, string>): string {
  const name = umbenennung[spalte]
  return name !== undefined && name.trim() !== '' ? name : spalte
}

/**
 * Übersetzter Wert eines Rohwerts in einer Spalte: der Ersatz aus der Wert-Karte,
 * sonst der unveränderte Rohwert. Die Karten sind Rohtext -> Ersatz.
 */
export function uebersetzterWert(
  rohwert: string,
  spalte: string,
  wertKarten: Record<string, Record<string, string>>,
): string {
  const ersatz = wertKarten[spalte]?.[rohwert]
  return ersatz !== undefined ? ersatz : rohwert
}

/** Angezeigter Zelltext: Rohtext der Zelle über die Wert-Karte der Spalte gemappt. */
export function zellAnzeige(
  wurzel: JsonWert,
  zeile: number,
  spalte: string,
  wertKarten: Record<string, Record<string, string>>,
): string {
  return uebersetzterWert(zellText(zellwert(wurzel, zeile, spalte)), spalte, wertKarten)
}

/**
 * Die verschiedenen Rohwerte einer Spalte (als Klartext) in Erst-Auftritt-
 * Reihenfolge, begrenzt auf grenze Einträge. Leere Zellen zählen als "" und
 * werden ausgelassen (dafür gibt es keinen sinnvollen Ersatz).
 */
export function verschiedeneRohwerte(
  indizes: number[],
  wurzel: JsonWert,
  spalte: string,
  grenze = 50,
): string[] {
  const gesehen = new Set<string>()
  const werte: string[] = []
  for (const zeile of indizes) {
    const text = zellText(zellwert(wurzel, zeile, spalte))
    if (text === '' || gesehen.has(text)) continue
    gesehen.add(text)
    werte.push(text)
    if (werte.length >= grenze) break
  }
  return werte
}

/**
 * Baut die Export-CSV aus den angezeigten Spalten (bereits in Reihenfolge und
 * ohne versteckte), mit Anzeigenamen als Kopf und übersetzten Zellwerten. Der
 * Trenner ist frei wählbar; Felder mit Trenner, Anführungszeichen oder Umbruch
 * werden RFC-4180-konform in Anführungszeichen gesetzt.
 */
export function alsCsvAngezeigt(
  indizes: number[],
  wurzel: JsonWert,
  spalten: string[],
  umbenennung: Record<string, string>,
  wertKarten: Record<string, Record<string, string>>,
  trenner: string,
): string {
  const zeilen: string[] = []
  zeilen.push(
    spalten.map((spalte) => csvFeld(anzeigeName(spalte, umbenennung), trenner)).join(trenner),
  )
  for (const zeile of indizes) {
    const felder = spalten.map((spalte) =>
      csvFeld(zellAnzeige(wurzel, zeile, spalte, wertKarten), trenner),
    )
    zeilen.push(felder.join(trenner))
  }
  return zeilen.join('\r\n')
}

/**
 * Zählt, in wie vielen angezeigten Feldern (Kopf + Zellen) der Trenner als
 * Zeichen vorkommt - Grundlage der Kollisionswarnung beim Export. Gezählt wird
 * das Vorkommen je Feld (nicht je Zeichen), also maximal Feldanzahl.
 */
export function trennerKollisionen(
  indizes: number[],
  wurzel: JsonWert,
  spalten: string[],
  umbenennung: Record<string, string>,
  wertKarten: Record<string, Record<string, string>>,
  trenner: string,
): number {
  let treffer = 0
  for (const spalte of spalten) {
    if (anzeigeName(spalte, umbenennung).includes(trenner)) treffer += 1
  }
  for (const zeile of indizes) {
    for (const spalte of spalten) {
      if (zellAnzeige(wurzel, zeile, spalte, wertKarten).includes(trenner)) treffer += 1
    }
  }
  return treffer
}
