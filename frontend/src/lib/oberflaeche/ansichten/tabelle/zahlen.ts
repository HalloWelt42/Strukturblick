// Zahlen für Menschen in deutscher Schreibweise (2.318, 0,4 %).

const GANZ = new Intl.NumberFormat("de-DE");
const ANTEIL = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });

export const anzahl = (n: number): string => GANZ.format(n);

/** Anteil als Prozent mit höchstens einer Nachkommastelle; Winziges nie als 0 %. */
export function prozent(teil: number, ganzes: number): string {
  if (ganzes === 0 || teil === 0) return "0 %";
  const p = (teil / ganzes) * 100;
  return p < 0.1 ? "< 0,1 %" : `${ANTEIL.format(p)} %`;
}
