<script lang="ts">
  // Schwebende Meldung unten mittig, mit Aktion (Rückgängig) und Schließen.
  import { meldungen } from "../../zustand/meldungen.svelte";

  const m = $derived(meldungen.aktuell);
  const SYMBOL = { erfolg: "fa-circle-check", fehler: "fa-circle-xmark", hinweis: "fa-circle-info" } as const;
</script>

{#if m}
  {#key m.nummer}
    <div class="meldung" class:fehler={m.art === "fehler"} role={m.art === "fehler" ? "alert" : "status"}>
      <i class="fa-solid {SYMBOL[m.art]}"></i>
      <span>{m.text}</span>
      {#if m.aktion}
        {@const aktion = m.aktion}
        <button class="knopf" onclick={() => { aktion.ausfuehren(); meldungen.schliessen(); }}><i class="fa-solid fa-rotate-left"></i> {aktion.titel}</button>
      {/if}
      <button class="knopf still nur-symbol" title="Schließen" onclick={() => meldungen.schliessen()}><i class="fa-solid fa-xmark"></i></button>
    </div>
  {/key}
{/if}

<style>
  .meldung.fehler > i {
    color: var(--fehler);
  }
  .meldung > i.fa-circle-info {
    color: var(--akzent);
  }
</style>
