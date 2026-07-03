<script lang="ts">
  // Schema-Diagramm nach mockups/schema.html: die aus den Daten abgeleiteten
  // Typen als .flow-knoten-Karten, verbunden durch Kanten mit Kardinalitäts-
  // Beschriftung (1 bzw. 0..n). Werkzeugzeile mit Abzeichen "Aus den Daten
  // abgeleitet", JSON-Schema-Export, "Neu ableiten" und dem Kardinalitäts-
  // Hinweis. Anordnung automatisch über ELK, Pan/Zoom bringt Svelte-Flow mit.
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

  import { schemaAbleiten } from '../../api/analyse'
  import type { TypDefinition, TypModellAntwort } from '../../api/typen'
  import { ladeHerunter } from '../../dienste/dateiEinAusgabe'
  import AnalyseFehler from '../../hilfsteile/AnalyseFehler.svelte'
  import LeererZustand from '../../hilfsteile/LeererZustand.svelte'
  import FachbegriffLink from '../../lexikon/FachbegriffLink.svelte'
  import { theme } from '../../theme/theme.svelte'
  import { extrasFuer, ladeTypmodell } from '../../zustand/analyseExtras.svelte'
  import { setzeSelektion } from '../../zustand/selektion.svelte'
  import { aktiverTab } from '../../zustand/tabs.svelte'
  import { iconFuerSchemaTyp } from '../diagramm/symbole'
  import { layoute, type LayoutKante, type LayoutKnoten } from '../diagramm/elkLayout'
  import '../diagramm/flow.css'
  import SchemaKnoten from './SchemaKnoten.svelte'

  const nodeTypes: NodeTypes = { schema: SchemaKnoten }

  /** Geschätzte Kartenbreite in Pixeln (deckt lange Feldtypen ab). */
  const KARTE_BREITE = 220
  /** Höhe der Titelzeile plus je Feld eine Zeile - für die ELK-Eingabe. */
  const TITEL_HOEHE = 30
  const FELD_HOEHE = 20

  const tab = $derived(aktiverTab())
  const eintrag = $derived(
    tab !== null && tab.analyse !== null ? extrasFuer(tab.analyse.dokument_hash) : undefined,
  )
  const typmodell = $derived(eintrag?.typmodell)

  let nodes = $state.raw<Node[]>([])
  let edges = $state.raw<Edge[]>([])
  let exportiertGerade = $state(false)
  let exportFehler = $state<string | null>(null)

  // Typmodell beim ersten Anzeigen laden (Guards in ladeTypmodell verhindern
  // Wiederholungen; "Neu ableiten" erzwingt).
  $effect(() => {
    const aktuell = tab
    if (aktuell === null || aktuell.analyse === null) return
    const extras = extrasFuer(aktuell.analyse.dokument_hash)
    if (extras !== undefined && extras.fehler !== null) return
    if (extras?.typmodell === undefined) void ladeTypmodell(aktuell)
  })

  // Aus dem Typmodell Knoten und Kanten bauen und via ELK anordnen. Der
  // theme.aktivId-Lesezugriff erzwingt einen Neuaufbau beim Theme-Wechsel,
  // damit inline gesetzte Kantenfarben (Pfeilspitze) mitziehen.
  $effect(() => {
    const modell = typmodell
    void theme.aktivId
    if (modell === undefined) {
      nodes = []
      edges = []
      return
    }
    let abgebrochen = false
    void baueDiagramm(modell).then((ergebnis) => {
      if (abgebrochen) return
      nodes = ergebnis.nodes
      edges = ergebnis.edges
    })
    return () => {
      abgebrochen = true
    }
  })

  /** Vollständige Icon-Klasse für die Pfeilspitze in Kantenfarbe. */
  function kantenFarbe(): string {
    return getComputedStyle(document.documentElement).getPropertyValue('--text-3').trim() || '#888'
  }

  async function baueDiagramm(
    modell: TypModellAntwort,
  ): Promise<{ nodes: Node[]; edges: Edge[] }> {
    const definitionen = modell.typen
    const bekannt = new Set(definitionen.map((d) => d.name))

    const layoutKnoten: LayoutKnoten[] = definitionen.map((def) => ({
      id: def.name,
      breite: KARTE_BREITE,
      hoehe: TITEL_HOEHE + def.felder.length * FELD_HOEHE,
    }))

    const layoutKanten: LayoutKante[] = []
    for (const def of definitionen) {
      for (const feld of def.felder) {
        if (feld.referenz === null || !bekannt.has(feld.referenz)) continue
        layoutKanten.push({
          id: `${def.name}--${feld.name}--${feld.referenz}`,
          quelle: def.name,
          ziel: feld.referenz,
        })
      }
    }

    const positionen = await layoute(layoutKnoten, layoutKanten, 'RIGHT')
    const farbe = kantenFarbe()

    const flowNodes: Node[] = definitionen.map((def: TypDefinition) => {
      const istWurzel = def.name === modell.wurzel_name
      const pos = positionen.get(def.name) ?? { x: 0, y: 0 }
      return {
        id: def.name,
        type: 'schema',
        position: pos,
        data: {
          icon: iconFuerSchemaTyp(istWurzel),
          typname: def.name,
          felder: def.felder,
        },
        draggable: true,
      }
    })

    const flowEdges: Edge[] = []
    for (const def of definitionen) {
      for (const feld of def.felder) {
        if (feld.referenz === null || !bekannt.has(feld.referenz)) continue
        flowEdges.push({
          id: `${def.name}--${feld.name}--${feld.referenz}`,
          source: def.name,
          target: feld.referenz,
          label: feld.ist_liste ? '0..n' : '1',
          type: 'smoothstep',
          markerEnd: { type: MarkerType.ArrowClosed, color: farbe },
          style: `stroke: ${farbe}; stroke-width: 1.5;`,
        })
      }
    }

    return { nodes: flowNodes, edges: flowEdges }
  }

  function neuAbleiten(): void {
    const aktuell = tab
    if (aktuell === null || aktuell.analyse === null) return
    void ladeTypmodell(aktuell, true)
  }

  async function schemaExportieren(): Promise<void> {
    const aktuell = tab
    if (aktuell === null || aktuell.analyse === null || exportiertGerade) return
    exportiertGerade = true
    exportFehler = null
    try {
      const antwort = await schemaAbleiten({
        dokument: { dokument_hash: aktuell.analyse.dokument_hash },
        art: 'json_schema',
      })
      const basis = (typmodell?.wurzel_name ?? 'schema').toLowerCase()
      ladeHerunter(
        `${basis}.schema.json`,
        JSON.stringify(antwort.schema, null, 2),
        'application/json;charset=utf-8',
      )
    } catch (grund: unknown) {
      // Fehlt das Dokument im Backend-Cache, einmal mit vollem Inhalt.
      try {
        const antwort = await schemaAbleiten({
          dokument: { inhalt_text: aktuell.inhalt, dateiname: aktuell.titel },
          art: 'json_schema',
        })
        const basis = (typmodell?.wurzel_name ?? 'schema').toLowerCase()
        ladeHerunter(
          `${basis}.schema.json`,
          JSON.stringify(antwort.schema, null, 2),
          'application/json;charset=utf-8',
        )
      } catch {
        exportFehler = grund instanceof Error ? grund.message : String(grund)
      }
    } finally {
      exportiertGerade = false
    }
  }

  /** Klick auf einen Typ-Knoten: nur die Wurzel lässt sich eindeutig einem
   *  Pfad zuordnen ("") und wird gekoppelt. Benannte Typen können an mehreren
   *  Stellen vorkommen, sind also nicht eindeutig - dort passiert nichts. */
  function beiKnotenKlick({ node }: { node: Node }): void {
    const aktuell = tab
    if (aktuell === null || typmodell === undefined) return
    if (node.id === typmodell.wurzel_name) {
      setzeSelektion({ tabId: aktuell.id, pfad: '', quelle: 'schema' })
    }
  }

