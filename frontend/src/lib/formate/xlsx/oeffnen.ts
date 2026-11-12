// Einleser für Tabellendateien (XLSX): je Blatt eine Liste, Typen bleiben (Zahl, Wahrheitswert, Datum als ISO-Text).
// Die erste Zeile ist die Kopfzeile, wenn sie nur Texte enthält.

import { tabellenAlsDokument, type Einleser } from "../einlesen/tabellen";
import { xlsxLesen } from "./lesen";

export const XLSX_EINLESER: Einleser = {
  name: "Tabellendatei",
  endungen: ["xlsx"],
  einlesen: (bytes, dateiname) => {
    const mappe = xlsxLesen(bytes);
    return tabellenAlsDokument(mappe.blaetter, dateiname, { eins: "Blatt", viele: "Blätter" }, mappe.hinweise);
  },
};

/** Für Tests und Aufrufer, die nur XLSX meinen */
export const xlsxAlsDokument = (bytes: Uint8Array, dateiname: string) => XLSX_EINLESER.einlesen(bytes, dateiname);
