<script lang="ts">
  // Ansichtswahl (Reiterzeile über der Ansichtsfläche) in Mockup-Reihenfolge.
  // Registrierte Ansichten sind echte Reiter (Klick wechselt die Ansicht des
  // aktiven Tabs), künftige Ansichten erscheinen deaktiviert mit Tooltip.
  // Ohne Tab sind alle Reiter deaktiviert. Sonderfall Lexikon: der Reiter
  // öffnet das schwebende Panel, wechselt aber keine Ansicht und wird nie aktiv.
  import { ansichten } from '../ansichten/registry'
  import Tooltip from '../hilfsteile/Tooltip.svelte'
  import { lexikon } from '../lexikon/lexikon.svelte'
  import { aktiverTab, setzeAnsicht } from '../zustand/tabs.svelte'
  import { schliesseWerkzeug, werkzeug } from '../zustand/werkzeug.svelte'

  /** Wechselt die Ansicht und schließt ein etwaig aktives Werkzeug. */
  function waehleAnsicht(tabId: string, ansichtId: string): void {
    schliesseWerkzeug()
    setzeAnsicht(tabId, ansichtId)
  }

  interface ReiterDefinition {
    id: string
    icon: string
    titel: string
  }

  // Reihenfolge und Icons exakt wie in den Mockups (Baum vor Editor).
  const MOCKUP_REITER: ReiterDefinition[] = [
    { id: 'baum', icon: 'fa-solid fa-folder-tree', titel: 'Baum' },
    { id: 'editor', icon: 'fa-solid fa-code', titel: 'Editor' },
    { id: 'tabelle', icon: 'fa-solid fa-table', titel: 'Tabelle' },
    { id: 'statistik', icon: 'fa-solid fa-chart-column', titel: 'Statistik' },
    { id: 'schema', icon: 'fa-solid fa-diagram-project', titel: 'Schema' },
    { id: 'vergleich', icon: 'fa-solid fa-code-compare', titel: 'Vergleich' },
    { id: 'graph', icon: 'fa-solid fa-circle-nodes', titel: 'Graph' },
    { id: 'lexikon', icon: 'fa-solid fa-book-open', titel: 'Lexikon' },
  ]

  const registrierteIds = new Set(ansichten().map((modul) => modul.id))
  const tab = $derived(aktiverTab())
</script>

<div class="ansichtswahl">
  {#each MOCKUP_REITER as reiter (reiter.id)}
    {#if reiter.id === 'lexikon'}
      <button class="reiter" onclick={() => lexikon.oeffne()}>
        <i class={reiter.icon}></i>
        {reiter.titel}
      </button>
    {:else if registrierteIds.has(reiter.id) && tab !== null}
      {@const aktivesTabId = tab.id}
      <button
        class="reiter"
        class:aktiv={werkzeug.aktiv === null && tab.aktiveAnsicht === reiter.id}
        onclick={() => waehleAnsicht(aktivesTabId, reiter.id)}
      >
        <i class={reiter.icon}></i>
        {reiter.titel}
      </button>
    {:else if registrierteIds.has(reiter.id)}
      <span class="reiter deaktiviert">
        <i class={reiter.icon}></i>
        {reiter.titel}
      </span>
    {:else}
      <Tooltip text="Folgt in einer späteren Ausbaustufe">
        <span class="reiter deaktiviert">
          <i class={reiter.icon}></i>
          {reiter.titel}
        </span>
      </Tooltip>
    {/if}
  {/each}
</div>

<style>
  /* Button-Reset: die Mockups nutzen <a>-Elemente, in der App sind die
     aktiven Reiter echte Knöpfe. Optik kommt aus .reiter in app.css; die
     Zustände werden hier wegen der höheren Spezifität mitgeführt. */
  button.reiter {
    border: none;
    background: none;
    font-family: var(--schrift-anzeige);
    cursor: pointer;
  }

  button.reiter:hover {
    background: var(--akzent-weich);
    color: var(--text-1);
  }

  button.reiter.aktiv {
    background: var(--flaeche-panel);
    color: var(--text-1);
  }
</style>
