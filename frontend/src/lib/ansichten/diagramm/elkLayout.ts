// Automatisches Diagramm-Layout mit ELK (Eclipse Layout Kernel) im Browser.
// Rein gehalten und ohne DOM-Bezug, damit Schema- und Graph-Ansicht dieselbe
// Anordnung nutzen können. Der "layered"-Algorithmus ordnet die Knoten in
// Ebenen von links nach rechts (bzw. der gewünschten Richtung) und zieht die
// Kanten orthogonal - passend zum Fluss-Charakter beider Ansichten.

import ELK, { type ElkNode, type LayoutOptions } from 'elkjs/lib/elk.bundled.js'

/** Eingabe-Knoten: nur Kennung und die (geschätzte) Kartengröße. */
export interface LayoutKnoten {
  id: string
  breite: number
  hoehe: number
}

/** Eingabe-Kante: verbindet zwei Knoten-Kennungen. */
export interface LayoutKante {
  id: string
  quelle: string
  ziel: string
}

/** Errechnete linke obere Ecke eines Knotens im Diagramm-Koordinatensystem. */
export interface KnotenPosition {
  x: number
  y: number
}

/** Flussrichtung des Layouts: nach rechts (Standard) oder nach unten. */
export type LayoutRichtung = 'RIGHT' | 'DOWN'

const elk = new ELK()

/** Basis-Optionen des layered-Layouts mit großzügigen, ruhigen Abständen. */
function basisOptionen(richtung: LayoutRichtung): LayoutOptions {
  return {
    'elk.algorithm': 'layered',
    'elk.direction': richtung,
    // Abstand zwischen benachbarten Ebenen (horizontal bei RIGHT).
    'elk.layered.spacing.nodeNodeBetweenLayers': '80',
    // Abstand zwischen Knoten derselben Ebene.
    'elk.spacing.nodeNode': '32',
    // Kanten sauber orthogonal führen, wie in den Mockups.
    'elk.edgeRouting': 'ORTHOGONAL',
    'elk.layered.spacing.edgeNodeBetweenLayers': '24',
    // Überkreuzungen reduzieren für ein aufgeräumtes Bild.
    'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
    'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
  }
}

/**
 * Layoutet die übergebenen Knoten und Kanten und gibt je Knoten-Kennung die
 * linke obere Ecke zurück. Die Knotengrößen (Breite/Höhe) fließen als
 * Eingabe ein, damit ELK genug Platz einplant. Fehlt ein Knoten im Ergebnis,
 * wird er nicht in die Karte aufgenommen; die aufrufende Ansicht sollte dann
 * auf eine Standardposition (0, 0) zurückfallen.
 */
export async function layoute(
  knoten: LayoutKnoten[],
  kanten: LayoutKante[],
  richtung: LayoutRichtung = 'RIGHT',
): Promise<Map<string, KnotenPosition>> {
  const positionen = new Map<string, KnotenPosition>()
  if (knoten.length === 0) return positionen

  const graph: ElkNode = {
    id: 'wurzel',
    layoutOptions: basisOptionen(richtung),
    children: knoten.map((k) => ({ id: k.id, width: k.breite, height: k.hoehe })),
    edges: kanten.map((k) => ({ id: k.id, sources: [k.quelle], targets: [k.ziel] })),
  }

  const ergebnis = await elk.layout(graph)
  for (const kind of ergebnis.children ?? []) {
    positionen.set(kind.id, { x: kind.x ?? 0, y: kind.y ?? 0 })
  }
  return positionen
}
