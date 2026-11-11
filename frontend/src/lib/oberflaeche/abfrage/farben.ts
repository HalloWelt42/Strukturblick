// Eingerücktes JSON in Stücke mit Farbklasse zerlegen (Ergebnis der Abfrage, Entwurf: Schlüssel af-s-schl, Werte
// w-text, w-zahl, w-bool, w-null, Klammern af-s-klammer). Nur zum Anzeigen; der Text bleibt Zeichen für Zeichen gleich.

export interface Farbstueck {
  readonly text: string;
  readonly klasse: string | null;
}

const MUSTER = /("(?:[^"\\]|\\.)*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)|\b(true|false)\b|\b(null)\b|([{}[\]])/g;

export function farbstuecke(json: string): Farbstueck[] {
  const stuecke: Farbstueck[] = [];
  let bis = 0;
  for (const m of json.matchAll(MUSTER)) {
    if (m.index > bis) stuecke.push({ text: json.slice(bis, m.index), klasse: null });
    if (m[1] !== undefined) {
      stuecke.push({ text: m[1], klasse: m[2] ? "af-s-schl" : "w-text" });
      if (m[2]) stuecke.push({ text: m[2], klasse: null });
    } else if (m[3] !== undefined) stuecke.push({ text: m[3], klasse: "w-zahl" });
    else if (m[4] !== undefined) stuecke.push({ text: m[4], klasse: "w-bool" });
    else if (m[5] !== undefined) stuecke.push({ text: m[5], klasse: "w-null" });
    else stuecke.push({ text: m[6], klasse: "af-s-klammer" });
    bis = m.index + m[0].length;
  }
  if (bis < json.length) stuecke.push({ text: json.slice(bis), klasse: null });
  return stuecke;
}

/** Ort (JSON Pointer) kurz für Menschen in jq-Schreibweise: /bestellungen/2/nr wird .bestellungen[2].nr */
export function ortKurz(zeiger: string): string {
  if (zeiger === "") return ".";
  return zeiger
    .slice(1)
    .split("/")
    .map((t) => t.replaceAll("~1", "/").replaceAll("~0", "~"))
    .map((t) => (/^\d+$/.test(t) ? `[${t}]` : /^[A-Za-z_][\w]*$/.test(t) ? `.${t}` : `.${JSON.stringify(t)}`))
    .join("");
}
