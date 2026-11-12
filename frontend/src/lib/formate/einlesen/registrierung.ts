// Registrierung der Einleser: Dateien, die beim Öffnen ein JSON-Dokument werden (Tabellendateien, HTML-Seiten). Die eine
// Liste, aus der Öffnen und Dateiauswahl lesen.

import { HTML_EINLESER } from "../html/tabellen";
import { XLSX_EINLESER } from "../xlsx/oeffnen";
import type { Einleser } from "./tabellen";

export const EINLESER: readonly Einleser[] = [XLSX_EINLESER, HTML_EINLESER];

export const EINLESE_ENDUNGEN: readonly string[] = EINLESER.flatMap((e) => e.endungen);

export function einleserFuer(dateiname: string): Einleser | null {
  const endung = dateiname.split(".").pop()?.toLowerCase() ?? "";
  return EINLESER.find((e) => e.endungen.includes(endung)) ?? null;
}
