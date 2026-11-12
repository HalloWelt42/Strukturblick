// Erkennen: Wie sehr sieht ein Text nach XML aus? Eine XML-Deklaration ist eindeutig; sonst ein Start-Tag am Anfang
// (nach Kommentaren und DOCTYPE) und ein Ende-Tag oder ein leeres Tag im Text.

export function erkennenXml(text: string): number {
  const anfang = text.slice(0, 4096).replace(/^﻿/, "").trimStart();
  if (anfang.startsWith("<?xml")) return 1;
  const ohneKommentare = anfang.replace(/^(?:<!--[\s\S]*?-->\s*|<!DOCTYPE[^>]*>\s*)+/, "");
  if (!/^<[A-Za-z_][\w:.-]*[\s>/]/.test(ohneKommentare)) return 0;
  return /<\/[A-Za-z_][\w:.-]*\s*>|\/>/.test(text.slice(0, 64 * 1024)) ? 0.9 : 0.4;
}
