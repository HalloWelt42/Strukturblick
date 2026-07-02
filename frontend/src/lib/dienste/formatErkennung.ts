// Format-Hinweis aus dem Dateinamen - nur ein Anzeige-Vorschlag für die UI.
// Die echte Erkennung macht das Backend anhand des Inhalts.

import type { FormatId } from '../api/typen'

const ENDUNG_ZU_FORMAT: Record<string, FormatId> = {
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  ndjson: 'ndjson',
  jsonl: 'ndjson',
  yaml: 'yaml',
  yml: 'yaml',
  toml: 'toml',
  xml: 'xml',
  csv: 'csv',
  tsv: 'csv',
}

export function formatAusDateiname(name: string): FormatId | null {
  const punkt = name.lastIndexOf('.')
  if (punkt === -1 || punkt === name.length - 1) return null
  const endung = name.slice(punkt + 1).toLowerCase()
  return ENDUNG_ZU_FORMAT[endung] ?? null
}
