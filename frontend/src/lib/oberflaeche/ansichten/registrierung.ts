// Registrierung der Ansichten: die eine Liste, aus der die Ansichtswahl entsteht (keine hart geschriebenen Reiter).
// Neue Ansichten melden sich hier an; ihre Stelle in der Liste gibt das Kürzel (⌥ ⌘ 1 bis 8). Eine Ansicht, die nur zu
// bestimmten Dokumenten passt (Schema nur bei XML Schema), sagt das über verfuegbar.

import type { Component } from "svelte";
import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";
import BaumAnsicht from "./baum/BaumAnsicht.svelte";
import EditorAnsicht from "./editor/EditorAnsicht.svelte";
import TabellenAnsicht from "./tabelle/TabellenAnsicht.svelte";
import StatistikAnsicht from "./statistik/StatistikAnsicht.svelte";
import StrukturAnsicht from "./struktur/StrukturAnsicht.svelte";
import StrukturInspektor from "./struktur/StrukturInspektor.svelte";
import GraphAnsicht from "./graph/GraphAnsicht.svelte";
import GraphInspektor from "./graph/GraphInspektor.svelte";
import VergleichAnsicht from "./vergleich/VergleichAnsicht.svelte";
import VergleichInspektor from "./vergleich/VergleichInspektor.svelte";
import SchemaAnsicht from "./schema/SchemaAnsicht.svelte";
import SchemaInspektor from "./schema/SchemaInspektor.svelte";
import { istSchemaDokument } from "./schema/schemaZustand.svelte";

export interface Ansicht {
  readonly kennung: string;
  readonly titel: string;
  readonly symbol: string;               // Font-Awesome-Klasse
  readonly komponente: Component<{ blatt: Arbeitsblatt }>;
  /** Eigene Karten der rechten Spalte statt der allgemeinen (Gewählt, Pfad, Werte) */
  readonly inspektor?: Component<{ blatt: Arbeitsblatt }>;
  /** Nur bei passenden Dokumenten wählbar; ohne: immer */
  readonly verfuegbar?: (blatt: Arbeitsblatt) => boolean;
}

export const ANSICHTEN: readonly Ansicht[] = [
  { kennung: "baum", titel: "Baum", symbol: "fa-folder-tree", komponente: BaumAnsicht },
  { kennung: "editor", titel: "Editor", symbol: "fa-code", komponente: EditorAnsicht },
  { kennung: "tabelle", titel: "Tabelle", symbol: "fa-table", komponente: TabellenAnsicht },
  { kennung: "statistik", titel: "Statistik", symbol: "fa-chart-column", komponente: StatistikAnsicht },
  { kennung: "struktur", titel: "Struktur", symbol: "fa-diagram-project", komponente: StrukturAnsicht, inspektor: StrukturInspektor },
  { kennung: "graph", titel: "Graph", symbol: "fa-circle-nodes", komponente: GraphAnsicht, inspektor: GraphInspektor },
  { kennung: "vergleich", titel: "Vergleich", symbol: "fa-code-compare", komponente: VergleichAnsicht, inspektor: VergleichInspektor },
  { kennung: "schema", titel: "Schema", symbol: "fa-sitemap", komponente: SchemaAnsicht, inspektor: SchemaInspektor, verfuegbar: istSchemaDokument },
];

/** Ist die Ansicht für dieses Blatt wählbar? Die gerade gezeigte bleibt es, damit ihr Reiter nicht verschwindet */
export const ansichtWaehlbar = (a: Ansicht, blatt: Arbeitsblatt): boolean =>
  !a.verfuegbar || a.verfuegbar(blatt) || (blatt.platz.art === "ansicht" && blatt.platz.kennung === a.kennung);

/** Die Ansichten, die zum Blatt passen, in der Reihenfolge der Registrierung */
export const ansichtenFuer = (blatt: Arbeitsblatt): Ansicht[] => ANSICHTEN.filter((a) => ansichtWaehlbar(a, blatt));

export const ansicht = (kennung: string): Ansicht => ANSICHTEN.find((a) => a.kennung === kennung) ?? ANSICHTEN[0];
