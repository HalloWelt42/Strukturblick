<script lang="ts">
  // Ein Knoten der Graph-Ansicht als Werte-Karte im .flow-knoten-Stil des
  // Mockups: Titelzeile mit Schluessel bzw. Listen-Index und Typ-Icon, darunter
  // eine .flow-feld-Zeile mit der Kurzvorschau des Werts in der Typfarbe
  // (.wert-*). Ein Ziel-Handle links (eingehende Kante vom Elternknoten) und
  // ein Quell-Handle rechts (Kanten zu den Kindern).
  import { Handle, Position, type NodeProps } from '@xyflow/svelte'

  interface KnotenDaten {
    icon: string
    /** Beschriftung der Titelzeile: Schluessel oder Index[n]. */
    beschriftung: string
    /** Kurzvorschau des Werts (z. B. "Erika Musterfrau", { }, [ ]). */
    vorschau: string
    /** CSS-Klasse der Typfarbe, z. B. "wert-text". */
    wertKlasse: string
    /** Zusatz rechts (z. B. "7 Schlüssel", "2 Einträge"); leer bei Skalaren. */
    zusatz: string
    [schluessel: string]: unknown
  }

  let { data }: NodeProps = $props()
  const daten = $derived(data as KnotenDaten)
</script>

<div class="flow-knoten graph-karte">
  <Handle type="target" position={Position.Left} />
  <div class="flow-titel"><i class={daten.icon}></i> {daten.beschriftung}</div>
  <div class="flow-feld">
    <span class={daten.wertKlasse}>{daten.vorschau}</span>
    {#if daten.zusatz !== ''}
      <span class="f-typ">{daten.zusatz}</span>
    {/if}
  </div>
  <Handle type="source" position={Position.Right} />
</div>

<style>
  /* Optik aus .flow-knoten in app.css; hier nur die feste Kartenbreite. */
  .graph-karte {
    position: static;
    min-width: 190px;
  }
</style>
