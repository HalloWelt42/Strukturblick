// Registrierung der Werkzeuge: die eine Liste, aus der Leiste, Palette und das Segment "offenes Werkzeug" im Kopf des
// Hauptbereichs entstehen. Ein Werkzeug belegt den Platz einer Ansicht und bringt seine eigenen Inspektor-Karten mit.

import type { Component } from "svelte";
import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";
import BereinigenWerkzeug from "./bereinigen/BereinigenWerkzeug.svelte";
import BereinigenInspektor from "./bereinigen/BereinigenInspektor.svelte";

export interface Werkzeug {
  readonly kennung: string;
  readonly titel: string;
  readonly beschreibung: string;
  readonly symbol: string;               // Font-Awesome-Klasse
  readonly komponente: Component<{ blatt: Arbeitsblatt }>;
  /** Karten der rechten Spalte, solange das Werkzeug offen ist */
  readonly inspektor: Component<{ blatt: Arbeitsblatt }>;
}

export const WERKZEUGE: readonly Werkzeug[] = [
  {
    kennung: "bereinigen",
    titel: "Bereinigen",
    beschreibung: "Facetten zum Filtern, ähnliche Schreibweisen zusammenführen, Typen vorschlagen",
    symbol: "fa-broom",
    komponente: BereinigenWerkzeug,
    inspektor: BereinigenInspektor,
  },
];

export const werkzeug = (kennung: string): Werkzeug | null => WERKZEUGE.find((w) => w.kennung === kennung) ?? null;
