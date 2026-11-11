// Register der Aktionen: jeder Befehl der Oberfläche genau einmal, mit Titel, Symbol, Tastenkürzel und der Frage, ob
// er gerade geht. Palette, Tastatur und Knöpfe (Kopf, Leiste) lesen von hier; ein neuer Befehl ist ein Eintrag hier.
// Je Ansicht, Schreibweise, Thema und Schriftstufe entsteht der Befehl aus deren Registern, nicht von Hand.
//
// Kürzel mit Befehl und Alt (⌥ ⌘) für alles, was der Browser selbst belegt: ⌘ N, ⌘ W und ⌘ 1 bis 9 bekommt eine Seite
// nicht zu fassen.

import { KEIN, SCHREIBWEISEN, SCHREIBWEISE_NAME, knotenZu, schreiben, teileVon, type Schreibweise } from "../../kern";
import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
import { ablageverwaltung } from "../../zustand/ablageverwaltung.svelte";
import { abfrage, SPRACHEN } from "../../zustand/abfrage.svelte";
import { beispieleOeffnen, BEISPIEL_ORDNER } from "../../zustand/beispiele";
import { starthinweis } from "../../zustand/starthinweis.svelte";
import { einstellungen, SCHRIFTSTUFEN, THEMEN } from "../../zustand/einstellungen.svelte";
import { meldungen } from "../../zustand/meldungen.svelte";
import { zugang } from "../../zustand/zugang.svelte";
import { ANSICHTEN } from "../ansichten/registrierung";
import { WERKZEUGE } from "../werkzeuge/registrierung";
import { dateiWaehlen, herunterladen } from "../schale/dateien";
import type { Tasten } from "../palette/tasten";

export interface Aktion {
  readonly kennung: string;
  readonly titel: string;
  readonly beschreibung: string;
  readonly symbol: string;
  /** Erstes Kürzel wird angezeigt, weitere gelten auch (Wiederholen: ⇧ ⌘ Z und ⌘ Y) */
  readonly tasten?: readonly Tasten[];
  /** Das Kürzel gilt auch in Eingabefeldern und im Editor (Ablegen, Öffnen); sonst bleibt die Taste beim Feld */
  readonly ueberall?: boolean;
  verfuegbar(): boolean;
  ausfuehren(): void;
}

const blatt = () => arbeitsplatz.aktivesBlatt;
const imBlatt = () => arbeitsplatz.seite === "blatt" && blatt() !== null;

function gewaehlterPfad(weise: Schreibweise): string | null {
  const b = blatt();
  const index = b?.analyse?.index;
  if (!b || !index || b.gewaehlt === null) return null;
  const k = knotenZu(index, b.analyseText, b.gewaehlt);
  return k === KEIN ? null : schreiben(teileVon(index, b.analyseText, k), weise);
}

async function kopieren(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    meldungen.zeigen({ text: text ? `Kopiert: ${text}` : "Leeren Zeiger kopiert (das ganze Dokument)", art: "erfolg" });
  } catch {
    meldungen.zeigen({ text: "Kopieren ging nicht: Der Browser erlaubt hier keinen Zugriff auf die Zwischenablage. Der Pfad steht im Inspektor zum Markieren.", art: "fehler" });
  }
}

const VERLAUF: readonly Aktion[] = [
  {
    kennung: "rueckgaengig",
    titel: "Rückgängig",
    get beschreibung() {
      const b = blatt();
      return b?.kannZurueck ? (b.verlauf.eintraege[b.verlauf.zeiger - 1]?.aufruf.titel ?? "") : "Nichts rückgängig zu machen";
    },
    symbol: "fa-rotate-left",
    tasten: [{ taste: "z", befehl: true }],
    verfuegbar: () => !!blatt()?.kannZurueck,
    ausfuehren: () => blatt()?.rueckgaengig(),
  },
  {
    kennung: "wiederholen",
    titel: "Wiederholen",
    get beschreibung() {
      const b = blatt();
      return b?.kannVor ? (b.verlauf.eintraege[b.verlauf.zeiger]?.aufruf.titel ?? "") : "Nichts zu wiederholen";
    },
    symbol: "fa-rotate-right",
    tasten: [{ taste: "z", befehl: true, umschalt: true }, { taste: "y", befehl: true }],
    verfuegbar: () => !!blatt()?.kannVor,
    ausfuehren: () => blatt()?.wiederholen(),
  },
];

