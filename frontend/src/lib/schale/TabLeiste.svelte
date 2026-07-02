<script lang="ts">
  // Dokument-Tabs in der Kopfleiste. In dieser Ausbaustufe gibt es noch keine
  // geöffneten Dokumente - vor dem .tab-neu-Knopf erscheinen ab Phase 0.3 die
  // echten .tab-Einträge (Icon, Dateiname, Ungespeichert-Punkt, Schließen).
  import { zeige } from '../zustand/toaster.svelte'
</script>

<div class="tabs">
  <!-- Ab Phase 0.3: {#each geoeffneteDokumente} ... .tab-Einträge ... {/each} -->
  <button
    class="tab-neu"
    aria-label="Neues Dokument"
    onclick={() => zeige('Dokumente öffnen folgt in der nächsten Ausbaustufe.', 'info')}
  >
    <i class="fa-solid fa-plus"></i>
  </button>
</div>