</script>

{#if tab !== null}
  <div class="werkzeugzeile">
    <span class="abzeichen info"><i class="fa-solid fa-circle-info"></i> Aus den Daten abgeleitet</span>
    <button
      class="knopf klein"
      onclick={schemaExportieren}
      disabled={tab.analyse === null || exportiertGerade}
    >
      <i class="fa-solid fa-file-export"></i>
      <span class="fachbegriff">JSON Schema</span> exportieren
    </button>
    <button class="knopf klein" onclick={neuAbleiten} disabled={tab.analyse === null}>
      <i class="fa-solid fa-arrows-rotate"></i> Neu ableiten
    </button>
    <span class="luecke"></span>
    <span class="hinweis-text">
      Kanten zeigen die
      <FachbegriffLink topic="kardinalitaet">Kardinalität</FachbegriffLink>: 1 genau eines, 0..n
      beliebig viele.
    </span>
  </div>

  {#if exportFehler !== null}
    <div class="schema-export-fehler">
      <i class="fa-solid fa-triangle-exclamation"></i>
      Das Schema konnte nicht exportiert werden: {exportFehler}
    </div>
  {/if}

  {#if typmodell !== undefined && typmodell.typen.length > 0}
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
  {:else if eintrag !== undefined && eintrag.fehler !== null}
    <LeererZustand
      icon="fa-triangle-exclamation"
      titel="Kein Schema verfügbar"
      text="Das Typmodell konnte nicht abgeleitet werden: {eintrag.fehler}"
    >
      {#snippet aktionen()}
        <button class="knopf primaer" onclick={neuAbleiten}>
          <i class="fa-solid fa-arrows-rotate"></i> Erneut versuchen
        </button>
      {/snippet}
    </LeererZustand>
  {:else if tab.analyseStand === 'fehler'}
    <AnalyseFehler {tab} titel="Keine Struktur verfügbar" />
  {:else if typmodell !== undefined}
    <LeererZustand
      icon="fa-diagram-project"
      titel="Keine benannten Typen"
      text="Aus diesem Dokument ließen sich keine Typen ableiten."
    />
  {:else}
    <div class="flow-buehne schema-laedt">
      <div class="skelett-karten">
        {#each [0, 1, 2, 3] as index (index)}
          <span class="skelett skelett-karte"></span>
        {/each}
      </div>
    </div>
  {/if}
{/if}

<style>
  .schema-export-fehler {
    display: flex;
    align-items: center;
    gap: var(--a2);
    padding: var(--a2) var(--a3);
    color: var(--zustand-fehler);
    font-size: 0.84rem;
  }

  /* Skelett während des Ladens: ein paar angedeutete Karten auf dem Raster. */
  .schema-laedt {
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
    width: 200px;
    height: 120px;
  }
</style>
