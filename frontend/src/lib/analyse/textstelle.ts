// Zeile und Spalte zu einer Position im Text (UTF-16 wie im Editor), beide ab 1. Rein, ohne Browser.

export interface Textstelle {
  readonly zeile: number;
  readonly spalte: number;
}

export function textstelle(text: string, position: number): Textstelle {
  const bis = Math.max(0, Math.min(position, text.length));
  let zeile = 1;
  let anfang = 0;
  for (let i = text.indexOf("\n"); i !== -1 && i < bis; i = text.indexOf("\n", i + 1)) {
    zeile++;
    anfang = i + 1;
  }
  return { zeile, spalte: bis - anfang + 1 };
}
