// TS-Spiegel der Backend-Modelle (backend/app/modelle/). Feldnamen exakt wie
// im Backend (snake_case) - Änderungen dort zuerst, dann hier nachziehen.

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

/** Was ein Format ausdrücken kann bzw. ein Dokument tatsächlich nutzt. */
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

/** Vom Nutzer übersteuerbare Parse-Einstellungen (Request-Modell, alles optional). */
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

// ----- Analyse (backend/app/modelle/analyse.py) ---------------------------

export type SchemaArt = 'json_schema' | 'table_schema'
export type SchemaQuellArt = 'json_schema' | 'xsd'
export type MusterArt =
  | 'uuid'
  | 'email'
  | 'url'
  | 'iso_datum'
  | 'iso_zeitstempel'
  | 'base64'
  | 'enum_kandidat'

export interface SchemaAnfrage {
  dokument: DokumentReferenz
  art?: SchemaArt
}

export interface SchemaAntwort {
  art: SchemaArt
  /** Im Backend intern schema_wert, über die API heißt das Feld "schema". */
  schema: JsonWert
  hinweise: string[]
}

export interface ValidierungsAnfrage {
  dokument: DokumentReferenz
  schema_art: SchemaQuellArt
  schema_dokument?: DokumentReferenz | null
  xsd_text?: string | null
}

export interface ValidierungsFehler {
  meldung: string
  pfad: string | null
  position: QuellSpanne | null
  schema_pfad: string | null
}

export interface ValidierungsAntwort {
  gueltig: boolean
  fehler: ValidierungsFehler[]
}

export interface StatistikAnfrage {
  dokument: DokumentReferenz
}

export interface SchluesselStat {
  schluessel: string
  anzahl: number
}

export interface HistogrammEimer {
  von: number
  bis: number
  anzahl: number
}

/** Histogramm der Zahlwerte eines Pfad-Musters (Listenindizes als *). */
export interface ZahlenHistogramm {
  pfad_muster: string
  minimum: number
  maximum: number
  eimer: HistogrammEimer[]
}

export interface TeilbaumGroesse {
  pfad: string
  knoten: number
  prozent: number
}

export interface StatistikAntwort {
  knoten_gesamt: number
  max_tiefe: number
  groesse_bytes: number
  typverteilung: Record<string, number>
  schluessel_haeufigkeit: SchluesselStat[]
  zahlen_histogramme: ZahlenHistogramm[]
  groessenanteile: TeilbaumGroesse[]
  dauer_ms: number
}

export interface MusterAnfrage {
  dokument: DokumentReferenz
  max_beispiele?: number
}

export interface MusterFund {
  pfad_muster: string
  muster: MusterArt
  abdeckung: number
  anzahl_werte: number
  beispiele: string[]
  enum_werte: string[] | null
}

export interface MusterAntwort {
  funde: MusterFund[]
}

// ----- Abfrage (backend/app/modelle/abfrage.py) ---------------------------

export type AbfrageSprache = 'jsonpath' | 'xpath' | 'volltext' | 'regex'

export interface AbfrageAnfrage {
  dokument: DokumentReferenz
  sprache: AbfrageSprache
  ausdruck: string
  max_treffer?: number
  nur_schluessel?: boolean
}

/** Ein einzelner Fundort: JSON-Pointer, Quelltext-Position, Wert und Kurztext. */
export interface Treffer {
  pfad: string
  position: QuellSpanne | null
  wert: JsonWert
  kontext: string
}

export interface AbfrageAntwort {
  treffer: Treffer[]
  anzahl: number
  abgeschnitten: boolean
  sprache: AbfrageSprache
}

// ----- Transformation (backend/app/modelle/transform.py) -------------------

/** Optionen für die Serialisierung ins Zielformat (Request-Modell). */
export interface SerialisierungsOptionen {
  einrueckung: number
  sortiere_schluessel: boolean
  csv_trennzeichen: string
}

/** Serialisiertes Ergebnis: Text oder (bei binären Zielen) Base64. */
export interface SerialisierungsErgebnis {
  inhalt_text: string | null
  inhalt_base64: string | null
  warnungen: string[]
}

/** Ein bei der Konvertierung verlorener Aspekt samt verständlicher Meldung. */
export interface VerlustHinweis {
  aspekt: Verlustaspekt
  meldung: string
  betroffene_pfade: string[]
}

export interface KonvertierAnfrage {
  dokument: DokumentReferenz
  ziel_format: FormatId
  optionen?: SerialisierungsOptionen
}

export interface KonvertierAntwort {
  ergebnis: SerialisierungsErgebnis
  verluste: VerlustHinweis[]
  ziel_format: FormatId
}

export interface DiffAnfrage {
  links: DokumentReferenz
  rechts: DokumentReferenz
  ignoriere_reihenfolge?: boolean
}

export type DiffArt = 'hinzugefuegt' | 'entfernt' | 'geaendert' | 'typ_geaendert'

export interface DiffEintrag {
  art: DiffArt
  pfad: string
  position_links: QuellSpanne | null
  position_rechts: QuellSpanne | null
  wert_links: JsonWert | null
  wert_rechts: JsonWert | null
}

export interface DiffAntwort {
  eintraege: DiffEintrag[]
  anzahl: number
}

export interface ReparaturAnfrage {
  dokument: DokumentReferenz
}

export interface ReparaturAntwort {
  reparierbar: boolean
  veraendert: boolean
  ergebnis_text: string
  diff_unified: string
  aenderungen: string[]
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
