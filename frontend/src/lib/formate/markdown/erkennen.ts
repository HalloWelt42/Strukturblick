// Erkennen: Wie sehr sieht ein Text nach Markdown-Tabellen aus? Ohne Trennzeile (|---|---|) gar nicht; sonst umso mehr,
// je größer der Anteil der Tabellenzeilen ist.

import { tabellenFinden } from "./zeilen";

const PROBE_ZEICHEN = 64 * 1024;

export function erkennenMarkdown(text: string): number {
  const probe = text.slice(0, PROBE_ZEICHEN);
  if (!/-{3,}/.test(probe) || !probe.includes("|")) return 0;
  const funde = tabellenFinden(probe);
  if (!funde.length) return 0;
  const tabellenzeilen = funde.reduce((n, f) => n + 2 + f.zeilen.length, 0);
  const zeilen = probe.split("\n").filter((z) => z.trim() !== "").length;
  return Math.min(0.9, 0.4 + 0.5 * (tabellenzeilen / zeilen));
}
