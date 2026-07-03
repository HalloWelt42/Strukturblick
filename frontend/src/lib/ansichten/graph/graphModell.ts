// Aufbau des Graph-Teilbaums aus einem JSON-Wertebaum. Reine Funktionen ohne
// DOM-Bezug, direkt testbar. Die Graph-Ansicht zeigt Werte als Knoten und
// Eltern-Kind-Beziehungen als Kanten. Bei großen Dokumenten wäre der volle
// Graph unlesbar, darum arbeitet die Ansicht im Fokus-Modus: ausgehend von
// einem Startpfad wird breit-zuerst gesammelt, bis eine Knoten-Obergrenze
// erreicht ist. So bleibt das Bild handhabbar und die Auswahl im Zentrum.

import type { JsonWert } from '../../api/typen'
import { elternPointer, kindPointer, segmenteAusPointer } from '../../dienste/pfade'
import { kurzVorschau, typVon, wertAnPfad, type WertTyp } from '../../dienste/wertZugriff'

/** Ein Knoten des Graphen: Adresse, Beschriftung, Typ und Vorschau. */
export interface GraphKnotenModell {
  /** JSON-Pointer des Knotens (die Wurzel ist ""). */
  pfad: string
  /** Titel-Beschriftung: Schlüssel, Index[n] oder "$" für die Wurzel. */
  beschriftung: string
  typ: WertTyp
  /** Kurzvorschau des Werts für die Karten-Zeile. */
  vorschau: string
  /** Zusatz rechts (z. B. "7 Schlüssel", "2 Einträge"); leer bei Skalaren. */
  zusatz: string
}

/** Eine Kante: verbindet Eltern- und Kind-Pfad. */
export interface GraphKanteModell {
  quelle: string
  ziel: string
}

/** Ergebnis des Aufbaus samt Zählern für den Kapp-Hinweis. */
export interface GraphModell {
  knoten: GraphKnotenModell[]
  kanten: GraphKanteModell[]
  /** Gesamtzahl der Knoten im (Teil-)Baum, auch der nicht gezeigten. */
  gesamt: number
  /** true, wenn wegen der Obergrenze nicht alle Knoten gezeigt werden. */
  gekappt: boolean
}

/** Beschriftung eines Knotens aus seinem letzten Pfad-Segment. */
function beschriftungAus(pfad: string): string {
  if (pfad === '') return '$'
  const segmente = segmenteAusPointer(pfad)
  const letztes = segmente[segmente.length - 1] ?? ''
  // Reine Zahl = Listen-Index -> "[n]", sonst der Schlüsselname.
  return /^(0|[1-9][0-9]*)$/.test(letztes) ? `[${letztes}]` : letztes
}

/** Direkte Kind-Pfade eines Container-Werts (Objekt-Schlüssel bzw. Indizes). */
function kindPfade(pfad: string, wert: JsonWert): string[] {
  if (Array.isArray(wert)) {
    return wert.map((_, index) => kindPointer(pfad, index))
  }
  if (wert !== null && typeof wert === 'object') {
    return Object.keys(wert).map((schluessel) => kindPointer(pfad, schluessel))
  }
  return []
}

/** Anzahl direkter Unterelemente eines Container-Werts. */
function kindAnzahl(wert: JsonWert): number {
  if (Array.isArray(wert)) return wert.length
  if (wert !== null && typeof wert === 'object') return Object.keys(wert).length
  return 0
}

/** Zusatztext rechts in der Karte je Container ("n Schlüssel" / "n Einträge"). */
function zusatzFuer(wert: JsonWert): string {
  if (Array.isArray(wert)) {
    const n = wert.length
    return `${n} ${n === 1 ? 'Eintrag' : 'Einträge'}`
  }
  if (wert !== null && typeof wert === 'object') {
    const n = Object.keys(wert).length
    return `${n} ${n === 1 ? 'Schlüssel' : 'Schlüssel'}`
  }
  return ''
}

/** Baut ein Knoten-Modell für genau einen Pfad. */
function knotenFuer(wurzel: JsonWert, pfad: string): GraphKnotenModell | null {
  const wert = wertAnPfad(wurzel, pfad)
  if (wert === undefined) return null
  const typ = typVon(wert)
  const istContainer = typ === 'objekt' || typ === 'liste'
  return {
    pfad,
    beschriftung: beschriftungAus(pfad),
    typ,
    vorschau: istContainer ? (typ === 'liste' ? '[ ]' : '{ }') : kurzVorschau(wert, 28),
    zusatz: zusatzFuer(wert),
  }
}