const DOKUMENTE: readonly Aktion[] = [
  {
    kennung: "dokument-neu",
    titel: "Neues Dokument",
    beschreibung: "Leeres Dokument im Editor",
    symbol: "fa-file-circle-plus",
    tasten: [{ taste: "n", befehl: true, alt: true }],
    verfuegbar: () => true,
    ausfuehren: () => void arbeitsplatz.leeresDokument(),
  },
  {
    kennung: "datei-oeffnen",
    titel: "Datei öffnen",
    get beschreibung() {
      return `Vom Gerät in die Ablage (${arbeitsplatz.ablage.ort})`;
    },
    symbol: "fa-folder-open",
    tasten: [{ taste: "o", befehl: true }],
    ueberall: true,
    verfuegbar: () => true,
    ausfuehren: () => {
      // Der Datei-Wähler muss im selben Tastendruck aufgehen, sonst sperrt ihn der Browser
      const ordner = arbeitsplatz.seite === "ablage" ? (ablageverwaltung.ordnerWahl ?? "") : "";
      void dateiWaehlen().then(async (dateien) => {
        for (const d of dateien) await arbeitsplatz.dateiOeffnen(d, ordner);
      });
    },
  },
  {
    kennung: "beispiele",
    titel: "Beispiele öffnen",
    beschreibung: `Erfundene Daten zum Üben (Bestellungen, Kunden, Dienste) im Ordner ${BEISPIEL_ORDNER}`,
    symbol: "fa-flask",
    verfuegbar: () => true,
    ausfuehren: () => void beispieleOeffnen(),
  },
  {
    kennung: "ablegen",
    titel: "Jetzt ablegen",
    get beschreibung() {
      return `Alle offenen Dokumente sofort ablegen (${arbeitsplatz.ablage.ort}); geschieht sonst von selbst`;
    },
    symbol: "fa-floppy-disk",
    tasten: [{ taste: "s", befehl: true }],
    ueberall: true,
    verfuegbar: () => true,
    ausfuehren: () => void arbeitsplatz.allesSpeichern().then(() => meldungen.zeigen({ text: "Alles abgelegt", art: "erfolg" })),
  },
  {
    kennung: "papierkorb",
    titel: "Dokument in den Papierkorb",
    get beschreibung() {
      const b = blatt();
      return b ? `${b.name} schließen und in den Papierkorb legen (Rückgängig in der Meldung, 30 Tage wiederherstellbar)` : "Das offene Dokument";
    },
    symbol: "fa-trash-can",
    verfuegbar: () => blatt() !== null,
    ausfuehren: () => {
      const b = blatt();
      if (b) void ablageverwaltung.entfernen([b.kennung]);
    },
  },
  {
    kennung: "herunterladen",
    titel: "Dokument herunterladen",
    get beschreibung() {
      return blatt()?.name ?? "Das offene Dokument als Datei";
    },
    symbol: "fa-download",
    tasten: [{ taste: "s", befehl: true, umschalt: true }],
    ueberall: true,
    verfuegbar: () => blatt() !== null,
    ausfuehren: () => {
      const b = blatt();
      if (b) herunterladen(b.name, b.text);
    },
  },
  {
    kennung: "dokument-schliessen",
    titel: "Dokument schließen",
    beschreibung: "Bleibt in der Ablage",
    symbol: "fa-xmark",
    tasten: [{ taste: "w", befehl: true, alt: true }],
    verfuegbar: () => blatt() !== null,
    ausfuehren: () => {
      const b = blatt();
      if (b) void arbeitsplatz.schliessen(b);
    },
  },
  {
    kennung: "ablage",
    get titel() {
      return arbeitsplatz.seite === "ablage" ? "Ablage schließen" : "Ablage verwalten";
    },
    beschreibung: "Ordner, Umbenennen, Verschieben, Papierkorb, Sichern",
    symbol: "fa-folder-tree",
    tasten: [{ taste: "a", befehl: true, alt: true }],
    verfuegbar: () => true,
    ausfuehren: () => (arbeitsplatz.seite === "ablage" ? ablageverwaltung.schliessen() : ablageverwaltung.oeffnen()),
  },
];

/** Ansichtswahl; die Palette zeigt sie in der eigenen Gruppe Ansichten */
export const ANSICHT_WAHL: readonly Aktion[] = ANSICHTEN.map((a, i) => ({
  kennung: `ansicht-${a.kennung}`,
  titel: `Ansicht ${a.titel}`,
  beschreibung: "Das offene Dokument in dieser Ansicht",
  symbol: a.symbol,
  tasten: i < 9 ? [{ taste: String(i + 1), befehl: true, alt: true }] : undefined,
  verfuegbar: () => blatt() !== null,
  ausfuehren: () => {
    ablageverwaltung.schliessen();
    blatt()?.zeigen({ art: "ansicht", kennung: a.kennung });
  },
}));

