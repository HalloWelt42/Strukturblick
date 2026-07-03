// Editier-Zustand der Tabellen-Ansicht je Tab: die flüchtige Vorschau aller
// Zeilen- und Spalten-Änderungen, solange sie noch nicht ins Dokument
// übernommen wurden. Anders als der reine Anzeige-Zustand
// (tabellenAnsichtZustand) verändert dieser Zustand die tatsächlichen Daten -
// Zellwerte, Zeilen (dupliziert/gelöscht/neu) und Spalten (umbenannt/dupliziert/
// gelöscht/neu). Er ist bewusst flüchtig: Erst mit "Übernehmen" schreibt die
// Ansicht die Zeilen zurück ins Dokument; bis dahin bleibt das Original
// unangetastet.
//
// Bezugsgrößen für die Vorschau (Anzahl Änderungen, Geändert-Marken) sind
// unveränderliche Ursprungswerte: die Baseline je Zeilen-Id (für den
// Zellvergleich) sowie die Ursprungs-Zeilen-Ids und -Spalten (für "gelöscht",
// "neu" und das Spalten-Delta). Strukturelle Operationen (Zeile/Spalte löschen
// oder hinzufügen) lassen diese Bezugsgrößen unangetastet, damit die Zählung
// robust bleibt.
//
// Abgleich bei Dokumentwechsel: Der Zustand hält einen Fingerabdruck der Quelle.
// Ändert sich die Quelle UND es gibt keine offenen Änderungen, wird die Kopie
// frisch aufgebaut. Bei offenen Änderungen bleibt die laufende Bearbeitung
// erhalten.

import type { JsonWert } from '../../api/typen'
import { SvelteMap, SvelteSet } from 'svelte/reactivity'
import {
  zeilenAusWurzel,
  type TabellenZeile,
} from '../../dienste/tabellenZeilen'

/** Editier-Zustand einer Tabelle (flüchtige Vorschau bis "Übernehmen"). */
export interface TabellenBearbeitung {
  /** Fingerabdruck der Quelle, aus der zuletzt aufgebaut wurde. */
  quelle: string
  /** Die editierbaren Zeilen (Kopie, Rohname -> Wert). */
  zeilen: TabellenZeile[]
  /** Spalten in Reihenfolge (Rohnamen; enthält neue/duplizierte Spalten). */
  spaltenReihenfolge: string[]
  /** Rohname der Spalte -> neuer Name (Umbenennung des Schlüssels beim Übernehmen). */
  umbenennung: Record<string, string>
  /**
   * Unveränderliche Baseline je Zeilen-Id (Kopie der Quelle) für den
   * Vorschau-Vergleich einer Zelle. Neue/duplizierte Zeilen tragen hier ihre
   * eigene Ausgangskopie (bzw. nichts) - ihre Zellen gelten nie als "geändert",
   * weil die ganze Zeile bereits als "neu" markiert ist.
   */
  basisJeId: SvelteMap<string, TabellenZeile>
  /** Geänderte Zellen als Schlüssel "zeilenId spalte" (Vorschau-Markierung). */
  geaenderteZellen: SvelteSet<string>
  /** Neue oder duplizierte Zeilen als Zeilen-Id (Vorschau-Markierung). */
  neueZeilen: SvelteSet<string>
  /** Stabile Id je Zeile (parallel zu zeilen), damit Vorschau-Marken robust bleiben. */
  zeilenIds: string[]
  /** Ursprüngliche Zeilen-Ids (unveränderlich) - Basis für "gelöscht"/"neu". */
  ursprungIds: string[]
  /** Ursprüngliche Spalten (unveränderlich) - Basis für das Spalten-Delta. */
  ursprungSpalten: string[]
  /** Laufende Nummer für neue Spalten-Rohnamen (Kollisionsfrei). */
  spaltenZaehler: number
}

const zustaende = new Map<string, TabellenBearbeitung>()

/** Trennzeichen für zusammengesetzte Schlüssel (in Rohnamen praktisch nie enthalten). */
const SCHLUESSEL_TRENNER = ' '

