// Erkennen: Wie sehr sieht ein Text nach YAML aus? Gezählt werden Zeilen der Form `schluessel: wert`, `- eintrag`
// und Dokumentgrenzen am Anfang des Textes. YAML ist eine Obermenge von JSON; Texte, die wie JSON beginnen,
// bekommen höchstens 0,2, damit JSON und NDJSON gewinnen. Texte ohne solche Zeilen (etwa CSV) höchstens 0,1.

const PROBE_ZEILEN = 200;
const PROBE_ZEICHEN = 64 * 1024;

const SCHLUESSELZEILE = /^(?:-\s+)?(?:"[^"]*"|'[^']*'|[^\s#'"{[,\-][^#,]*?|-[^\s#,][^#,]*?)\s*:(?:\s|$)/;
const LISTENZEILE = /^-(?:\s|$)/;
const DOKUMENTGRENZE = /^(?:---|\.\.\.)(?:\s|$)|^%YAML /;

export function erkennenYaml(text: string): number {
  const probe = text.slice(0, PROBE_ZEICHEN).replace(/^﻿/, "");
  const anfang = probe.trimStart();
  if (anfang === "") return 0;
  const wieJson = anfang.startsWith("{") || anfang.startsWith("[");

  let treffer = 0;
  let zeilen = 0;
  let grenze = false;
  for (const zeile of probe.split("\n", PROBE_ZEILEN)) {
    const z = zeile.trim();
    if (z === "" || z.startsWith("#")) continue;
    if (DOKUMENTGRENZE.test(zeile)) {
      grenze = true;
      treffer++;
      zeilen++;
    } else if (SCHLUESSELZEILE.test(z) || LISTENZEILE.test(z)) {
      treffer++;
      zeilen++;
    } else if (!/^\s/.test(zeile)) {
      zeilen++;                          // eingerückte Fortsetzungen (Block-Texte) zählen nicht gegen YAML
    }
  }

  let wert = treffer === 0 ? 0.05 : Math.min(0.9, 0.3 + 0.6 * (treffer / zeilen) + (grenze ? 0.1 : 0));
  if (wieJson) wert = Math.min(wert, 0.2);
  return wert;
}
