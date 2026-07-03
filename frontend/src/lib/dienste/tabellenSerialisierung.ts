// Serialisiert das editierbare Zeilenmodell in ein Zielformat. Client-nahe
// Formate (json, ndjson) entstehen direkt hier; alle übrigen Textformate laufen
// über den Konvertierungs-Endpunkt, wobei stets zuerst JSON als Zwischenformat
// gebaut wird. Das binäre Format xlsx ist nur ein Importformat und wird nicht
// geschrieben - dafür gibt es einen klaren Fehler.

import type { FormatId, JsonWert } from '../api/typen'
import { konvertiere } from '../api/transform'
import { wurzelAusZeilen, type TabellenZeile } from './tabellenZeilen'

/** Fehler beim Serialisieren der Tabelle in ein Zielformat. */
export class SerialisierungsFehler extends Error {
  constructor(meldung: string) {
    super(meldung)
    this.name = 'SerialisierungsFehler'
  }
}

/**
 * Baut aus den Zeilen den Zieltext im gewählten Format.
 *
 * - json: JSON.stringify(wurzel, null, 2)
 * - ndjson: je Datensatz eine Zeile mit kompaktem JSON.stringify
 * - csv, yaml, toml, xml, md_tabelle, html_tabelle: über den Konvertierungs-
 *   Endpunkt; die Wurzel wird als JSON-Dokument gesendet und ins Zielformat
 *   konvertiert; zurück kommt der ergebnis_text.
 * - xlsx: nur Import - wirft SerialisierungsFehler (kein Text-Export möglich).
 *
 * Rein bezogen auf die Eingabe (kein globaler Zustand), aber netzabhängig für
 * die konvertierten Formate.
 */
export async function zeilenAlsText(
  zeilen: TabellenZeile[],
  spaltenReihenfolge: string[],
  format: FormatId,
): Promise<string> {
  const wurzel = wurzelAusZeilen(zeilen, spaltenReihenfolge)

  if (format === 'json') {
    return JSON.stringify(wurzel, null, 2)
  }

  if (format === 'ndjson') {
    const liste = Array.isArray(wurzel) ? (wurzel as JsonWert[]) : [wurzel]
    return liste.map((eintrag) => JSON.stringify(eintrag)).join('\n')
  }

  if (format === 'xlsx') {
    throw new SerialisierungsFehler(
      'Das Format XLSX kann nur gelesen, nicht geschrieben werden. ' +
        'Bitte ein Textformat wählen (zum Beispiel CSV).',
    )
  }

  const antwort = await konvertiere({
    dokument: { inhalt_text: JSON.stringify(wurzel), format_id: 'json' },
    ziel_format: format,
  })
  const text = antwort.ergebnis.inhalt_text
  if (text === null) {
    throw new SerialisierungsFehler(
      `Das Zielformat "${format}" hat keinen Text geliefert.`,
    )
  }
  return text
}
