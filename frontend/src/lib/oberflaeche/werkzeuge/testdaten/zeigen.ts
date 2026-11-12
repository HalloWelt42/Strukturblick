// Wie ein erzeugter Wert in Tafel, Vorschau und Inspektor erscheint: Text, der wie eine Zahl aussieht, in
// Anführungszeichen (die führende Null bleibt sichtbar Text), Objekte und Listen kurz.

import type { Json } from "../../../analyse/testdaten/erzeuger";

export function zeigen(w: Json | undefined): string {
  if (w === undefined) return "";
  if (w === null) return "null";
  if (typeof w === "string") return /^[-+]?\d[\d.,]*$/.test(w) ? `"${w}"` : w;
  if (Array.isArray(w)) return `[${w.length}]`;
  if (typeof w === "object") return "{...}";
  return String(w);
}

/** Zelle der Vorschau: wie `zeigen`, aber Text ohne Anführungszeichen (die Spalte sagt die Art) */
export const zelleZeigen = (w: Json | undefined): string => (typeof w === "string" ? w : zeigen(w));
