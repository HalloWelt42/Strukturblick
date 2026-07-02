// Dateien in Tabs öffnen - gemeinsame Logik für die Willkommensfläche und die
// Dokumentverwaltung. Die Größenprüfung nutzt die eingestellten Grenzen; ob bei
// einer Warnung dennoch geladen wird, entscheidet der übergebene frageNach-
// Rückruf (ein eigenes Bestätigungsfeld je Aufrufer, kein Browser-Dialog).

import type { SpeicherDokument } from '../speicher/dokumente'
import { ablehnungAbBytes } from '../speicher/einstellungenSpeicher'
import { oeffneTab, setzeAktiv, tabs } from '../zustand/tabs.svelte'
import { zeige } from '../zustand/toaster.svelte'
import { sofortAnalysieren } from './analyseDienst'
import {
  groessenUrteil,
  liesDatei,
  oeffneDateien,
  type GeleseneDatei,
} from './dateiEinAusgabe'
import { formatAusDateiname } from './formatErkennung'
import { alsMbText, menschenlesbareGroesse } from './groessenFormat'

/** Rückfrage bei großen Dateien; liefert true, wenn dennoch geladen werden soll. */
export type FrageNach = (frage: string) => Promise<boolean>

/** Prüft die Größe je Datei, öffnet Tabs und stößt die Analyse an. */
export async function verarbeiteDateien(
  dateien: GeleseneDatei[],
  frageNach: FrageNach,
): Promise<void> {
  for (const datei of dateien) {
    const urteil = await groessenUrteil(datei.groesse)
    if (urteil === 'ablehnen') {
      const grenze = await ablehnungAbBytes()
      zeige(
        `"${datei.name}" ist zu groß - die Grenze liegt bei ${menschenlesbareGroesse(grenze)}.`,
        'fehler',
      )
      continue
    }
    if (urteil === 'warnen') {
      const laden = await frageNach(`Die Datei ist ${alsMbText(datei.groesse)} MB groß. Trotzdem laden?`)
      if (!laden) continue
    }
    const base64 = datei.base64
    const tabId = oeffneTab({
      titel: datei.name,
      // Bei binären Dokumenten trägt der Inhalt die Base64-Zeichenkette.
      inhalt: base64 !== undefined ? base64 : datei.text,
      format: formatAusDateiname(datei.name),
      istBinaer: base64 !== undefined,
    })
    void sofortAnalysieren(tabId)
  }
}

/** Öffnet den Dateiauswahl-Dialog und lädt die gewählten Dateien. */
export async function oeffneUeberDialog(frageNach: FrageNach): Promise<void> {
  const dateien = await oeffneDateien()
  await verarbeiteDateien(dateien, frageNach)
}

/** Liest per Drag-und-Drop übergebene Dateien und lädt sie. */
export async function verarbeiteAbgelegte(
  dateiListe: FileList | File[],
  frageNach: FrageNach,
): Promise<void> {
  const dateien = Array.from(dateiListe)
  if (dateien.length === 0) return
  const gelesen = await Promise.all(dateien.map(liesDatei))
  await verarbeiteDateien(gelesen, frageNach)
}

/** Öffnet ein gespeichertes Dokument als Tab; ist es schon offen, wird sein Tab aktiv. */
export function oeffneGespeichertesDokument(dokument: SpeicherDokument): void {
  const vorhanden = tabs.liste.find((tab) => tab.dokumentId === dokument.id)
  if (vorhanden !== undefined) {
    setzeAktiv(vorhanden.id)
    return
  }
  const tabId = oeffneTab({
    titel: dokument.titel,
    inhalt: dokument.inhalt,
    format: dokument.format,
    dokumentId: dokument.id,
  })
  void sofortAnalysieren(tabId)
}

/** Öffnet den Inhalt der Zwischenablage als neuen Tab. */
export async function ausZwischenablageOeffnen(): Promise<void> {
  let inhalt = ''
  try {
    inhalt = await navigator.clipboard.readText()
  } catch {
    zeige('Die Zwischenablage konnte nicht gelesen werden.', 'fehler')
    return
  }
  if (inhalt === '') {
    zeige('Die Zwischenablage ist leer.', 'info')
    return
  }
  const tabId = oeffneTab({ titel: 'zwischenablage', inhalt })
  void sofortAnalysieren(tabId)
}
