// JSON Patch (RFC 6902) aus einem Vergleich: die Vorgänge, die Vorher in Jetzt verwandeln. Vorgänge wirken der Reihe
// nach, deshalb beziehen sich die Stellen in Listen auf den Stand während des Anwendens: erst fallen Einträge weg (von
// hinten), dann werden gepaarte Einträge geändert (an ihrer Stelle danach), dann kommen neue an ihre Endstelle (von
// vorn). Stimmt die Reihenfolge gepaarter Einträge nicht mehr überein, wird die Liste als Ganzes ersetzt.

import type { Vergleichsknoten } from "./vergleichen";

export type PatchVorgang =
  | { readonly op: "add" | "replace"; readonly path: string; readonly value: unknown }
  | { readonly op: "remove"; readonly path: string };

const teil = (s: string | number): string => String(s).replaceAll("~", "~0").replaceAll("/", "~1");

function vorgaenge(k: Vergleichsknoten, pfad: string, aus: PatchVorgang[]): void {
  if (k.art === "gleich") return;
  if (k.art === "geaendert") { aus.push({ op: "replace", path: pfad, value: k.jetzt }); return; }
  if (k.art !== "innen" || !k.kinder) return;
  if (!k.liste) {
    for (const c of k.kinder) {
      const p = `${pfad}/${teil(c.schluessel ?? "")}`;
      if (c.art === "weg") aus.push({ op: "remove", path: p });
      else if (c.art === "hinzu") aus.push({ op: "add", path: p, value: c.jetzt });
      else vorgaenge(c, p, aus);
    }
    return;
  }
  const gepaart = k.kinder.filter((c) => c.vorherStelle !== null && c.jetztStelle !== null).sort((x, y) => x.vorherStelle! - y.vorherStelle!);
  if (k.reihenfolge || gepaart.some((c, i) => i > 0 && c.jetztStelle! < gepaart[i - 1].jetztStelle!)) {
    aus.push({ op: "replace", path: pfad, value: k.jetzt });
    return;
  }
  for (const c of k.kinder.filter((x) => x.art === "weg").sort((x, y) => y.vorherStelle! - x.vorherStelle!)) aus.push({ op: "remove", path: `${pfad}/${c.vorherStelle}` });
  gepaart.forEach((c, rang) => vorgaenge(c, `${pfad}/${rang}`, aus));
  for (const c of k.kinder.filter((x) => x.art === "hinzu").sort((x, y) => x.jetztStelle! - y.jetztStelle!)) aus.push({ op: "add", path: `${pfad}/${c.jetztStelle}`, value: c.jetzt });
}

export function jsonPatch(wurzel: Vergleichsknoten): PatchVorgang[] {
  const aus: PatchVorgang[] = [];
  vorgaenge(wurzel, "", aus);
  return aus;
}
