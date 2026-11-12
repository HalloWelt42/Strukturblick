// Format TOML: eigener Leser, der den Strukturindex mit allen Spannen aufbaut (Tabellen, Tabellenlisten, Punktschlüssel,
// eingebettete Tabellen). Geschrieben wird nur an den Spannen; Kommentare und Anordnung bleiben. Die Teile liegen unter
// `toml/`.

import type { Format } from "./vertrag";
import { erkennenToml } from "./toml/erkennen";
import { lesenToml } from "./toml/lesen";
import { eintraegeEntfernenToml, spalteEntfernenToml, wertSchreibenToml } from "./toml/schreiben";

export const TOML_FORMAT: Format = {
  kennung: "toml",
  name: "TOML",
  endungen: ["toml"],
  sprache: "toml",
  faehigkeiten: { kommentare: true, tabellarisch: false, typen: true, schemasprache: "json-schema" },
  leseoptionen: [],
  erkennen: (text) => erkennenToml(text),
  lesen: (text) => lesenToml(text),
  eintraegeEntfernen: (text, index, liste, stellen) => eintraegeEntfernenToml(text, index, liste, stellen),
  spalteEntfernen: (text, index, liste, spalte) => spalteEntfernenToml(text, index, liste, spalte),
  wertSchreiben: (_text, index, k, neu) => wertSchreibenToml(index, k, neu),
};
