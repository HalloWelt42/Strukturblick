// Ziel TOML: TOML braucht oben ein Objekt und kennt kein null. Eine Liste oben kommt unter `eintraege`, null fällt
// weg; beides sagt die Verlustkarte mit den betroffenen Feldern. Geschrieben wird mit smol-toml (einfache Werte vor
// Tabellen, Listen von Objekten als [[tabellenliste]]).

import { stringify } from "smol-toml";
import type { Verlustpunkt } from "./konvertieren";
import { istObjekt } from "./tabellieren";

/** Name, unter dem eine Liste oder ein einzelner Wert oben steht */
export const OBEN = "eintraege";

const und = (teile: readonly string[]): string => (teile.length > 1 ? `${teile.slice(0, -1).join(", ")} und ${teile[teile.length - 1]}` : (teile[0] ?? ""));

/** Kopie ohne null; zählt die entfernten Stellen und merkt sich die Feldnamen */
function ohneNull(w: unknown, weg: Map<string, number>, name: string): unknown {
  if (Array.isArray(w)) {
    const aus: unknown[] = [];
    for (const x of w) {
      if (x === null) weg.set(`${name}[]`, (weg.get(`${name}[]`) ?? 0) + 1);
      else aus.push(ohneNull(x, weg, name));
    }
    return aus;
  }
  if (istObjekt(w)) {
    const aus: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(w)) {
      if (v === null) weg.set(k, (weg.get(k) ?? 0) + 1);
      else aus[k] = ohneNull(v, weg, k);
    }
    return aus;
  }
  return w;
}

export function tomlAus(wert: unknown): { text: string; verluste: Verlustpunkt[] } {
  const verluste: Verlustpunkt[] = [];
  const weg = new Map<string, number>();
  let oben = ohneNull(wert, weg, OBEN);
  if (!istObjekt(oben)) {
    verluste.push({ satz: "TOML braucht oben ein Objekt", text: `Der Inhalt steht deshalb unter \`${OBEN}\`${Array.isArray(oben) ? `, jeder Eintrag als Abschnitt [[${OBEN}]]` : ""}.` });
    oben = { [OBEN]: oben };
  }
  if (weg.size) {
    const n = [...weg.values()].reduce((a, b) => a + b, 0);
    const felder = [...weg.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => `\`${k}\``);
    verluste.push({ satz: "TOML kennt kein null", text: `${n.toLocaleString("de-DE")} ${n === 1 ? "Stelle fällt" : "Stellen fallen"} weg, ein Feld fehlt dann ganz: ${und(felder.slice(0, 4))}${felder.length > 4 ? ` und ${felder.length - 4} weitere` : ""}. Wer die Datei liest, kann fehlend und null nicht unterscheiden.` });
  }
  return { text: stringify(oben), verluste };
}