/**
 * Zählt alle Knoten im Teilbaum ab startPfad (der Startknoten inklusive).
 * Iterativ, damit sehr große oder tiefe Dokumente den Stack nicht sprengen.
 */
function knotenImTeilbaum(wurzel: JsonWert, startPfad: string): number {
  const start = wertAnPfad(wurzel, startPfad)
  if (start === undefined) return 0
  let anzahl = 0
  const stapel: { pfad: string; wert: JsonWert }[] = [{ pfad: startPfad, wert: start }]
  while (stapel.length > 0) {
    const { pfad, wert } = stapel.pop() as { pfad: string; wert: JsonWert }
    anzahl += 1
    for (const kindPfad of kindPfade(pfad, wert)) {
      const kind = wertAnPfad(wurzel, kindPfad)
      if (kind !== undefined) stapel.push({ pfad: kindPfad, wert: kind })
    }
  }
  return anzahl
}

/**
 * Sammelt breit-zuerst ab startPfad bis zur Obergrenze. Gibt die aufgenommenen
 * Pfade in Besuchsreihenfolge sowie die Gesamtzahl im Teilbaum zurück.
 */
function sammleBreit(
  wurzel: JsonWert,
  startPfad: string,
  grenze: number,
): { pfade: string[]; gesamt: number } {
  const gesamt = knotenImTeilbaum(wurzel, startPfad)
  const aufgenommen: string[] = []
  const warteschlange: string[] = [startPfad]
  const gesehen = new Set<string>([startPfad])
  while (warteschlange.length > 0 && aufgenommen.length < grenze) {
    const pfad = warteschlange.shift() as string
    const wert = wertAnPfad(wurzel, pfad)
    if (wert === undefined) continue
    aufgenommen.push(pfad)
    for (const kindPfad of kindPfade(pfad, wert)) {
      if (gesehen.has(kindPfad)) continue
      gesehen.add(kindPfad)
      warteschlange.push(kindPfad)
    }
  }
  return { pfade: aufgenommen, gesamt }
}

/**
 * Baut den Graphen ab startPfad. Es wird die Vorfahren-Kette vom Startknoten
 * bis zur Wurzel mit aufgenommen (damit der Kontext sichtbar bleibt), dann ab
 * dem Startknoten breit-zuerst bis zur Obergrenze. Kanten entstehen zwischen
 * je aufgenommenem Knoten und seinem aufgenommenen Elternteil.
 *
 * @param wurzel   Der komplette Wertebaum des Dokuments.
 * @param startPfad JSON-Pointer, ab dem fokussiert wird ("" = Wurzel).
 * @param grenze   Höchstzahl gezeigter Knoten.
 */
export function baueGraphModell(
  wurzel: JsonWert,
  startPfad: string,
  grenze: number,
): GraphModell {
  const start = wertAnPfad(wurzel, startPfad)
  if (start === undefined) {
    return { knoten: [], kanten: [], gesamt: 0, gekappt: false }
  }

  // Vorfahren-Kette (Wurzel zuerst) bis zum Startknoten - immer sichtbar.
  const vorfahren: string[] = []
  let lauf: string | null = elternPointer(startPfad)
  while (lauf !== null) {
    vorfahren.unshift(lauf)
    lauf = elternPointer(lauf)
  }

  // Für die Vorfahren-Kette bleibt weniger Budget für den Teilbaum.
  const teilbaumGrenze = Math.max(1, grenze - vorfahren.length)
  const { pfade: teilbaum, gesamt } = sammleBreit(wurzel, startPfad, teilbaumGrenze)

  const sichtbar = [...vorfahren, ...teilbaum]
  const sichtbarSet = new Set(sichtbar)

  const knoten: GraphKnotenModell[] = []
  for (const pfad of sichtbar) {
    const modell = knotenFuer(wurzel, pfad)
    if (modell !== null) knoten.push(modell)
  }

  const kanten: GraphKanteModell[] = []
  for (const pfad of sichtbar) {
    if (pfad === '') continue
    const eltern = elternPointer(pfad)
    if (eltern !== null && sichtbarSet.has(eltern)) {
      kanten.push({ quelle: eltern, ziel: pfad })
    }
  }

  // Gekappt, wenn der Teilbaum mehr Knoten enthält als aufgenommen wurden.
  const gekappt = teilbaum.length < gesamt
  return { knoten, kanten, gesamt, gekappt }
}

/** Gesamtzahl der Knoten im ganzen Dokument (ab der Wurzel). */
export function knotenGesamt(wurzel: JsonWert): number {
  return knotenImTeilbaum(wurzel, '')
}
