// Inhalte der Kontextmenüs (STB-36) für Dokumente, Ordner und Reiter. Jeder Eintrag ruft, was es schon gibt
// (Arbeitsplatz, Ablageverwaltung, Aktionen); hier steht nur, was wo angeboten wird.

import type { Dokumentkopf } from "../../zustand/ablageverwaltung.svelte";
import { ablageverwaltung } from "../../zustand/ablageverwaltung.svelte";
import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";
import { herunterladen } from "../schale/dateien";
import { leistenStand } from "../schale/leistenStand.svelte";
import type { Menueeintrag } from "../bausteine/kontextstand.svelte";

/** Ziele zum Verschieben: oberste Ebene und alle Ordner, der eigene ausgegraut */
function verschiebenNach(kennungen: readonly string[], jetzt: string): Menueeintrag[] {
  const ziele = ["", ...ablageverwaltung.ordner];
  return ziele.map((o) => ({
    titel: o || "Oberste Ebene",
    symbol: o ? "fa-folder" : "fa-house",
    gesperrt: o === jetzt ? "Liegt schon hier" : undefined,
    ausfuehren: () => void ablageverwaltung.verschieben(kennungen, o),
  }));
}

async function laden(kennung: string): Promise<void> {
  const t = await ablageverwaltung.textVon(kennung);
  if (t) herunterladen(t.name, t.text);
}

/** Dokument in Leiste oder Ablage; `umbenennenHier` startet das Umbenennen dort, wo das Dokument steht */
export function dokumentMenue(d: Pick<Dokumentkopf, "kennung" | "name" | "ordner">, umbenennenHier: () => void): { titel: string; eintraege: Menueeintrag[] } {
  const offen = arbeitsplatz.blaetter.some((b) => b.kennung === d.kennung);
  return {
    titel: d.name,
    eintraege: [
      { titel: offen ? "Zeigen" : "Öffnen", symbol: "fa-folder-open", ausfuehren: () => { ablageverwaltung.schliessen(); void arbeitsplatz.ausAblageOeffnen(d.kennung); } },
      { titel: "Umbenennen", symbol: "fa-pen", kuerzel: "F2", ausfuehren: umbenennenHier },
      { titel: "Duplizieren", symbol: "fa-clone", ausfuehren: () => void ablageverwaltung.duplizieren(d.kennung) },
      { titel: "Verschieben nach", symbol: "fa-folder-tree", unter: verschiebenNach([d.kennung], d.ordner) },
      { titel: "Herunterladen", symbol: "fa-download", ausfuehren: () => void laden(d.kennung) },
      "trenner",
      { titel: "In den Papierkorb", symbol: "fa-trash-can", gefahr: true, ausfuehren: () => void ablageverwaltung.entfernen([d.kennung]) },
    ],
  };
}

/** Ordner in der Leiste */
export function ordnerMenue(name: string): { titel: string; eintraege: Menueeintrag[] } {
  const leer = !arbeitsplatz.dokumente.some((d) => d.ordner === name);
  return {
    titel: `Ordner ${name}`,
    eintraege: [
      { titel: "In der Ablage zeigen", symbol: "fa-folder-open", ausfuehren: () => { ablageverwaltung.ordnerWahl = name; ablageverwaltung.oeffnen(); } },
      { titel: "Neues Dokument darin", symbol: "fa-file-circle-plus", ausfuehren: () => { ablageverwaltung.schliessen(); void arbeitsplatz.leeresDokument(name).then(() => ablageverwaltung.neuLaden()); } },
      { titel: "Umbenennen", symbol: "fa-pen", kuerzel: "F2", ausfuehren: () => (leistenStand.umbenennen = { art: "ordner", name }) },
      "trenner",
      { titel: "Ordner entfernen", symbol: "fa-trash-can", gefahr: true, gesperrt: leer ? undefined : "Nur leere Ordner lassen sich entfernen; erst die Dokumente verschieben oder in den Papierkorb legen", ausfuehren: () => void ablageverwaltung.ordnerEntfernen(name) },
    ],
  };
}

/** Reiter im Kopf */
export function reiterMenue(b: Arbeitsblatt): { titel: string; eintraege: Menueeintrag[] } {
  const andere = arbeitsplatz.blaetter.filter((x) => x !== b);
  const oben = !b.ordner;
  return {
    titel: b.name,
    eintraege: [
      { titel: "Schließen", symbol: "fa-xmark", kuerzel: "⌥ ⌘ W", ausfuehren: () => void arbeitsplatz.schliessen(b) },
      { titel: "Andere schließen", symbol: "fa-rectangle-xmark", gesperrt: andere.length ? undefined : "Keine anderen Reiter offen", ausfuehren: () => void (async () => { for (const x of andere) await arbeitsplatz.schliessen(x); })() },
      "trenner",
      { titel: "Umbenennen", symbol: "fa-pen", ausfuehren: () => (oben ? (leistenStand.umbenennen = { art: "dokument", kennung: b.kennung }) : ablageUmbenennen(b)) },
      { titel: "Duplizieren", symbol: "fa-clone", ausfuehren: () => void ablageverwaltung.duplizieren(b.kennung) },
      { titel: "Verschieben nach", symbol: "fa-folder-tree", unter: verschiebenNach([b.kennung], b.ordner) },
      { titel: "Herunterladen", symbol: "fa-download", kuerzel: "⇧ ⌘ S", ausfuehren: () => herunterladen(b.name, b.text) },
      { titel: "Im Ordner zeigen", symbol: "fa-folder-open", ausfuehren: () => { ablageverwaltung.ordnerWahl = b.ordner; ablageverwaltung.oeffnen(); } },
      "trenner",
      { titel: "In den Papierkorb", symbol: "fa-trash-can", gefahr: true, ausfuehren: () => void ablageverwaltung.entfernen([b.kennung]) },
    ],
  };
}

/** Dokument in einem Ordner: Umbenennen auf der Seite Ablage, wo es steht */
function ablageUmbenennen(b: Arbeitsblatt): void {
  ablageverwaltung.ordnerWahl = b.ordner;
  ablageverwaltung.oeffnen();
  ablageverwaltung.umbenennenStarten = b.kennung;
}
