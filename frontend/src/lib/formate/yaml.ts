// Format YAML: Lesen mit der Bibliothek `yaml` (Core-Schema 1.2), Kommentare und Anker bleiben beim Schreiben
// unberührt, weil nur die Spanne eines Werts ersetzt wird. Die Teile liegen unter `yaml/`.

import type { Format } from "./vertrag";
import { erkennenYaml } from "./yaml/erkennen";
import { lesenYaml } from "./yaml/lesen";
import { wertSchreibenYaml } from "./yaml/schreiben";
import { mitTrennern, zeilenweise } from "./entfernen";
import { yamlMitgliederEntfernen } from "./spalten";

export const YAML_FORMAT: Format = {
  kennung: "yaml",
  name: "YAML",
  endungen: ["yaml", "yml"],
  sprache: "yaml",
  faehigkeiten: { kommentare: true, tabellarisch: false, typen: true },
  leseoptionen: [],
  erkennen: (text) => erkennenYaml(text),
  lesen: (text) => lesenYaml(text),
  // In Klammern ([a, b]) wie JSON, als Block ("- a") zeilenweise
  eintraegeEntfernen: (text, index, liste, stellen) => (text[index.von[liste]] === "[" ? mitTrennern(index, liste, stellen) : zeilenweise(text, index, liste, stellen)),
  spalteEntfernen: (text, index, liste, spalte) => yamlMitgliederEntfernen(text, index, liste, spalte),
  wertSchreiben: (text, index, k, neu, merkmale) => wertSchreibenYaml(text, index, k, neu, merkmale),
};
