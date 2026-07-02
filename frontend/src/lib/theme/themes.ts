// Eingebaute Themes. Die Farbwerte der Vorschau stammen aus der Palette in
// lib/theme/tokens.css (Quelle: mockups/stil.css, Abschnitt 1).

export interface ThemeDefinition {
  id: string
  name: string
  art: 'hell' | 'dunkel'
  quelle: 'eingebaut' | 'nutzer'
  vorschau: { flaeche: string; text: string; akzent: string }
  /** Token-Overrides für Nutzer-Themes; eingebaute Themes kommen aus tokens.css. */
  tokens?: Record<string, string>
}

export const STANDARD_THEME_ID = 'mittelton'

export const THEMES: ThemeDefinition[] = [
  {
    id: 'mittelton',
    name: 'Mittelton',
    art: 'hell',
    quelle: 'eingebaut',
    vorschau: { flaeche: '#cbcbcb', text: '#262626', akzent: '#4e6379' },
  },
  {
    id: 'dunkel',
    name: 'Dunkel',
    art: 'dunkel',
    quelle: 'eingebaut',
    vorschau: { flaeche: '#383838', text: '#e6e6e6', akzent: '#93a9be' },
  },
]
