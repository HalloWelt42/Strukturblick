// Text aus den Bytes einer Datei: Kodierung nach Bytereihenfolge-Marke (UTF-8, UTF-16), dann nach der Angabe in der
// XML-Deklaration (encoding="..."), sonst UTF-8. Ist eine Datei ohne Angabe kein gültiges UTF-8, wird sie als
// Windows-1252 gelesen (die übliche Kodierung älterer Dateien hierzulande); das Ergebnis sagt, was geschah.

export interface Gelesen {
  readonly text: string;
  /** Benutzte Kodierung in Großbuchstaben, etwa UTF-8 oder ISO-8859-1 */
  readonly kodierung: string;
  /** Woher die Kodierung stammt */
  readonly grund: "marke" | "angabe" | "standard" | "ersatz";
}

function dekodieren(bytes: Uint8Array, kodierung: string, streng = false): string | null {
  try {
    return new TextDecoder(kodierung, { fatal: streng }).decode(bytes);
  } catch {
    return null;
  }
}

export function textAusBytes(bytes: Uint8Array): Gelesen {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { text: dekodieren(bytes.subarray(3), "utf-8") ?? "", kodierung: "UTF-8", grund: "marke" };
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return { text: dekodieren(bytes.subarray(2), "utf-16le") ?? "", kodierung: "UTF-16", grund: "marke" };
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return { text: dekodieren(bytes.subarray(2), "utf-16be") ?? "", kodierung: "UTF-16", grund: "marke" };
  const kopf = new TextDecoder("latin1").decode(bytes.subarray(0, 200));
  const angabe = /^\s*<\?xml[^>]*\bencoding\s*=\s*["']([A-Za-z0-9._-]+)["']/.exec(kopf)?.[1];
  if (angabe && !/^utf-?8$/i.test(angabe)) {
    const text = dekodieren(bytes, angabe.toLowerCase());
    if (text !== null) return { text, kodierung: angabe.toUpperCase(), grund: "angabe" };
  }
  const utf8 = dekodieren(bytes, "utf-8", true);
  if (utf8 !== null) return { text: utf8, kodierung: "UTF-8", grund: angabe ? "angabe" : "standard" };
  return { text: dekodieren(bytes, "windows-1252") ?? "", kodierung: "WINDOWS-1252", grund: "ersatz" };
}