export const WERKZEUG_WAHL: readonly Aktion[] = WERKZEUGE.map((w) => ({
  kennung: `werkzeug-${w.kennung}`,
  titel: w.titel,
  beschreibung: w.beschreibung,
  symbol: w.symbol,
  verfuegbar: () => blatt() !== null,
  ausfuehren: () => {
    ablageverwaltung.schliessen();
    blatt()?.zeigen({ art: "werkzeug", kennung: w.kennung });
  },
}));

const PFADE: readonly Aktion[] = SCHREIBWEISEN.map((w) => ({
  kennung: `pfad-${w}`,
  titel: `Pfad als ${SCHREIBWEISE_NAME[w]} kopieren`,
  get beschreibung() {
    const p = gewaehlterPfad(w);
    return p === null ? "Erst im Baum oder in der Tabelle etwas wählen" : p || "Leerer Zeiger: das ganze Dokument";
  },
  symbol: "fa-copy",
  verfuegbar: () => imBlatt() && gewaehlterPfad(w) !== null,
  ausfuehren: () => {
    const p = gewaehlterPfad(w);
    if (p !== null) void kopieren(p);
  },
}));

const ABFRAGE: readonly Aktion[] = [
  {
    kennung: "abfrage",
    get titel() {
      return abfrage.offen ? "Abfrage einklappen" : "Abfrage öffnen";
    },
    beschreibung: "jq, SQL, JSONPath und Suche, Ergebnis beim Tippen",
    symbol: "fa-terminal",
    tasten: [{ taste: "e", befehl: true, alt: true }],
    verfuegbar: imBlatt,
    ausfuehren: () => (abfrage.offen ? abfrage.schliessen() : abfrage.oeffnen()),
  },
  ...SPRACHEN.map((x) => ({
    kennung: `abfrage-${x.kennung}`,
    titel: `Abfrage mit ${x.name}`,
    beschreibung: x.ueberAlle ? "Über alle geöffneten Dokumente" : "Auf dem offenen Dokument",
    symbol: "fa-terminal",
    verfuegbar: imBlatt,
    ausfuehren: () => abfrage.oeffnen(x.kennung),
  })),
];

const ANZEIGE: readonly Aktion[] = [
  ...THEMEN.map((t) => ({
    kennung: `thema-${t.kennung}`,
    titel: `Thema: ${t.name}`,
    beschreibung: "Anzeige auf diesem Gerät",
    symbol: "fa-circle-half-stroke",
    verfuegbar: () => einstellungen.thema !== t.kennung,
    ausfuehren: () => einstellungen.setzen({ thema: t.kennung }),
  })),
  ...SCHRIFTSTUFEN.map((s) => ({
    kennung: `schrift-${s.kennung}`,
    titel: `Schrift: ${s.name}`,
    beschreibung: `Grundschrift ${s.px} px auf diesem Gerät`,
    symbol: "fa-text-height",
    verfuegbar: () => einstellungen.schrift !== s.kennung,
    ausfuehren: () => einstellungen.setzen({ schrift: s.kennung }),
  })),
];

const ZUGANG: readonly Aktion[] = [
  {
    kennung: "ueber",
    titel: "Über Strukturblick",
    beschreibung: "Nutzung, Datenschutz, Betaphase und Lizenzen",
    symbol: "fa-circle-info",
    verfuegbar: () => true,
    ausfuehren: () => starthinweis.oeffnen(),
  },
  {
    kennung: "abmelden",
    titel: "Abmelden",
    get beschreibung() {
      return `Angemeldet als ${zugang.konto ?? ""}; alles wird vorher abgelegt`;
    },
    symbol: "fa-right-from-bracket",
    verfuegbar: () => zugang.konto !== null,
    ausfuehren: () => void zugang.abmelden(),
  },
];

export const AKTIONEN: readonly Aktion[] = [...VERLAUF, ...DOKUMENTE, ...ANSICHT_WAHL, ...WERKZEUG_WAHL, ...ABFRAGE, ...PFADE, ...ANZEIGE, ...ZUGANG];

export function aktion(kennung: string): Aktion {
  const a = AKTIONEN.find((x) => x.kennung === kennung);
  if (!a) throw new Error(`Unbekannte Aktion ${kennung}`);
  return a;
}
