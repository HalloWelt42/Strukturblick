// Anzeige-Zustand der Tabellen-Ansicht je Tab: Spalten-Reihenfolge, versteckte
// Spalten, Umbenennungen (Anzeigenamen) und Wert-Übersetzungstabellen. Der
// Zustand lebt getrennt von den Tabs, weil er rein die Darstellung betrifft und
// jederzeit aus dem Dokument neu ableitbar ist.
//
// Der Zustand hängt am Spaltensatz des Dokuments: Wechselt dieser (anderes
// Dokument, neu geparst mit anderem Trenner), so wird abgeglichen - verschwundene
// Spalten fallen aus der Reihenfolge, neu erschienene Spalten werden hinten
// angehängt. Umbenennungen und Wert-Karten verschwundener Spalten bleiben
// unangetastet erhalten (schadlos, weil sie ins Leere zeigen), damit ein kurzer
// Spaltenwechsel keine Einstellungen wegwirft.

import { SvelteSet } from 'svelte/reactivity'

export interface TabellenAnsichtZustand {
  /** Spalten in Anzeige-Reihenfolge (alle Spalten, auch versteckte). */
  spaltenReihenfolge: string[]
  /** Verborgene Spalten (Rohname als Schlüssel). */
  versteckt: SvelteSet<string>
  /** Rohname der Spalte -> Anzeigename (leer/fehlt = Rohname). */
  umbenennung: Record<string, string>
  /** Rohname der Spalte -> (Rohwert -> Ersatzwert). Leer = unverändert. */
  wertKarten: Record<string, Record<string, string>>
}

const zustaende = new Map<string, TabellenAnsichtZustand>()

/**
 * Liefert den (reaktiven) Tabellen-Zustand des Tabs und gleicht ihn zugleich
 * mit dem aktuellen Spaltensatz ab. Beim ersten Zugriff wird die Reihenfolge
 * aus den Spalten übernommen; danach werden nur Abweichungen nachgezogen.
 */
export function tabellenZustandFuer(tabId: string, spalten: string[]): TabellenAnsichtZustand {
  const vorhanden = zustaende.get(tabId)
  if (vorhanden === undefined) {
    const neu = $state<TabellenAnsichtZustand>({
      spaltenReihenfolge: [...spalten],
      versteckt: new SvelteSet<string>(),
      umbenennung: {},
      wertKarten: {},
    })
    zustaende.set(tabId, neu)
    return neu
  }
  gleicheSpaltenAb(vorhanden, spalten)
  return vorhanden
}

/**
 * Zieht die Reihenfolge auf den aktuellen Spaltensatz nach: entfernt Spalten,
 * die es nicht mehr gibt, und hängt neu erschienene hinten an. Bereits
 * versteckte, aber noch vorhandene Spalten bleiben versteckt.
 */
function gleicheSpaltenAb(zustand: TabellenAnsichtZustand, spalten: string[]): void {
  const vorhandeneMenge = new Set(spalten)
  const gefiltert = zustand.spaltenReihenfolge.filter((spalte) => vorhandeneMenge.has(spalte))
  const bekannt = new Set(gefiltert)
  const angehaengt = spalten.filter((spalte) => !bekannt.has(spalte))
  const neueReihenfolge = [...gefiltert, ...angehaengt]
  // Nur bei echter Abweichung ersetzen, um überflüssige Reaktivität zu meiden.
  if (
    neueReihenfolge.length !== zustand.spaltenReihenfolge.length ||
    neueReihenfolge.some((spalte, index) => spalte !== zustand.spaltenReihenfolge[index])
  ) {
    zustand.spaltenReihenfolge = neueReihenfolge
  }
  // Versteckt-Menge von verschwundenen Spalten befreien.
  for (const spalte of zustand.versteckt) {
    if (!vorhandeneMenge.has(spalte)) zustand.versteckt.delete(spalte)
  }
}

/** Schaltet die Sichtbarkeit einer Spalte um (sichtbar <-> versteckt). */
export function schalteSichtbar(zustand: TabellenAnsichtZustand, spalte: string): void {
  if (zustand.versteckt.has(spalte)) {
    zustand.versteckt.delete(spalte)
  } else {
    zustand.versteckt.add(spalte)
  }
}

/** Verschiebt eine Spalte in der Reihenfolge um einen Schritt (-1 hoch, +1 runter). */
export function verschiebeSpalte(
  zustand: TabellenAnsichtZustand,
  spalte: string,
  richtung: -1 | 1,
): void {
  const index = zustand.spaltenReihenfolge.indexOf(spalte)
  if (index === -1) return
  const ziel = index + richtung
  if (ziel < 0 || ziel >= zustand.spaltenReihenfolge.length) return
  const kopie = [...zustand.spaltenReihenfolge]
  const [entnommen] = kopie.splice(index, 1)
  kopie.splice(ziel, 0, entnommen)
  zustand.spaltenReihenfolge = kopie
}

/** Setzt den Anzeigenamen einer Spalte; leerer/gleicher Name entfernt die Umbenennung. */
export function setzeAnzeigename(
  zustand: TabellenAnsichtZustand,
  spalte: string,
  name: string,
): void {
  const bereinigt = name.trim()
  if (bereinigt === '' || bereinigt === spalte) {
    const { [spalte]: _weg, ...rest } = zustand.umbenennung
    zustand.umbenennung = rest
  } else {
    zustand.umbenennung = { ...zustand.umbenennung, [spalte]: bereinigt }
  }
}

/**
 * Setzt den Ersatzwert eines Rohwerts in einer Spalte; leerer Ersatz entfernt
 * den Eintrag (Rohwert bleibt dann unverändert).
 */
export function setzeWertErsatz(
  zustand: TabellenAnsichtZustand,
  spalte: string,
  rohwert: string,
  ersatz: string,
): void {
  const karteAlt = zustand.wertKarten[spalte] ?? {}
  const karteNeu = { ...karteAlt }
  if (ersatz === '') {
    delete karteNeu[rohwert]
  } else {
    karteNeu[rohwert] = ersatz
  }
  if (Object.keys(karteNeu).length === 0) {
    const { [spalte]: _weg, ...rest } = zustand.wertKarten
    zustand.wertKarten = rest
  } else {
    zustand.wertKarten = { ...zustand.wertKarten, [spalte]: karteNeu }
  }
}
