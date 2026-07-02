// Darstellungshelfer für Formate: Datei-Icon und Großbuchstaben-Kürzel.
// Wird von Tab-Leiste, Dokumentliste und Statusleiste gemeinsam genutzt.

import type { FormatId } from '../api/typen'

/** Icon-Klasse ohne Stil-Präfix, zum Beispiel "fa-file-code". */
export function iconFuerFormat(format: FormatId | null): string {
  switch (format) {
    case 'json':
    case 'ndjson':
    case 'xml':
      return 'fa-file-code'
    case 'csv':
      return 'fa-table'
    case 'yaml':
    case 'toml':
      return 'fa-file-lines'
    default:
      return 'fa-file'
  }
}

/** Großbuchstaben-Kürzel wie in den Mockup-Abzeichen, zum Beispiel "JSON". */
export function formatKuerzel(format: FormatId): string {
  return format.toUpperCase()
}
