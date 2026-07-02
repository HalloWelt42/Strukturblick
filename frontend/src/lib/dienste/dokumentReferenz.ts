// Kleiner, wiederverwendbarer Helfer, um aus einem offenen Tab eine
// Dokument-Referenz zu bauen und den 410-Cache-Fall zentral abzufangen.
//
// Fällt der Inhalts-Hash aus dem Server-Cache (TTL), antwortet das Backend mit
// dem Code "dokument_nicht_im_cache" (HTTP 410). mitRetry wiederholt den Aufruf
// dann genau einmal mit dem vollen Text - so muss kein Werkzeug dieses Muster
// selbst duplizieren.

import { ApiError } from '../api/http'
import type { DokumentReferenz } from '../api/typen'
import type { DokumentTab } from '../zustand/tabs.svelte'

/**
 * Baut aus dem Tab-Inhalt eine Volltext-Referenz. Binäre Dokumente (XLSX)
 * tragen ihren Inhalt als Base64, alle anderen als Text.
 */
function volleReferenz(tab: DokumentTab): DokumentReferenz {
  if (tab.istBinaer) {
    return { inhalt_base64: tab.inhalt, dateiname: tab.titel }
  }
  return { inhalt_text: tab.inhalt, dateiname: tab.titel }
}

/**
 * Bevorzugt den im Tab hinterlegten Inhalts-Hash (spart die erneute
 * Übertragung des Inhalts); ist noch kein Hash da, wird der volle Inhalt mit
 * Dateiname gesendet (Text bzw. Base64 bei binären Dokumenten).
 */
export function baueReferenz(tab: DokumentTab): DokumentReferenz {
  const hash = tab.analyse?.dokument_hash
  if (hash === undefined) {
    return volleReferenz(tab)
  }
  return { dokument_hash: hash }
}

/**
 * Ruft rufe mit der Referenz des Tabs auf. Ist der Hash nicht mehr im Cache
 * (HTTP 410, Code "dokument_nicht_im_cache"), wird der Aufruf einmalig mit dem
 * vollen Textinhalt wiederholt.
 */
export async function mitRetry<T>(
  tab: DokumentTab,
  rufe: (dokument: DokumentReferenz) => Promise<T>,
): Promise<T> {
  const referenz = baueReferenz(tab)
  if (referenz.dokument_hash === undefined) {
    return rufe(referenz)
  }
  try {
    return await rufe(referenz)
  } catch (grund: unknown) {
    if (grund instanceof ApiError && grund.code === 'dokument_nicht_im_cache') {
      return rufe(volleReferenz(tab))
    }
    throw grund
  }
}
