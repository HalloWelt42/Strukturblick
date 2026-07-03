<script lang="ts">
  // Graph-Ansicht nach mockups/graph.html: die Werte des Dokuments als Karten,
  // verbunden durch Eltern-Kind-Kanten. Grosse Dokumente werden nicht komplett
  // gezeigt (das waere unlesbar), sondern im Fokus-Modus: ab der Wurzel bzw.
  // ab der aktuellen Auswahl breit-zuerst bis zu einer Knoten-Obergrenze.
  // Werkzeugzeile mit Warn-Abzeichen (nur wenn gekappt), Fokus-Pfad und dem
  // Knopf "Ganzes Dokument zeigen". Klick auf einen Knoten koppelt Baum,
  // Editor und Brotkrumen ueber die Selektion.
  import { untrack } from 'svelte'

  import {
    Background,
    BackgroundVariant,
    Controls,
    MarkerType,
    SvelteFlow,
    type Edge,
    type Node,
    type NodeTypes,
  } from '@xyflow/svelte'

  import type { JsonWert } from '../../api/typen'
  import AnalyseFehler from '../../hilfsteile/AnalyseFehler.svelte'
  import LeererZustand from '../../hilfsteile/LeererZustand.svelte'
  import { WERT_KLASSE } from '../../dienste/wertDarstellung'
  import { theme } from '../../theme/theme.svelte'
  import { selektion, setzeSelektion } from '../../zustand/selektion.svelte'
  import { aktiverTab } from '../../zustand/tabs.svelte'
  import { iconFuerTyp } from '../diagramm/symbole'
  import { layoute, type LayoutKante, type LayoutKnoten } from '../diagramm/elkLayout'
  import '../diagramm/flow.css'
  import GraphKnoten from './GraphKnoten.svelte'
  import { baueGraphModell, type GraphModell } from './graphModell'

  const nodeTypes: NodeTypes = { graph: GraphKnoten }

  /** Hoechstzahl gleichzeitig gezeigter Knoten (Fokus-Modus). */
  const KNOTEN_GRENZE = 60
  /** Geschaetzte Kartengroesse fuer die ELK-Eingabe. */
  const KARTE_BREITE = 200
  const KARTE_HOEHE = 56

  const tab = $derived(aktiverTab())
  const wurzel = $derived<JsonWert | undefined>(tab?.analyse?.wurzel)

  // Der Startpfad des Fokus. null bedeutet: ab der Wurzel. Wird per Klick oder
  // durch fremde Selektionen gesetzt und durch "Ganzes Dokument zeigen"
  // wieder auf die Wurzel zurueckgenommen.
  let fokusPfad = $state<string | null>(null)

  let nodes = $state.raw<Node[]>([])
  let edges = $state.raw<Edge[]>([])
  let modell = $state<GraphModell | null>(null)

  const startPfad = $derived(fokusPfad ?? '')

  // Tab-Wechsel: Fokus zuruecksetzen, damit nicht ein Pfad aus einem anderen
  // Dokument stehen bleibt.
  $effect(() => {
    void tab?.id
    untrack(() => {
      fokusPfad = null
    })
  })

  // Fremde Selektion (Baum, Editor, Brotkrumen, ...): Fokus um den Pfad neu
  // aufbauen. Eigene Klicks (quelle === "graph") werden ignoriert, um keine
  // Rueckkopplung auszuloesen.
  $effect(() => {
    const auswahl = selektion.aktuell
    if (auswahl === null || auswahl.pfad === null || auswahl.quelle === 'graph') return
    const pfad = auswahl.pfad
    untrack(() => {
      const aktuell = aktiverTab()
      if (aktuell === null || auswahl.tabId !== aktuell.id) return
      fokusPfad = pfad
    })
  })

  // Graph-Modell bauen und via ELK anordnen. Neu bei Dokument- oder
  // Fokus-Wechsel sowie beim Theme-Wechsel (fuer die Kantenfarbe).
  $effect(() => {
    const baum = wurzel
    const start = startPfad
    void theme.aktivId
    if (baum === undefined) {
      nodes = []
      edges = []
      modell = null
      return
    }
    const gebaut = baueGraphModell(baum, start, KNOTEN_GRENZE)
    modell = gebaut
    let abgebrochen = false
    void ordneAn(gebaut).then((ergebnis) => {
      if (abgebrochen) return
      nodes = ergebnis.nodes
      edges = ergebnis.edges
    })
    return () => {
      abgebrochen = true
    }
  })

  /** Aktuelle Kantenfarbe aus dem Theme (fuer Inline-Stroke und Pfeilspitze). */
  function kantenFarbe(): string {
    return getComputedStyle(document.documentElement).getPropertyValue('--text-3').trim() || '#888'
  }

  async function ordneAn(g: GraphModell): Promise<{ nodes: Node[]; edges: Edge[] }> {
    const layoutKnoten: LayoutKnoten[] = g.knoten.map((k) => ({
      id: k.pfad,
      breite: KARTE_BREITE,
      hoehe: KARTE_HOEHE,
    }))
    const layoutKanten: LayoutKante[] = g.kanten.map((k) => ({
      id: `${k.quelle}->${k.ziel}`,
      quelle: k.quelle,
      ziel: k.ziel,
    }))
    const positionen = await layoute(layoutKnoten, layoutKanten, 'RIGHT')
    const farbe = kantenFarbe()

    const flowNodes: Node[] = g.knoten.map((k) => ({
      id: k.pfad,
      type: 'graph',
      position: positionen.get(k.pfad) ?? { x: 0, y: 0 },
      data: {
        icon: iconFuerTyp(k.typ),
        beschriftung: k.beschriftung,
        vorschau: k.vorschau,
        wertKlasse: WERT_KLASSE[k.typ],
        zusatz: k.zusatz,
      },
      draggable: true,
    }))

    const flowEdges: Edge[] = g.kanten.map((k) => ({
      id: `${k.quelle}->${k.ziel}`,
      source: k.quelle,
      target: k.ziel,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: farbe },
      style: `stroke: ${farbe}; stroke-width: 1.5;`,
    }))

    return { nodes: flowNodes, edges: flowEdges }
  }

  /** Fokus-Pfad als lesbare Adresse ("$" fuer die Wurzel). */
  const fokusText = $derived(startPfad === '' ? '$' : startPfad)

  /** Klick auf einen Knoten: Auswahl setzen (koppelt Baum/Editor/Brotkrumen). */
  function beiKnotenKlick({ node }: { node: Node }): void {
    const aktuell = tab
    if (aktuell === null) return
    setzeSelektion({ tabId: aktuell.id, pfad: node.id, quelle: 'graph' })
    // Klick fokussiert zugleich neu um den Knoten (er selbst ist "graph"-Quelle,
    // der Selektions-Effekt greift also nicht - daher hier direkt).
    fokusPfad = node.id
  }

  function ganzesDokumentZeigen(): void {
    fokusPfad = null
  }

