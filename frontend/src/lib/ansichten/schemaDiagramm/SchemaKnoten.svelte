<script lang="ts">
  // Ein Knoten des Schema-Diagramms als Karte im .flow-knoten-Stil des Mockups:
  // eine Titelzeile (Icon + Typname) und je Feld eine .flow-feld-Zeile mit
  // Feldname (f-name, mit "*" bei Pflichtfeld) und Typanzeige (f-typ). Zwei
  // dezente Handles (links Ziel, rechts Quelle) dienen nur als Kanten-Anker.
  import { Handle, Position, type NodeProps } from '@xyflow/svelte'

  import type { TypFeld } from '../../api/typen'

  interface KnotenDaten {
    icon: string
    typname: string
    felder: TypFeld[]
    [schluessel: string]: unknown
  }

  // Svelte-Flow reicht die Knotendaten als data-Prop herein; die uebrigen
  // NodeProps (id, position ...) brauchen wir in der Darstellung nicht.
  let { data }: NodeProps = $props()
  const daten = $derived(data as KnotenDaten)
</script>

<div class="flow-knoten schema-karte">
  <Handle type="target" position={Position.Left} />
  <div class="flow-titel"><i class={daten.icon}></i> {daten.typname}</div>
  {#each daten.felder as feld (feld.name)}
    <div class="flow-feld" class:pflicht={!feld.optional}>
      <span class="f-name">{feld.name}</span>
      <span class="f-typ">{feld.typ_anzeige}</span>
    </div>
  {/each}
  <Handle type="source" position={Position.Right} />
</div>

<style>
  /* Die Optik kommt vollstaendig aus .flow-knoten in app.css. Hier nur die
     Mindestbreite, damit lange Feldtypen nicht zu eng stehen. */
  .schema-karte {
    position: static;
    min-width: 180px;
  }
</style>