/** Baut einen Fingerabdruck aus Zeilenbaum und Spalten für den Dokumentabgleich. */
function fingerabdruck(wurzel: JsonWert, spalten: string[]): string {
  return `${spalten.join(SCHLUESSEL_TRENNER)}::${JSON.stringify(wurzel)}`
}

/** Strukturkopie eines JsonWert (Objekte/Listen werden dupliziert). */
function strukturKopie(wert: JsonWert): JsonWert {
  if (wert === null || typeof wert !== 'object') return wert
  return JSON.parse(JSON.stringify(wert)) as JsonWert
}

/** Tiefe Kopie einer Zeile (Werte können verschachtelt sein). */
function kopiereZeile(zeile: TabellenZeile): TabellenZeile {
  const kopie: TabellenZeile = {}
  for (const [schluessel, wert] of Object.entries(zeile)) {
    kopie[schluessel] = wert === undefined ? (undefined as never) : strukturKopie(wert)
  }
  return kopie
}

/** Frisch aus der Quelle aufgebauter Editier-Zustand ohne offene Änderungen. */
function baueNeu(wurzel: JsonWert, spalten: string[]): TabellenBearbeitung {
  const roh = zeilenAusWurzel(wurzel, spalten)
  const zeilen = roh.map(kopiereZeile)
  const ids = roh.map(() => crypto.randomUUID())
  const basisJeId = new SvelteMap<string, TabellenZeile>()
  roh.forEach((zeile, index) => {
    basisJeId.set(ids[index], kopiereZeile(zeile))
  })
  const zustand = $state<TabellenBearbeitung>({
    quelle: fingerabdruck(wurzel, spalten),
    zeilen,
    spaltenReihenfolge: [...spalten],
    umbenennung: {},
    basisJeId,
    geaenderteZellen: new SvelteSet<string>(),
    neueZeilen: new SvelteSet<string>(),
    zeilenIds: ids,
    ursprungIds: [...ids],
    ursprungSpalten: [...spalten],
    spaltenZaehler: 0,
  })
  return zustand
}

/**
 * Liefert den (reaktiven) Editier-Zustand des Tabs und gleicht ihn mit der
 * Quelle ab. Beim ersten Zugriff wird eine Kopie gebaut. Wechselt danach die
 * Quelle und es gibt KEINE offenen Änderungen, wird frisch aufgebaut; bei
 * offenen Änderungen bleibt die laufende Bearbeitung erhalten.
 */
export function bearbeitungFuer(
  tabId: string,
  wurzel: JsonWert,
  spalten: string[],
): TabellenBearbeitung {
  const vorhanden = zustaende.get(tabId)
  if (vorhanden === undefined) {
    const neu = baueNeu(wurzel, spalten)
    zustaende.set(tabId, neu)
    return neu
  }
  const neuerAbdruck = fingerabdruck(wurzel, spalten)
  if (vorhanden.quelle !== neuerAbdruck && anzahlAenderungen(vorhanden) === 0) {
    // Quelle hat sich geändert und nichts ist offen: frisch übernehmen.
    setzeInPlace(vorhanden, baueNeu(wurzel, spalten))
  }
  return vorhanden
}

/** Ersetzt die Felder eines Zustands in-place (Referenz und Reaktivität bleiben). */
function setzeInPlace(ziel: TabellenBearbeitung, frisch: TabellenBearbeitung): void {
  ziel.quelle = frisch.quelle
  ziel.zeilen = frisch.zeilen
  ziel.spaltenReihenfolge = frisch.spaltenReihenfolge
  ziel.umbenennung = frisch.umbenennung
  ziel.basisJeId = frisch.basisJeId
  ziel.geaenderteZellen = frisch.geaenderteZellen
  ziel.neueZeilen = frisch.neueZeilen
  ziel.zeilenIds = frisch.zeilenIds
  ziel.ursprungIds = frisch.ursprungIds
  ziel.ursprungSpalten = frisch.ursprungSpalten
  ziel.spaltenZaehler = frisch.spaltenZaehler
}

