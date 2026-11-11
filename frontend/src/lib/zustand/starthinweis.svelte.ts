// Hinweis bei jedem Start und Neuladen (STB-29): Nutzung nur privat und kostenfrei, Urheber, Lizenzen, was mit den
// Daten geschieht (je Bauart), Betaphase, Beispiele sind erfunden. Bewusst ohne "nicht mehr zeigen": der Nutzer will
// ihn bei jedem Start. Später jederzeit über "Über Strukturblick".

import { BAUART, FASSUNG } from "../dienste/bauart";

export interface Abschnitt {
  readonly symbol: string;
  readonly titel: string;
  readonly text: string;
}

const DATEN: Record<typeof BAUART, string> = {
  eigenstaendig:
    "Strukturblick rechnet und speichert alles in diesem Browser. Deine Dokumente gehen an keinen Server: Lesen, Abfragen und Suchen laufen hier auf dem Gerät, abgelegt wird im Speicher dieses Browsers. Löschst du die Browserdaten, sind sie weg; sichern geht über Herunterladen oder Ablage, Alles sichern.",
  server:
    "Deine Dokumente liegen in deiner Ablage auf pi5b im Heimnetz und sind auf allen deinen Geräten gleich. Lesen, Abfragen und Suchen rechnen hier im Browser. An fremde Server geht nichts.",
};

export const ABSCHNITTE: readonly Abschnitt[] = [
  {
    symbol: "fa-scale-balanced",
    titel: "Nur private Nutzung ist kostenfrei",
    text: "Strukturblick darf privat und nicht-kommerziell kostenfrei genutzt werden. Jede kommerzielle Nutzung, der Verkauf und die Weitergabe veränderter Fassungen sind nicht erlaubt. Copyright (c) 2026 HalloWelt42, alle Rechte vorbehalten.",
  },
  { symbol: "fa-shield-halved", titel: "Deine Daten", text: DATEN[BAUART] },
  {
    symbol: "fa-flask",
    titel: "Betaphase",
    text: "Strukturblick ist in der Betaphase. Funktionen können sich noch ändern, und Fehler sind möglich. Wichtige Dokumente bitte zusätzlich sichern.",
  },
  {
    symbol: "fa-masks-theater",
    titel: "Beispiele sind erfunden",
    text: "Die Beispiele zum Üben sind Demodaten: Namen, Bestellungen, Adressen und Telefonnummern sind ausgedacht und gehören keinen echten Personen.",
  },
];

export const FASSUNG_TEXT = `Fassung ${FASSUNG}, Beta`;

class Starthinweis {
  offen = $state(true);

  oeffnen(): void {
    this.offen = true;
  }

  schliessen(): void {
    this.offen = false;
  }
}

export const starthinweis = new Starthinweis();
