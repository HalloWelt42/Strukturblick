// Layout der Schale: Breite der beiden Seitenleisten und ob die linke
// eingeklappt ist. Alle Werte werden im Browser (localStorage) gespeichert,
// sodass die App nach einem Neustart genauso aussieht. Die Breiten sind auf
// sinnvolle Grenzen begrenzt, damit die Leisten nutzbar bleiben.

const SPEICHER_SCHLUESSEL = 'strukturblick-layout'

export const MIN_LINKS = 180
export const MAX_LINKS = 460
export const STANDARD_LINKS = 232

export const MIN_RECHTS = 240
export const MAX_RECHTS = 520
export const STANDARD_RECHTS = 304

export type LeistenSeite = 'links' | 'rechts'

function begrenze(wert: number, min: number, max: number): number {
  if (!Number.isFinite(wert)) return min
  return Math.min(max, Math.max(min, Math.round(wert)))
}

interface GespeichertesLayout {
  breiteLinks?: number
  breiteRechts?: number
  linksEingeklappt?: boolean
}

function lies(): GespeichertesLayout {
  try {
    const roh = localStorage.getItem(SPEICHER_SCHLUESSEL)
    if (roh === null) return {}
    const wert: unknown = JSON.parse(roh)
    return typeof wert === 'object' && wert !== null ? (wert as GespeichertesLayout) : {}
  } catch {
    return {}
  }
}

const gespeichert = lies()

// Synchron aus localStorage vorbelegt, damit schon der erste Aufbau die
// gemerkten Breiten nutzt (kein Aufblitzen der Standardwerte).
export const layout = $state<{
  breiteLinks: number
  breiteRechts: number
  linksEingeklappt: boolean
}>({
  breiteLinks: begrenze(gespeichert.breiteLinks ?? STANDARD_LINKS, MIN_LINKS, MAX_LINKS),
  breiteRechts: begrenze(gespeichert.breiteRechts ?? STANDARD_RECHTS, MIN_RECHTS, MAX_RECHTS),
  linksEingeklappt: gespeichert.linksEingeklappt === true,
})

function sichere(): void {
  try {
    localStorage.setItem(
      SPEICHER_SCHLUESSEL,
      JSON.stringify({
        breiteLinks: layout.breiteLinks,
        breiteRechts: layout.breiteRechts,
        linksEingeklappt: layout.linksEingeklappt,
      }),
    )
  } catch (grund: unknown) {
    console.error('Layout konnte nicht gesichert werden:', grund)
  }
}

/** Setzt die Breite einer Leiste (begrenzt); persistiert erst bei speichereLayout(). */
export function setzeBreite(seite: LeistenSeite, breite: number): void {
  if (seite === 'links') {
    layout.breiteLinks = begrenze(breite, MIN_LINKS, MAX_LINKS)
  } else {
    layout.breiteRechts = begrenze(breite, MIN_RECHTS, MAX_RECHTS)
  }
}

/** Sichert den aktuellen Stand - nach dem Ziehen einmal aufrufen. */
export function speichereLayout(): void {
  sichere()
}

/** Klappt die linke Leiste ein oder aus und merkt sich den Zustand. */
export function schalteLinksEin(): void {
  layout.linksEingeklappt = !layout.linksEingeklappt
  sichere()
}
