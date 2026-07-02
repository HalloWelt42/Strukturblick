<script lang="ts">
  // Ansichtswahl (Reiterzeile über der Ansichtsfläche). Die Reiter kommen aus
  // der Ansichts-Registry; solange dort nichts angemeldet ist (Phase 0.2),
  // erscheinen die acht Mockup-Reiter deaktiviert mit Tooltip.
  import { ansichten } from '../ansichten/registry'
  import Tooltip from '../hilfsteile/Tooltip.svelte'

  interface PlatzhalterReiter {
    icon: string
    titel: string
  }

  const PLATZHALTER: PlatzhalterReiter[] = [
    { icon: 'fa-folder-tree', titel: 'Baum' },
    { icon: 'fa-code', titel: 'Editor' },
    { icon: 'fa-table', titel: 'Tabelle' },
    { icon: 'fa-chart-column', titel: 'Statistik' },
    { icon: 'fa-diagram-project', titel: 'Schema' },
    { icon: 'fa-code-compare', titel: 'Vergleich' },
    { icon: 'fa-circle-nodes', titel: 'Graph' },
    { icon: 'fa-book-open', titel: 'Lexikon' },
  ]

  const registrierteAnsichten = ansichten()
</script>

<div class="ansichtswahl">
  {#if registrierteAnsichten.length === 0}
    {#each PLATZHALTER as reiter (reiter.titel)}
      <Tooltip text="Folgt mit den ersten Dokumenten">
        <span class="reiter deaktiviert">
          <i class="fa-solid {reiter.icon}"></i>
          {reiter.titel}
        </span>
      </Tooltip>
    {/each}
  {:else}
    <!-- Aktiv-Zustand und Umschalten der Ansichten kommen in Phase 0.3. -->
    {#each registrierteAnsichten as modul (modul.id)}
      <span class="reiter">
        <i class="fa-solid {modul.icon}"></i>
        {modul.titel}
      </span>
    {/each}
  {/if}
</div>
