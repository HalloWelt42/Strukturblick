// Cursorposition des Editors für die Statusleiste ("Zeile X, Spalte Y").

export const statusInfo = $state<{ zeile: number; spalte: number }>({
  zeile: 1,
  spalte: 1,
})

export function setzeCursor(zeile: number, spalte: number): void {
  statusInfo.zeile = zeile
  statusInfo.spalte = spalte
}