</script>

{#if tab !== null}
  <div class="werkzeugzeile">
    {#if modell !== null && modell.gekappt}
      <span class="abzeichen warnung">
        <i class="fa-solid fa-triangle-exclamation"></i> Großes Dokument - Fokus-Modus aktiv
      </span>
    {/if}
    <span class="beschriftung">Fokus:</span>
    <code>{fokusText}</code>
    <span class="luecke"></span>
    {#if fokusPfad !== null}
      <button class="knopf klein" onclick={ganzesDokumentZeigen}>
        <i class="fa-solid fa-expand"></i> Ganzes Dokument zeigen
      </button>
    {/if}
  </div>

  {#if modell !== null && modell.gekappt}
    <div class="graph-kapp-hinweis">
      <i class="fa-solid fa-circle-info"></i>
      {modell.knoten.length} von {modell.gesamt} Knoten - nutze den Fokus (Knoten anklicken),
      um andere Bereiche zu zeigen.
    </div>
  {/if}

  {#if wurzel !== undefined && modell !== null && modell.knoten.length > 0}
    <div class="flow-buehne">
      <SvelteFlow
        bind:nodes
        bind:edges
        {nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
        nodesConnectable={false}
        elementsSelectable={true}
        onnodeclick={beiKnotenKlick}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Lines} gap={24} />
        <Controls showLock={false} />
      </SvelteFlow>
    </div>
  {:else if tab.analyseStand === 'fehler'}
    <AnalyseFehler {tab} titel="Kein Graph verfügbar" />
  {:else if wurzel !== undefined}
    <LeererZustand
      icon="fa-circle-nodes"
      titel="Nichts anzuzeigen"
      text="Der gewählte Fokus enthält keine darstellbaren Werte."
    />
  {:else}
    <div class="flow-buehne graph-laedt">
      <div class="skelett-karten">
        {#each [0, 1, 2, 3, 4] as index (index)}
          <span class="skelett skelett-karte"></span>
        {/each}
      </div>
    </div>
  {/if}
{/if}

<style>
  .graph-kapp-hinweis {
    display: flex;
    align-items: center;
    gap: var(--a2);
    padding: var(--a2) var(--a3);
    color: var(--text-2);
    font-size: 0.82rem;
  }

  .graph-laedt {
    display: flex;
    align-items: flex-start;
  }

  .skelett-karten {
    display: flex;
    flex-wrap: wrap;
    gap: var(--a4);
    padding: var(--a4);
  }

  .skelett-karte {
    display: block;
    width: 190px;
    height: 60px;
  }
</style>
