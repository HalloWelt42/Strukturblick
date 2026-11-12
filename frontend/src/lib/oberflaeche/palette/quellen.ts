// Woraus die Befehlspalette schöpft: die gerade möglichen Aktionen, die Ansichten, die Dokumente und Ordner der
// Ablage.

import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
import { ablageverwaltung } from "../../zustand/ablageverwaltung.svelte";
import { AKTIONEN, ANSICHT_WAHL, type Aktion } from "../aktionen/aktionen";
import { aktionKappen } from "../aktionen/tastatur";
import { ANSICHTEN } from "../ansichten/registrierung";
import { endung } from "../ablage/auswahl.svelte";
import type { Paletteneintrag } from "./eintraege";

const ansichtswahl = new Set(ANSICHT_WAHL.map((a) => a.kennung));

function befehl(a: Aktion): Paletteneintrag {
  return { kennung: `befehl:${a.kennung}`, gruppe: "befehl", titel: a.titel, beschreibung: a.beschreibung, symbol: a.symbol, kappen: aktionKappen(a), ausfuehren: () => a.ausfuehren() };
}

function ansichten(): Paletteneintrag[] {
  return ANSICHTEN.flatMap((v, i) => {
    const a = ANSICHT_WAHL[i];
    if (!a.verfuegbar()) return [];
    return [{ kennung: `ansicht:${v.kennung}`, gruppe: "ansicht", titel: v.titel, beschreibung: a.beschreibung, symbol: v.symbol, kappen: aktionKappen(a), ausfuehren: () => a.ausfuehren() } satisfies Paletteneintrag];
  });
}

function dokumente(): Paletteneintrag[] {
  const ort = arbeitsplatz.ablage.ort;
  const offen = new Set(arbeitsplatz.blaetter.map((b) => b.kennung));
  const neueste = [...arbeitsplatz.dokumente].sort((a, b) => b.geaendert.localeCompare(a.geaendert));
  const docs: Paletteneintrag[] = neueste.map((d) => ({
    kennung: `dokument:${d.kennung}`,
    gruppe: "dokument",
    titel: d.name,
    beschreibung: `${d.ordner ? `${d.ordner}, ` : ""}${ort}${offen.has(d.kennung) ? ", offen" : ""}`,
    symbol: "fa-file-lines",
    abzeichen: endung(d.name) || undefined,
    ausfuehren: () => void arbeitsplatz.ausAblageOeffnen(d.kennung),
  }));
  const ordner: Paletteneintrag[] = ablageverwaltung.ordner.map((o) => {
    const zahl = arbeitsplatz.dokumente.filter((d) => d.ordner === o).length;
    return {
      kennung: `ordner:${o}`,
      gruppe: "dokument",
      titel: o,
      beschreibung: `Ordner, ${zahl === 1 ? "1 Dokument" : `${zahl} Dokumente`}`,
      symbol: "fa-folder",
      ausfuehren: () => {
        ablageverwaltung.ordnerWahl = o;
        ablageverwaltung.oeffnen();
      },
    };
  });
  return [...docs, ...ordner];
}

export function quellen(): Paletteneintrag[] {
  const befehle = AKTIONEN.filter((a) => !ansichtswahl.has(a.kennung) && a.verfuegbar()).map(befehl);
  return [...befehle, ...dokumente(), ...ansichten()];
}
