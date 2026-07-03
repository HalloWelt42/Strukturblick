<script lang="ts">
  // Kopfleiste nach Mockup: links der Ein-/Ausklapp-Knopf der Seitenleiste und
  // die Marke, dann die Dokument-Tabs, rechts Theme- und Einstellungen-Knopf.
  import { naechstes } from '../theme/theme.svelte'
  import { oeffneEinstellungen } from '../zustand/einstellungenModal.svelte'
  import { layout, schalteLinksEin } from '../zustand/layout.svelte'
  import TabLeiste from './TabLeiste.svelte'
</script>

<header class="kopf">
  <button
    class="icon-knopf kopf-schalter"
    aria-label="Linke Seitenleiste ein- oder ausklappen"
    aria-pressed={!layout.linksEingeklappt}
    title="Seitenleiste ein-/ausklappen"
    onclick={schalteLinksEin}
  >
    <i class="fa-solid {layout.linksEingeklappt ? 'fa-angles-right' : 'fa-table-columns'}"></i>
  </button>
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

<style>
  /* Der Umschalter ist ein direktes Kind der Kopfleiste (align-items: stretch);
     eigene Höhe zentrieren statt strecken. */
  .kopf-schalter {
    align-self: center;
  }
</style>