/** Schlüssel einer Zelle für die Geändert-Markierung. */
function zellSchluessel(zeilenId: string, spalte: string): string {
  return `${zeilenId}${SCHLUESSEL_TRENNER}${spalte}`
}

/** Kanonische Textform eines Werts für den Vorschau-Vergleich (geändert?). */
function wertGleich(a: JsonWert | undefined, b: JsonWert | undefined): boolean {
  if (a === undefined || b === undefined) return a === b
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Setzt eine Zelle. Der Wert wird - wenn er wie eine Zahl, ein Wahrheitswert,
 * null oder leer aussieht - passend gedeutet, sonst als Text übernommen. Weicht
 * die Zelle von der Baseline ab, wird sie als geändert markiert, sonst die
 * Markierung entfernt. Zellen neuer/duplizierter Zeilen gelten nie als geändert
 * (die ganze Zeile ist bereits als neu markiert).
 */
export function setzeZelle(
  zustand: TabellenBearbeitung,
  index: number,
  spalte: string,
  roheingabe: string,
): void {
  const zeile = zustand.zeilen[index]
  if (zeile === undefined) return
  const wert = deuteWert(roheingabe)
  zeile[spalte] = wert
  zustand.zeilen = [...zustand.zeilen]

  const id = zustand.zeilenIds[index]
  if (zustand.neueZeilen.has(id)) return
  const schluessel = zellSchluessel(id, spalte)
  const basisWert = zustand.basisJeId.get(id)?.[spalte]
  if (wertGleich(wert, basisWert)) {
    zustand.geaenderteZellen.delete(schluessel)
  } else {
    zustand.geaenderteZellen.add(schluessel)
  }
}

/**
 * Deutet eine Rohtexteingabe in einen JsonWert. Leerer Text wird zu leerem
 * String (die Zelle bleibt vorhanden). "null", "true", "false" und reine Zahlen
 * werden als solche gedeutet; alles Übrige bleibt Text. Bewusst konservativ,
 * damit Bezeichner wie "007" nicht zu Zahlen werden.
 */
function deuteWert(text: string): JsonWert {
  if (text === '') return ''
  if (text === 'null') return null
  if (text === 'true') return true
  if (text === 'false') return false
  if (/^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(text)) {
    const zahl = Number(text)
    if (Number.isFinite(zahl) && String(zahl) === text) return zahl
  }
  return text
}

/** Setzt den Anzeigenamen einer Spalte (Umbenennung des Schlüssels beim Übernehmen). */
export function setzeKopf(
  zustand: TabellenBearbeitung,
  spalte: string,
  neuerName: string,
): void {
  const bereinigt = neuerName.trim()
  if (bereinigt === '' || bereinigt === spalte) {
    const { [spalte]: _weg, ...rest } = zustand.umbenennung
    zustand.umbenennung = rest
  } else {
    zustand.umbenennung = { ...zustand.umbenennung, [spalte]: bereinigt }
  }
}

/** Der wirksame (Anzeige-)Name einer Spalte: die Umbenennung, sonst der Rohname. */
export function kopfName(zustand: TabellenBearbeitung, spalte: string): string {
  const name = zustand.umbenennung[spalte]
  return name !== undefined && name.trim() !== '' ? name : spalte
}

/** Dupliziert eine Zeile (Kopie direkt darunter, als neue Zeile markiert). */
export function zeileDuplizieren(zustand: TabellenBearbeitung, index: number): void {
  const zeile = zustand.zeilen[index]
  if (zeile === undefined) return
  const id = crypto.randomUUID()
  zustand.zeilen = [
    ...zustand.zeilen.slice(0, index + 1),
    kopiereZeile(zeile),
    ...zustand.zeilen.slice(index + 1),
  ]
  zustand.zeilenIds = [
    ...zustand.zeilenIds.slice(0, index + 1),
    id,
    ...zustand.zeilenIds.slice(index + 1),
  ]
  zustand.neueZeilen.add(id)
}

/** Löscht eine Zeile samt ihrer Vorschau-Markierungen. */
export function zeileLoeschen(zustand: TabellenBearbeitung, index: number): void {
  const id = zustand.zeilenIds[index]
  if (id === undefined) return
  zustand.zeilen = zustand.zeilen.filter((_, i) => i !== index)
  zustand.zeilenIds = zustand.zeilenIds.filter((_, i) => i !== index)
  zustand.neueZeilen.delete(id)
  const praefix = `${id}${SCHLUESSEL_TRENNER}`
  for (const schluessel of [...zustand.geaenderteZellen]) {
    if (schluessel.startsWith(praefix)) zustand.geaenderteZellen.delete(schluessel)
  }
}

/** Hängt eine neue, leere Zeile an (alle Spalten leerer String), als neu markiert. */
export function zeileHinzufuegen(zustand: TabellenBearbeitung): void {
  const id = crypto.randomUUID()
  const neu: TabellenZeile = {}
  for (const spalte of zustand.spaltenReihenfolge) neu[spalte] = ''
  zustand.zeilen = [...zustand.zeilen, neu]
  zustand.zeilenIds = [...zustand.zeilenIds, id]
  zustand.neueZeilen.add(id)
}

/** Freien Rohnamen für eine neue Spalte finden (kollisionsfrei). */
function freierSpaltenname(zustand: TabellenBearbeitung, wunsch: string): string {
  const vorhanden = new Set(zustand.spaltenReihenfolge)
  if (!vorhanden.has(wunsch)) return wunsch
  let n = zustand.spaltenZaehler + 1
  let name = `${wunsch}_${n}`
  while (vorhanden.has(name)) {
    n += 1
    name = `${wunsch}_${n}`
  }
  zustand.spaltenZaehler = n
  return name
}

/** Dupliziert eine Spalte (neuer Rohname direkt dahinter, Werte kopiert). */
export function spalteDuplizieren(zustand: TabellenBearbeitung, spalte: string): void {
  const index = zustand.spaltenReihenfolge.indexOf(spalte)
  if (index === -1) return
  const neuName = freierSpaltenname(zustand, `${kopfName(zustand, spalte)}_kopie`)
  zustand.spaltenReihenfolge = [
    ...zustand.spaltenReihenfolge.slice(0, index + 1),
    neuName,
    ...zustand.spaltenReihenfolge.slice(index + 1),
  ]
  zustand.zeilen = zustand.zeilen.map((zeile) => {
    const kopie = kopiereZeile(zeile)
    const wert = zeile[spalte]
    kopie[neuName] = wert === undefined ? (undefined as never) : strukturKopie(wert)
    return kopie
  })
}

/** Löscht eine Spalte aus Reihenfolge, Zeilen und Umbenennung. */
export function spalteLoeschen(zustand: TabellenBearbeitung, spalte: string): void {
  zustand.spaltenReihenfolge = zustand.spaltenReihenfolge.filter((s) => s !== spalte)
  zustand.zeilen = zustand.zeilen.map((zeile) => {
    const { [spalte]: _weg, ...rest } = zeile
    return rest
  })
  const { [spalte]: _wegName, ...restNamen } = zustand.umbenennung
  zustand.umbenennung = restNamen
  const suffix = `${SCHLUESSEL_TRENNER}${spalte}`
  for (const schluessel of [...zustand.geaenderteZellen]) {
    if (schluessel.endsWith(suffix)) zustand.geaenderteZellen.delete(schluessel)
  }
}

/** Hängt eine neue, leere Spalte an (Rohname "spalte", kollisionsfrei). */
export function spalteHinzufuegen(zustand: TabellenBearbeitung): string {
  const neuName = freierSpaltenname(zustand, 'spalte')
  zustand.spaltenReihenfolge = [...zustand.spaltenReihenfolge, neuName]
  zustand.zeilen = zustand.zeilen.map((zeile) => ({ ...zeile, [neuName]: '' }))
  return neuName
}

/** Setzt die Spaltenreihenfolge neu (Drag-and-Drop). Unbekannte Namen werden ignoriert. */
export function spaltenReihenfolgeSetzen(
  zustand: TabellenBearbeitung,
  reihenfolge: string[],
): void {
  const vorhanden = new Set(zustand.spaltenReihenfolge)
  const gefiltert = reihenfolge.filter((s) => vorhanden.has(s))
  const bekannt = new Set(gefiltert)
  const rest = zustand.spaltenReihenfolge.filter((s) => !bekannt.has(s))
  zustand.spaltenReihenfolge = [...gefiltert, ...rest]
}

/**
 * Ersetzt die Zeilen komplett (z. B. nach Duplikat-Entfernung). Zeilen, Ids und
 * die Neu-Marken werden neu gesetzt; die Baseline je Id und die Ursprungswerte
 * bleiben unangetastet (deshalb zählt eine entfernte Zeile weiter als Änderung).
 */
export function ersetzeZeilen(
  zustand: TabellenBearbeitung,
  neueZeilen: TabellenZeile[],
  neueIds: string[],
  neueMarken: SvelteSet<string>,
): void {
  zustand.zeilen = neueZeilen
  zustand.zeilenIds = neueIds
  zustand.neueZeilen = neueMarken
}

/**
 * Zahl der offenen Änderungen als Summe der sichtbaren Vorschau-Wirkungen:
 * geänderte Zellen + neue/duplizierte Zeilen + gelöschte Zeilen +
 * Spaltenumbenennungen + Spalten-Delta (hinzugefügte und entfernte Spalten
 * gegenüber dem Ursprung).
 */
export function anzahlAenderungen(zustand: TabellenBearbeitung): number {
  const aktuelleIds = new Set(zustand.zeilenIds)
  const geloeschte = zustand.ursprungIds.filter((id) => !aktuelleIds.has(id)).length

  const aktuelleSpalten = new Set(zustand.spaltenReihenfolge)
  const ursprungSpalten = new Set(zustand.ursprungSpalten)
  let spaltenDelta = 0
  for (const spalte of aktuelleSpalten) if (!ursprungSpalten.has(spalte)) spaltenDelta += 1
  for (const spalte of ursprungSpalten) if (!aktuelleSpalten.has(spalte)) spaltenDelta += 1

  return (
    zustand.geaenderteZellen.size +
    zustand.neueZeilen.size +
    geloeschte +
    Object.keys(zustand.umbenennung).length +
    spaltenDelta
  )
}

/** Wahr, wenn die Zelle gegenüber der Baseline geändert (Vorschau) ist. */
export function istZelleGeaendert(
  zustand: TabellenBearbeitung,
  index: number,
  spalte: string,
): boolean {
  const id = zustand.zeilenIds[index]
  if (id === undefined) return false
  return zustand.geaenderteZellen.has(zellSchluessel(id, spalte))
}

/** Wahr, wenn die Zeile neu oder dupliziert ist (Vorschau). */
export function istZeileNeu(zustand: TabellenBearbeitung, index: number): boolean {
  const id = zustand.zeilenIds[index]
  if (id === undefined) return false
  return zustand.neueZeilen.has(id)
}

/**
 * Verwirft alle offenen Änderungen des Tabs. Ist die Quelle bekannt, wird der
 * bestehende (reaktive) Zustand in-place aus ihr frisch aufgebaut - so wirkt das
 * Verwerfen sofort in der Ansicht. Ohne Quelle wird der Eintrag gelöscht (der
 * nächste Zugriff baut dann neu).
 */
export function verwerfen(tabId: string, wurzel?: JsonWert, spalten?: string[]): void {
  const vorhanden = zustaende.get(tabId)
  if (vorhanden !== undefined && wurzel !== undefined && spalten !== undefined) {
    setzeInPlace(vorhanden, baueNeu(wurzel, spalten))
    return
  }
  zustaende.delete(tabId)
}
