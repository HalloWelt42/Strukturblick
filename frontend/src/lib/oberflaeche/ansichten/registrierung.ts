// Registrierung der Ansichten: die eine Liste, aus der die Ansichtswahl entsteht (keine hart geschriebenen Reiter).
// Neue Ansichten melden sich hier an; ihre Stelle in der Liste gibt das Kürzel (⌥ ⌘ 1 bis 6).

import type { Component } from "svelte";
import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";
import BaumAnsicht from "./baum/BaumAnsicht.svelte";
import EditorAnsicht from "./editor/EditorAnsicht.svelte";
import TabellenAnsicht from "./tabelle/TabellenAnsicht.svelte";
import StatistikAnsicht from "./statistik/StatistikAnsicht.svelte";
import StrukturAnsicht from "./struktur/StrukturAnsicht.svelte";
import StrukturInspektor from "./struktur/StrukturInspektor.svelte";
import VergleichAnsicht from "./vergleich/VergleichAnsicht.svelte";
import VergleichInspektor from "./vergleich/VergleichInspektor.svelte";

export interface Ansicht {
  readonly kennung: string;
  readonly titel: string;
  readonly symbol: string;               // Font-Awesome-Klasse
  readonly komponente: Component<{ blatt: Arbeitsblatt }>;
  /** Eigene Karten der rechten Spalte statt der allgemeinen (Gewählt, Pfad, Werte) */
  readonly inspektor?: Component<{ blatt: Arbeitsblatt }>;
}

export const ANSICHTEN: readonly Ansicht[] = [
  { kennung: "baum", titel: "Baum", symbol: "fa-folder-tree", komponente: BaumAnsicht },
  { kennung: "editor", titel: "Editor", symbol: "fa-code", komponente: EditorAnsicht },
  { kennung: "tabelle", titel: "Tabelle", symbol: "fa-table", komponente: TabellenAnsicht },
  { kennung: "statistik", titel: "Statistik", symbol: "fa-chart-column", komponente: StatistikAnsicht },
  { kennung: "struktur", titel: "Struktur", symbol: "fa-diagram-project", komponente: StrukturAnsicht, inspektor: StrukturInspektor },
  { kennung: "vergleich", titel: "Vergleich", symbol: "fa-code-compare", komponente: VergleichAnsicht, inspektor: VergleichInspektor },
];

export const ansicht = (kennung: string): Ansicht => ANSICHTEN.find((a) => a.kennung === kennung) ?? ANSICHTEN[0];
