<script lang="ts">
  // Kopfleiste nach Mockup: Marke, Dokument-Tabs, rechts Theme- und
  // Einstellungen-Knopf.
  import { naechstes } from '../theme/theme.svelte'
  import { oeffneEinstellungen } from '../zustand/einstellungenModal.svelte'
  import TabLeiste from './TabLeiste.svelte'
</script>

<header class="kopf">
  <div class="marke"><i class="fa-solid fa-sitemap"></i> Strukturblick</div>
  <TabLeiste />
  <div class="kopf-rechts">
    <button class="icon-knopf" aria-label="Thema wechseln" onclick={() => naechstes()}>
      <i class="fa-solid fa-circle-half-stroke"></i>
    </button>
    <button class="icon-knopf" aria-label="Einstellungen" onclick={oeffneEinstellungen}>
      <i class="fa-solid fa-gear"></i>
    </button>
  </div>
</header>
