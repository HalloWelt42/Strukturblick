// Fassungen vergleichen (STB-61): "2.34.1" gegen "2.35.0", Teil für Teil als Zahl. Beim Entwickeln kann die laufende
// Oberfläche neuer sein als die, die der Server meldet; angeboten wird nur, was wirklich neuer ist. Rein.

const teile = (f: string): number[] => f.split(/[.-]/).map((t) => Number.parseInt(t, 10)).map((z) => (Number.isFinite(z) ? z : 0));

/** Ist `neu` eine spätere Fassung als `eingebaut`? */
export function istNeuer(neu: string, eingebaut: string): boolean {
  const a = teile(neu);
  const b = teile(eingebaut);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}
