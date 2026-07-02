// Das Drehkreuz der Ansichten-Kopplung: die aktuell selektierte Pfad-Adresse
// samt Herkunft. Baum, Editor, Diagnose, Brotkrumen und Inspektor schreiben
// alle über setzeSelektion hierher.
//
// Schleifenschutz-Konvention (keine Flags): jede Ansicht reagiert per $effect
// NUR auf fremde Quellen - wer selektion.aktuell.quelle === eigeneQuelle
// liest, ignoriert das Ereignis, denn es stammt von ihm selbst. Der zaehler
// steigt bei jedem setzeSelektion und erzwingt so Effekte auch dann, wenn
// derselbe Pfad erneut angeklickt wird (zum Beispiel erneutes Zentrieren im
// Editor).

export type SelektionsQuelle =
  | 'baum'
  | 'editor'
  | 'diagnose'
  | 'brotkrumen'
  | 'inspektor'
  | 'tabelle'
  | 'suche'

export interface PfadSelektion {
  tabId: string
  /** JSON-Pointer des selektierten Knotens; null bedeutet: nichts selektiert. */
  pfad: string | null
  quelle: SelektionsQuelle
  zaehler: number
}

export const selektion = $state<{ aktuell: PfadSelektion | null }>({
  aktuell: null,
})

let zaehler = 0

/** Setzt die Selektion und erhöht den Zähler (erzwingt Effekte bei erneutem Klick). */
export function setzeSelektion(eingabe: {
  tabId: string
  pfad: string | null
  quelle: SelektionsQuelle
}): void {
  zaehler += 1
  selektion.aktuell = {
    tabId: eingabe.tabId,
    pfad: eingabe.pfad,
    quelle: eingabe.quelle,
    zaehler,
  }
}
