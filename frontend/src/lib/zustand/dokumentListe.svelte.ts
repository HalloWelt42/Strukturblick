// Reaktive Liste der gespeicherten Dokumente für die linke Seitenleiste.
// ladeNeu() liest die Bibliothek aus IndexedDB - beim Start und nach jedem
// Speichern oder Löschen aufrufen.

import { alleDokumente, type SpeicherDokument } from '../speicher/dokumente'

export const dokumentListe = $state<{ eintraege: SpeicherDokument[] }>({
  eintraege: [],
})

export async function ladeNeu(): Promise<void> {
  try {
    dokumentListe.eintraege = await alleDokumente()
  } catch (grund: unknown) {
    console.error('Dokumentliste konnte nicht geladen werden:', grund)
  }
}
