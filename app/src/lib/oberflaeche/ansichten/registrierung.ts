// Registrierung der Ansichten: die eine Liste, aus der die Ansichtswahl entsteht (keine hart geschriebenen Reiter).
// Neue Ansichten (Statistik, Struktur, Graph, Vergleich) melden sich in Stufe 7 hier an.

import type { Component } from "svelte";
import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";
import BaumAnsicht from "./baum/BaumAnsicht.svelte";
import EditorAnsicht from "./editor/EditorAnsicht.svelte";
import TabellenAnsicht from "./tabelle/TabellenAnsicht.svelte";

export interface Ansicht {
  readonly kennung: string;
  readonly titel: string;
  readonly symbol: string;               // Font-Awesome-Klasse
  readonly komponente: Component<{ blatt: Arbeitsblatt }>;
}

export const ANSICHTEN: readonly Ansicht[] = [
  { kennung: "baum", titel: "Baum", symbol: "fa-folder-tree", komponente: BaumAnsicht },
  { kennung: "editor", titel: "Editor", symbol: "fa-code", komponente: EditorAnsicht },
  { kennung: "tabelle", titel: "Tabelle", symbol: "fa-table", komponente: TabellenAnsicht },
];

export const ansicht = (kennung: string): Ansicht => ANSICHTEN.find((a) => a.kennung === kennung) ?? ANSICHTEN[0];
