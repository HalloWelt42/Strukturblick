// XML Schema aus dem offenen Dokument ableiten und neben ihm ablegen: je Namensraum eine Datei, Namen im Ordner frei
// gewählt (die Importe nennen sie), die Hauptdatei zuletzt, damit sie offen im Vordergrund steht. Ansicht Struktur und
// Befehlspalette rufen hier auf; ob es geht, sagt die Schemasprache des Formats.

import { ableitungZahlen, xsdSchreiben } from "../analyse/xsd/ausgeben";
import { xsdAbleiten } from "../analyse/xsd/ableiten";
import type { Arbeitsblatt } from "./arbeitsblatt.svelte";
import { arbeitsplatz } from "./arbeitsplatz.svelte";
import { meldungen } from "./meldungen.svelte";
import { belegteNamen, freierName } from "./schemadateien";

/** Lässt sich aus diesem Dokument ein XML Schema ableiten? */
export const xmlSchemaAbleitbar = (blatt: Arbeitsblatt | null): boolean => blatt?.analyse?.format.faehigkeiten.schemasprache === "xml-schema";

export async function xmlSchemaAblegen(blatt: Arbeitsblatt): Promise<void> {
  const ableitung = xsdAbleiten(blatt.analyseText);
  if (!ableitung) {
    meldungen.zeigen({ text: "Ein XML Schema lässt sich nur aus wohlgeformtem XML ableiten; erst die Fehler beheben (Fuß, Editor).", art: "fehler" });
    return;
  }
  const stamm = blatt.name.replace(/\.[^.]+$/, "");
  const belegt = belegteNamen(blatt.ordner);
  const namen = new Map<string, string>();
  const dateien = xsdSchreiben(ableitung, {
    quelle: blatt.name,
    dateiname: (ns, praefix, haupt) => {
      let n = namen.get(ns);
      if (!n) namen.set(ns, (n = freierName(haupt ? `${stamm}.abgeleitet.xsd` : `${stamm}.abgeleitet.${praefix || "ns"}.xsd`, belegt)));
      return n;
    },
  });
  for (const d of [...dateien.filter((x) => !x.haupt), ...dateien.filter((x) => x.haupt)]) await arbeitsplatz.neu(d.name, d.text, blatt.ordner);
  const haupt = arbeitsplatz.aktivesBlatt;
  haupt?.zeigen({ art: "ansicht", kennung: "schema" });
  const z = ableitungZahlen(ableitung);
  const weitere = dateien.length - 1;
  meldungen.zeigen({
    text: `${dateien.find((d) => d.haupt)?.name} abgeleitet${weitere ? ` (dazu ${weitere === 1 ? "eine Datei" : `${weitere} Dateien`} für weitere Namensräume)` : ""}: ${z.erklaerungen.toLocaleString("de-DE")} Erklärungen aus ${ableitung.elemente.toLocaleString("de-DE")} Elementen${z.ungeordnet ? `, ${z.ungeordnet} davon ohne feste Reihenfolge` : ""}. So streng, wie die Daten es zeigen; vor dem Einsatz prüfen.`,
    art: "erfolg",
  });
}
