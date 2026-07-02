// Menschenlesbare Größenangaben mit deutschem Dezimalkomma.

const EINHEITEN = ['KB', 'MB', 'GB'] as const

/** Zum Beispiel "12,4 KB" oder "348 B". */
export function menschenlesbareGroesse(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  let wert = bytes
  let einheit: string = EINHEITEN[0]
  for (const kandidat of EINHEITEN) {
    wert /= 1024
    einheit = kandidat
    if (wert < 1024) break
  }
  return `${wert.toFixed(1).replace('.', ',')} ${einheit}`
}

/** Größe in MB mit einer Nachkommastelle, zum Beispiel "12,4". */
export function alsMbText(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1).replace('.', ',')
}
