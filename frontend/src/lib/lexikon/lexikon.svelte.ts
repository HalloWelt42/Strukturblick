// Zustand des schwebenden Lexikon-Panels: offen/minimiert, gewähltes Thema,
// In-Panel-Suche mit Treffer-Navigation sowie Position und Größe. Position,
// Größe, Thema und Sichtbarkeit werden in localStorage gemerkt, damit das
// Panel beim nächsten Start wieder dort liegt, wo man es abgelegt hat.

const SPEICHER_SCHLUESSEL = 'strukturblick-lexikon'

const STANDARD_THEMA = 'jsonpath'
const MIN_BREITE = 320
const MIN_HOEHE = 240

interface GespeicherterZustand {
  offen: boolean
  themaKey: string | null
  minimiert: boolean
  x: number
  y: number
  breite: number
  hoehe: number
}

const STANDARD: GespeicherterZustand = {
  offen: false,
  themaKey: null,
  minimiert: false,
  x: -1,
  y: -1,
  breite: 440,
  hoehe: 500,
}

function laden(): GespeicherterZustand {
  if (typeof localStorage === 'undefined') return { ...STANDARD }
  try {
    const roh = localStorage.getItem(SPEICHER_SCHLUESSEL)
    if (roh === null) return { ...STANDARD }
    return { ...STANDARD, ...(JSON.parse(roh) as Partial<GespeicherterZustand>) }
  } catch {
    return { ...STANDARD }
  }
}

class LexikonZustand {
  offen = $state(false)
  themaKey = $state<string | null>(null)
  suche = $state('')
  trefferIndex = $state(0)
  trefferGesamt = $state(0)
  minimiert = $state(false)
  x = $state(STANDARD.x)
  y = $state(STANDARD.y)
  breite = $state(STANDARD.breite)
  hoehe = $state(STANDARD.hoehe)

  private initialisiert = false

  /** Gespeicherten Zustand einmalig übernehmen (Startposition wie im Mockup). */
  init(): void {
    if (this.initialisiert) return
    this.initialisiert = true
    const stand = laden()
    this.themaKey = stand.themaKey
    this.minimiert = stand.minimiert
    this.breite = stand.breite
    this.hoehe = stand.hoehe
    if (stand.x < 0 || stand.y < 0) {
      // Noch nie verschoben: Position aus dem Mockup (rechts unten).
      this.x = Math.max(16, window.innerWidth - 340 - this.breite)
      this.y = Math.max(16, window.innerHeight - 48 - this.hoehe)
    } else {
      this.setzePosition(stand.x, stand.y)
    }
    this.offen = stand.offen
  }

  /** Panel öffnen; ohne key das zuletzt gewählte Thema, sonst der Standard. */
  oeffne(key?: string, suchbegriff?: string): void {
    this.init()
    this.themaKey = key ?? this.themaKey ?? STANDARD_THEMA
    this.offen = true
    this.minimiert = false
    this.suche = suchbegriff ?? ''
    this.trefferIndex = 0
    this.speichere()
  }

  schliesse(): void {
    this.offen = false
    this.speichere()
  }

  waehle(key: string): void {
    this.themaKey = key
    this.suche = ''
    this.trefferIndex = 0
    this.speichere()
  }

  setzeSuche(begriff: string): void {
    this.suche = begriff
    this.trefferIndex = 0
  }

  naechsterTreffer(): void {
    if (this.trefferGesamt > 0) this.trefferIndex = (this.trefferIndex + 1) % this.trefferGesamt
  }

  vorherigerTreffer(): void {
    if (this.trefferGesamt > 0) {
      this.trefferIndex = (this.trefferIndex - 1 + this.trefferGesamt) % this.trefferGesamt
    }
  }

  toggleMinimiert(): void {
    this.minimiert = !this.minimiert
    this.speichere()
  }

  /** Position setzen; der Kopf bleibt immer im Fenster greifbar. */
  setzePosition(x: number, y: number): void {
    this.x = Math.max(0, Math.min(window.innerWidth - 80, x))
    this.y = Math.max(0, Math.min(window.innerHeight - 40, y))
  }

  /** Größe setzen; nach unten begrenzt, nach oben durch das Fenster. */
  setzeGroesse(breite: number, hoehe: number): void {
    this.breite = Math.max(MIN_BREITE, Math.min(window.innerWidth, breite))
    this.hoehe = Math.max(MIN_HOEHE, Math.min(window.innerHeight, hoehe))
  }

  speichere(): void {
    if (typeof localStorage === 'undefined') return
    try {
      const stand: GespeicherterZustand = {
        offen: this.offen,
        themaKey: this.themaKey,
        minimiert: this.minimiert,
        x: this.x,
        y: this.y,
        breite: this.breite,
        hoehe: this.hoehe,
      }
      localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(stand))
    } catch {
      // Speichern ist Komfort - ohne localStorage funktioniert das Panel trotzdem.
    }
  }
}

export const lexikon = new LexikonZustand()
