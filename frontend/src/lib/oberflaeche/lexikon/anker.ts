// Anker im Lexikon: aus einer Überschrift (auch mit HTML darin) ein stabiler Anker für Tiefenlinks thema#abschnitt.
// Klein, Umlaute ausgeschrieben, sonst nur a-z, 0-9 und Bindestrich. Eine Quelle für Fenster und Prüfung der Themen.

export function ankerAus(text: string): string {
  const umlaute: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;|&#\d+;/g, "")
    .replace(/[äöüß]/g, (z) => umlaute[z])
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
