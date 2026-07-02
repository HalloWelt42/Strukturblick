// Reaktive KI-Einstellungen: Adresse des lokalen Sprachmodells und die gewählte
// Modell-Id. Beim Start aus dem Einstellungsspeicher (IndexedDB) geladen, jede
// Änderung wird persistiert. kontext() baut daraus den KiKontext, den jede
// KI-Anfrage als Pflichtteil mitträgt.

import type { KiKontext } from '../api/typen'
import { holeEinstellung, setzeEinstellung } from '../speicher/einstellungenSpeicher'

export const SCHLUESSEL_KI_BASIS_URL = 'kiBasisUrl'
export const SCHLUESSEL_KI_MODELL = 'kiModell'
export const SCHLUESSEL_KI_ANGEBOTEN = 'kiAngeboten'

export const STANDARD_KI_BASIS_URL = 'http://localhost:1234'
const STANDARD_TEMPERATUR = 0.2

export const kiEinstellungen = $state<{
  basisUrl: string
  /** Gewählte Modell-Id; null = automatisch (Adapter entscheidet). */
  modell: string | null
  /** Ob die KI-Funktionen überhaupt angeboten werden (auch bei erreichbarem Modell). */
  angeboten: boolean
}>({
  basisUrl: STANDARD_KI_BASIS_URL,
  modell: null,
  angeboten: true,
})

/** Lädt die gespeicherten Werte einmalig beim App-Start. */
export async function ladeKiEinstellungen(): Promise<void> {
  kiEinstellungen.basisUrl = await holeEinstellung(SCHLUESSEL_KI_BASIS_URL, STANDARD_KI_BASIS_URL)
  kiEinstellungen.modell = await holeEinstellung<string | null>(SCHLUESSEL_KI_MODELL, null)
  kiEinstellungen.angeboten = await holeEinstellung(SCHLUESSEL_KI_ANGEBOTEN, true)
}

/** Schaltet das Anbieten der KI-Funktionen um und persistiert die Wahl. */
export function setzeAngeboten(angeboten: boolean): void {
  kiEinstellungen.angeboten = angeboten
  void setzeEinstellung(SCHLUESSEL_KI_ANGEBOTEN, angeboten).catch((grund: unknown) => {
    console.error('KI-Verfügbarkeit konnte nicht gesichert werden:', grund)
  })
}

/** Setzt die Adresse des Sprachmodells und persistiert sie. */
export function setzeBasisUrl(basisUrl: string): void {
  kiEinstellungen.basisUrl = basisUrl
  void setzeEinstellung(SCHLUESSEL_KI_BASIS_URL, basisUrl).catch((grund: unknown) => {
    console.error('KI-Adresse konnte nicht gesichert werden:', grund)
  })
}

/** Setzt die Modellwahl (null = automatisch) und persistiert sie. */
export function setzeModell(modell: string | null): void {
  kiEinstellungen.modell = modell
  void setzeEinstellung(SCHLUESSEL_KI_MODELL, modell).catch((grund: unknown) => {
    console.error('KI-Modellwahl konnte nicht gesichert werden:', grund)
  })
}

/** Baut aus den aktuellen Einstellungen den KiKontext für eine KI-Anfrage. */
export function kontext(): KiKontext {
  return {
    basis_url: kiEinstellungen.basisUrl,
    modell: kiEinstellungen.modell,
    temperatur: STANDARD_TEMPERATUR,
  }
}
