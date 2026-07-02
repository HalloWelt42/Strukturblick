// Sprach-Extension je Format: liefert die passende CodeMirror-Sprachunterstützung
// für das erkannte Dokumentformat. Formate ohne eigene Unterstützung (CSV,
// Tabellen-Formate, unbekannt) laufen als Klartext.

import { json } from '@codemirror/lang-json'
import { xml } from '@codemirror/lang-xml'
import { yaml } from '@codemirror/lang-yaml'
import { StreamLanguage } from '@codemirror/language'
import { toml } from '@codemirror/legacy-modes/mode/toml'
import type { Extension } from '@codemirror/state'

import type { FormatId } from '../../api/typen'

/** Sprach-Extension für das Format; Klartext (leere Extension) als Fallback. */
export function sprachExtension(format: FormatId | null): Extension {
  switch (format) {
    case 'json':
    case 'ndjson':
      return json()
    case 'yaml':
      return yaml()
    case 'xml':
      return xml()
    case 'toml':
      return StreamLanguage.define(toml)
    default:
      return []
  }
}
