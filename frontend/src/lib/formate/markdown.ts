// Format Markdown-Tabellen: Tabellen in Markdown (Kopfzeile, Trennzeile, Datenzeilen) lesen wie CSV, mit allen Spannen;
// Text um die Tabellen bleibt unberührt. Mehrere Tabellen heißen nach ihrer Überschrift. Die Teile liegen unter
// markdown/.

import type { Format } from "./vertrag";
import { erkennenMarkdown } from "./markdown/erkennen";
import { lesenMarkdown } from "./markdown/lesen";
import { eintraegeEntfernenMarkdown, spalteEntfernenMarkdown, wertSchreibenMarkdown } from "./markdown/schreiben";

export const MARKDOWN_FORMAT: Format = {
  kennung: "markdown",
  name: "Markdown",
  endungen: ["md", "markdown"],
  sprache: "markdown",
  faehigkeiten: { kommentare: false, tabellarisch: true, typen: false },
  leseoptionen: [],
  erkennen: (text) => erkennenMarkdown(text),
  lesen: (text) => lesenMarkdown(text),
  eintraegeEntfernen: (text, index, liste, stellen) => eintraegeEntfernenMarkdown(text, index, liste, stellen),
  spalteEntfernen: (text, index, liste, spalte) => spalteEntfernenMarkdown(text, index, liste, spalte),
  wertSchreiben: (_text, index, k, neu) => wertSchreibenMarkdown(index, k, neu),
};
