// Wortlaut der Ansicht Schema: Ableitungen, Verwendungen und Facetten so, wie sie in Liste, Statistik und Inspektor
// stehen. Ein Ort, damit dieselbe Sache überall gleich heißt.

import type { Verwendungsart } from "../../../analyse/xsd/kennzahlen";
import { anzeigename, type Ableitung, type Typdefinition, type XsdModell } from "../../../analyse/xsd/modell";

export const ABLEITUNG_NAME: Readonly<Record<Ableitung, string>> = {
  erweiterung: "Erweiterung",
  einschraenkung: "Einschränkung",
  liste: "Liste",
  vereinigung: "Vereinigung",
};

/** "erweitert b:Partner", "schränkt xs:string ein", "Liste von xs:int", "Vereinigung aus 2 Typen" */
export function ableitungText(m: XsdModell, t: Typdefinition): string {
  const basis = t.basis ? anzeigename(m, t.basis) : t.lokaleBasis ? "anonymem Typ" : "?";
  switch (t.ableitung) {
    case "erweiterung": return `erweitert ${basis}`;
    case "einschraenkung": return `schränkt ${t.basis ? basis : "einen anonymen Typ"} ein`;
    case "liste": return `Liste von ${basis}`;
    case "vereinigung": return `Vereinigung aus ${t.mitglieder.length + t.lokaleMitglieder.length} Typen`;
    default: return t.art === "komplex" ? "eigener Aufbau" : "";
  }
}

export const VERWENDUNG_NAME: Readonly<Record<Verwendungsart, string>> = {
  typ: "als Typ",
  basis: "als Basis",
  eintrag: "als Eintragstyp",
  mitglied: "in Vereinigung",
  verweis: "als Verweis",
  gruppe: "als Gruppe",
  attributgruppe: "als Attributgruppe",
  ersetzt: "als Kopf der Ersetzung",
};

export const FACETTE_NAME: Readonly<Record<string, string>> = {
  pattern: "Muster",
  length: "Länge",
  minLength: "Länge mindestens",
  maxLength: "Länge höchstens",
  minInclusive: "Mindestens",
  maxInclusive: "Höchstens",
  minExclusive: "Größer als",
  maxExclusive: "Kleiner als",
  totalDigits: "Stellen gesamt",
  fractionDigits: "Nachkommastellen",
  whiteSpace: "Leerraum",
};
