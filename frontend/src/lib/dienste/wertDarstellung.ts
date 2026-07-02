// Darstellungs-Konstanten je Werttyp: CSS-Klasse der Typfarbe (Klassen aus
// app.css) und deutscher Anzeigename. Von Baumzeilen und Inspektor gemeinsam
// genutzt, damit beide dieselben Farben und Begriffe zeigen.

import type { WertTyp } from './wertZugriff'

/** CSS-Klasse der Typfarbe je Werttyp. */
export const WERT_KLASSE: Record<WertTyp, string> = {
  objekt: 'wert-objekt',
  liste: 'wert-liste',
  text: 'wert-text',
  zahl: 'wert-zahl',
  wahrheitswert: 'wert-bool',
  null: 'wert-null',
}

/** Deutscher Anzeigename je Werttyp (Inspektor-Zeile "Typ"). */
export const TYP_NAME: Record<WertTyp, string> = {
  objekt: 'Objekt',
  liste: 'Liste',
  text: 'Text',
  zahl: 'Zahl',
  wahrheitswert: 'Wahrheitswert',
  null: 'Null',
}
