// Registrierung der Werkzeuge: die eine Liste, aus der Leiste, Palette und das Segment "offenes Werkzeug" im Kopf des
// Hauptbereichs entstehen. Ein Werkzeug belegt den Platz einer Ansicht und bringt seine eigenen Inspektor-Karten mit.

import type { Component } from "svelte";
import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";
import BereinigenWerkzeug from "./bereinigen/BereinigenWerkzeug.svelte";
import BereinigenInspektor from "./bereinigen/BereinigenInspektor.svelte";
import RezepteWerkzeug from "./rezepte/RezepteWerkzeug.svelte";
import RezepteInspektor from "./rezepte/RezepteInspektor.svelte";
import ValidierenWerkzeug from "./validieren/ValidierenWerkzeug.svelte";
import ValidierenInspektor from "./validieren/ValidierenInspektor.svelte";
import ReparierenWerkzeug from "./reparieren/ReparierenWerkzeug.svelte";
import ReparierenInspektor from "./reparieren/ReparierenInspektor.svelte";
import KonvertierenWerkzeug from "./konvertieren/KonvertierenWerkzeug.svelte";
import KonvertierenInspektor from "./konvertieren/KonvertierenInspektor.svelte";
import CodeWerkzeug from "./code/CodeWerkzeug.svelte";
import CodeInspektor from "./code/CodeInspektor.svelte";

/** Abschnitte der Leiste mit Werkzeugen, in dieser Reihenfolge */
export const ABSCHNITTE = [
  { kennung: "pruefen", titel: "Prüfen und umbauen" },
  { kennung: "erzeugen", titel: "Erzeugen" },
] as const;
export type Abschnitt = (typeof ABSCHNITTE)[number]["kennung"];

export interface Werkzeug {
  readonly kennung: string;
  readonly titel: string;
  readonly beschreibung: string;
  readonly symbol: string;               // Font-Awesome-Klasse
  /** Wo die Leiste es zeigt: in einem der ABSCHNITTE oder als Kopf des Abschnitts Rezepte */
  readonly abschnitt: Abschnitt | "rezepte";
  readonly komponente: Component<{ blatt: Arbeitsblatt }>;
  /** Karten der rechten Spalte, solange das Werkzeug offen ist */
  readonly inspektor: Component<{ blatt: Arbeitsblatt }>;
}

export const WERKZEUGE: readonly Werkzeug[] = [
  {
    kennung: "validieren",
    titel: "Validieren",
    beschreibung: "Dokument gegen ein JSON Schema prüfen, Befunde mit Stelle und Vorschlag",
    symbol: "fa-clipboard-check",
    abschnitt: "pruefen",
    komponente: ValidierenWerkzeug,
    inspektor: ValidierenInspektor,
  },
  {
    kennung: "bereinigen",
    titel: "Bereinigen",
    beschreibung: "Facetten zum Filtern, ähnliche Schreibweisen zusammenführen, Typen vorschlagen",
    symbol: "fa-broom",
    abschnitt: "pruefen",
    komponente: BereinigenWerkzeug,
    inspektor: BereinigenInspektor,
  },
  {
    kennung: "reparieren",
    titel: "Reparieren",
    beschreibung: "Kaputtes JSON und JSON Lines lesbar machen: feste Regeln, jede Änderung sichtbar und einzeln abwählbar",
    symbol: "fa-screwdriver-wrench",
    abschnitt: "pruefen",
    komponente: ReparierenWerkzeug,
    inspektor: ReparierenInspektor,
  },
  {
    kennung: "konvertieren",
    titel: "Konvertieren",
    beschreibung: "In ein anderes Format umschreiben (CSV, JSON Lines, JSON, YAML) und sehen, was das Ziel nicht kann",
    symbol: "fa-shuffle",
    abschnitt: "pruefen",
    komponente: KonvertierenWerkzeug,
    inspektor: KonvertierenInspektor,
  },
  {
    kennung: "rezepte",
    titel: "Rezepte",
    beschreibung: "Aufräumschritte speichern und auf die nächste Datei gleicher Bauart anwenden",
    symbol: "fa-scroll",
    abschnitt: "rezepte",
    komponente: RezepteWerkzeug,
    inspektor: RezepteInspektor,
  },
  {
    kennung: "code",
    titel: "Code erzeugen",
    beschreibung: "Klassen in PHP, TypeScript oder Python aus dem Schema der Daten oder aus einem JSON Schema",
    symbol: "fa-file-code",
    abschnitt: "erzeugen",
    komponente: CodeWerkzeug,
    inspektor: CodeInspektor,
  },
];

export const werkzeug = (kennung: string): Werkzeug | null => WERKZEUGE.find((w) => w.kennung === kennung) ?? null;
