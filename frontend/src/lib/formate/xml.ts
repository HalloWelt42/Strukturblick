// Format XML: eigener Leser (Dokumentbaum mit allen Textstellen, dann Strukturindex nach festen Regeln: Attribute als
// "@name", Text neben Kind-Elementen als "#text", gleichnamige Geschwister als Liste). Geschrieben wird nur an den
// Spannen; Kommentare, Einrückung und Namensräume bleiben. Die Teile liegen unter xml/.

import type { Format } from "./vertrag";
import { erkennenXml } from "./xml/erkennen";
import { lesenXml } from "./xml/lesen";
import { eintraegeEntfernenXml, spalteEntfernenXml, wertSchreibenXml } from "./xml/schreiben";

export const XML_FORMAT: Format = {
  kennung: "xml",
  name: "XML",
  endungen: ["xml", "xsd", "wsdl", "xsl", "xslt"],
  sprache: "xml",
  faehigkeiten: { kommentare: true, tabellarisch: false, typen: false, schemasprache: "xml-schema" },
  leseoptionen: [],
  erkennen: (text) => erkennenXml(text),
  lesen: (text) => lesenXml(text),
  eintraegeEntfernen: (text, index, liste, stellen) => eintraegeEntfernenXml(text, index, liste, stellen),
  spalteEntfernen: (text, index, liste, spalte) => spalteEntfernenXml(text, index, liste, spalte),
  wertSchreiben: (text, index, k, neu) => wertSchreibenXml(text, index, k, neu),
};
