// Theme-Engine: Auswahl wird gemerkt, eingebaute Themes schalten nur das
// data-theme-Attribut, Nutzer-Themes setzen zusaetzlich Token-Overrides.
// Reaktiver Zustand via Svelte-5-Runes, ueber Module-Import geteilt.

import { STANDARD_THEME_ID, THEMES, type ThemeDefinition } from './themes'

const SPEICHER_SCHLUESSEL = 'strukturblick-theme'

export const theme = $state<{ aktivId: string }>({ aktivId: STANDARD_THEME_ID })

function findeTheme(id: string): ThemeDefinition | undefined {
  return THEMES.find((eintrag) => eintrag.id === id)
}

/** Entfernt alle Token-Overrides, die ein Nutzer-Theme gesetzt haben koennte. */
function raeumeTokenOverridesAb(): void {
  const stil = document.documentElement.style
  for (const definition of THEMES) {
    if (definition.quelle !== 'nutzer' || !definition.tokens) continue
    for (const tokenName of Object.keys(definition.tokens)) {
      stil.removeProperty(tokenName)
    }
  }
}

export function wendeThemeAn(id: string): void {
  const definition = findeTheme(id) ?? findeTheme(STANDARD_THEME_ID)
  if (!definition) return
  theme.aktivId = definition.id

  const wurzel = document.documentElement
  raeumeTokenOverridesAb()

  if (definition.quelle === 'eingebaut') {
    // Eingebaute Themes liegen komplett in tokens.css.
    wurzel.dataset.theme = definition.id
  } else {
    // Nutzer-Themes bauen auf dem passenden eingebauten Grundton auf
    // und uebersteuern einzelne Token direkt am Wurzelelement.
    wurzel.dataset.theme = definition.art === 'dunkel' ? 'dunkel' : STANDARD_THEME_ID
    for (const [tokenName, wert] of Object.entries(definition.tokens ?? {})) {
      wurzel.style.setProperty(tokenName, wert)
    }
  }

  localStorage.setItem(SPEICHER_SCHLUESSEL, definition.id)
}

export function initTheme(): void {
  const gespeichert = localStorage.getItem(SPEICHER_SCHLUESSEL)
  if (gespeichert !== null && findeTheme(gespeichert)) {
    wendeThemeAn(gespeichert)
    return
  }
  const bevorzugtDunkel = window.matchMedia('(prefers-color-scheme: dark)').matches
  wendeThemeAn(bevorzugtDunkel ? 'dunkel' : STANDARD_THEME_ID)
}

/** Wechselt zyklisch durch alle bekannten Themes. */
export function naechstes(): void {
  const index = THEMES.findIndex((eintrag) => eintrag.id === theme.aktivId)
  const folgend = THEMES[(index + 1) % THEMES.length]
  if (folgend) wendeThemeAn(folgend.id)
}
