// Erkennen: Wie sehr sieht ein Text nach TOML aus? Gezählt werden Zeilen der Form `schluessel = wert` und Kopfzeilen
// ([tabelle], [[liste]]); Kommentare und Leerzeilen zählen nicht. Texte, die wie JSON beginnen, bekommen höchstens 0,1.

const PROBE_ZEILEN = 200;
const PROBE_ZEICHEN = 64 * 1024;

const ZUWEISUNG = /^(?:[A-Za-z0-9_-]+|"[^"\n]*"|'[^'\n]*')(?:\s*\.\s*(?:[A-Za-z0-9_-]+|"[^"\n]*"|'[^'\n]*'))*\s*=\s*\S/;
const SCHLUESSEL = String.raw`(?:[A-Za-z0-9_-]+|"[^"\n]*"|'[^'\n]*')`;
const KOPFZEILE = new RegExp(String.raw`^\[\[?\s*${SCHLUESSEL}(?:\s*\.\s*${SCHLUESSEL})*\s*\]\]?\s*(?:#.*)?$`);

export function erkennenToml(text: string): number {
  const probe = text.slice(0, PROBE_ZEICHEN).replace(/^﻿/, "");
  const anfang = probe.trimStart();
  if (anfang === "") return 0;
  if (anfang.startsWith("{") || (anfang.startsWith("[") && !KOPFZEILE.test(anfang.split("\n", 1)[0].trim()))) return 0.1;
  let treffer = 0;
  let zeilen = 0;
  let kopf = false;
  for (const zeile of probe.split("\n", PROBE_ZEILEN)) {
    const z = zeile.trim();
    if (z === "" || z.startsWith("#")) continue;
    if (/^\s/.test(zeile) && !ZUWEISUNG.test(z)) continue; // eingerückte Fortsetzungen (mehrzeilige Listen und Texte)
    zeilen++;
    if (KOPFZEILE.test(z)) { treffer++; kopf = true; }
    else if (ZUWEISUNG.test(z)) treffer++;
  }
  if (!treffer) return 0;
  return Math.min(0.95, 0.3 + 0.6 * (treffer / zeilen) + (kopf ? 0.05 : 0));
}
