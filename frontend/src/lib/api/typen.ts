// TS-Spiegel der Backend-Modelle (backend/app/modelle/). Feldnamen exakt wie
// im Backend (snake_case) - Aenderungen dort zuerst, dann hier nachziehen.

/** Beliebiger JSON-Wert, entspricht JsonWert im Backend. */
export type JsonWert =
  | null
  | boolean
  | number
  | string
  | JsonWert[]
  | { [schluessel: string]: JsonWert }

export type FormatId =
  | 'json'
  | 'ndjson'
  | 'yaml'
  | 'toml'
  | 'xml'
  | 'csv'
  | 'xlsx'
  | 'md_tabelle'
  | 'html_tabelle'

/** Was ein Format ausdruecken kann bzw. ein Dokument tatsaechlich nutzt. */
export type Verlustaspekt =
  | 'kommentare'
  | 'anker'
  | 'attribute'
  | 'mixed_content'
  | 'typpraezision'
  | 'reihenfolge'
  | 'duplikate'
  | 'verschachtelung'
  | 'mehrere_tabellen'
  | 'zellformate'

export type Positionsgenauigkeit = 'zeile_spalte' | 'nur_zeile' | 'zelle' | 'keine'

/** Position im Quelltext. spalte 0 bzw. offset -1 bedeutet: unbekannt. */
export interface QuellPosition {
  zeile: number
  spalte: number
  offset: number
}

export interface QuellSpanne {
  start: QuellPosition
  ende: QuellPosition
}

/** Positionen eines Knotens (Konvention wie json-source-map). */
export interface KnotenSpannen {
  schluessel: QuellSpanne | null
  wert: QuellSpanne
}

/** Vom Nutzer uebersteuerbare Parse-Einstellungen (Request-Modell, alles optional). */
export interface ParseOptionen {
  tolerant?: boolean
  csv_trennzeichen?: string | null
  csv_encoding?: string | null
  csv_hat_kopfzeile?: boolean | null
}

/** Dokument per Wert (Text oder Base64) oder per Inhalts-Hash aus dem Cache. */
export interface DokumentReferenz {
  inhalt_text?: string | null
  inhalt_base64?: string | null
  dokument_hash?: string | null
  format_id?: FormatId | null
  dateiname?: string | null
  parse_optionen?: ParseOptionen
}

export interface ErkennungsErgebnis {
  format_id: FormatId
  konfidenz: number
  hinweise: string[]
}

export interface ErkennungsAntwort {
  kandidaten: ErkennungsErgebnis[]
}

/** Erkannter CSV-Dialekt - wird in der UI angezeigt und ist dort korrigierbar. */
export interface DialektInfo {
  trennzeichen: string
  anfuehrungszeichen: string
  encoding: string
  hat_kopfzeile: boolean
}

export interface ParseAntwort {
  dokument_hash: string
  format_id: FormatId
  wurzel: JsonWert
  /** JSON-Pointer -> Quelltext-Spannen */
  positionen: Record<string, KnotenSpannen>
  genutzte_aspekte: Verlustaspekt[]
  warnungen: string[]
  dialekt_info: DialektInfo | null
}

export interface CacheStatusAntwort {
  im_cache: boolean
}

export interface HealthAntwort {
  status: string
  version: string
}

/** Selbstauskunft einer Format-Engine aus dem Capabilities-Endpunkt. */
export interface FormatFaehigkeiten {
  format_id: FormatId
  name: string
  dateiendungen: string[]
  mime_typen: string[]
  kann_lesen: boolean
  kann_schreiben: boolean
  ist_tabellarisch: boolean
  ist_binaer: boolean
  positionsgenauigkeit: Positionsgenauigkeit
  traegt: Verlustaspekt[]
}

export interface KonvertierungsPaar {
  von: FormatId
  nach: FormatId
  moegliche_verluste: Verlustaspekt[]
}

export interface Limits {
  max_dokument_bytes: number
  cache_ttl_sekunden: number
}

export interface CapabilitiesAntwort {
  version: string
  formate: FormatFaehigkeiten[]
  konvertierungsmatrix: KonvertierungsPaar[]
  limits: Limits
}

/** Einheitliches Fehlermodell aller Endpunkte. */
export interface FehlerDetail {
  code: string
  meldung: string
  pfad: string | null
  position: QuellSpanne | null
  details: Record<string, JsonWert>
  request_id: string
}

export interface FehlerAntwort {
  fehler: FehlerDetail
}
