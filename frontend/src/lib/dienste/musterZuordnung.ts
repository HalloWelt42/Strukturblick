// Ordnet Muster-Funde des Backends konkreten Baum-Pfaden zu. Die Funde
// beschreiben Pfad-Muster mit * für Listenindizes ("/bestellungen/*/id");
// hier wird geprüft, ob ein konkreter JSON-Pointer dazu passt, und welcher
// deutsche Kurzname als Abzeichen erscheint. Reine Funktionen, direkt testbar.

import type { MusterArt, MusterFund } from '../api/typen'
import { segmenteAusPointer } from './pfade'

/** Deutscher Kurzname je Muster-Art (Abzeichen in Baum und Statistik). */
export const MUSTER_NAME: Record<MusterArt, string> = {
  uuid: 'UUID',
  email: 'E-Mail',
  url: 'URL',
  iso_datum: 'Datum',
  iso_zeitstempel: 'Zeitstempel',
  base64: 'Base64',
  enum_kandidat: 'Enum-Kandidat',
}

/** Ein Segment gilt als Listen-Index, wenn es eine kanonische Zahl ist. */
function istIndexSegment(segment: string): boolean {
  return /^(0|[1-9][0-9]*)$/.test(segment)
}

/** Segmentweiser Vergleich; * im Muster passt auf numerische Segmente. */
export function passtPfadZuMuster(pfad: string, pfadMuster: string): boolean {
  const pfadSegmente = segmenteAusPointer(pfad)
  const musterSegmente = segmenteAusPointer(pfadMuster)
  if (pfadSegmente.length !== musterSegmente.length) return false
  return musterSegmente.every((muster, index) => {
    const segment = pfadSegmente[index]
    if (segment === undefined) return false
    return muster === '*' ? istIndexSegment(segment) : muster === segment
  })
}

/** Kurzname des ersten passenden Funds für den Pfad, sonst null. */
export function markeFuerPfad(pfad: string, funde: MusterFund[]): string | null {
  for (const fund of funde) {
    if (passtPfadZuMuster(pfad, fund.pfad_muster)) return MUSTER_NAME[fund.muster]
  }
  return null
}
