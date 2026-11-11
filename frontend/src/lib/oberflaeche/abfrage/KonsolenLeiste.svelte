<script lang="ts">
  // Eingeklappte Abfrage am Fuß des Hauptbereichs (Entwurf entwuerfe/palette.html): Sprachen, der aktuelle Ausdruck,
  // Treffer, Öffnen. Ein Klick auf eine Sprache öffnet die Konsole in dieser Sprache.
  import { abfrage, SPRACHEN } from "../../zustand/abfrage.svelte";

  let { treffer }: { treffer: number | null } = $props();
</script>

<div class="konsole-leiste">
  <i class="fa-solid fa-terminal"></i>
  <nav class="segment" aria-label="Sprache der Abfrage">
    {#each SPRACHEN as s (s.kennung)}
      <button class:aktiv={abfrage.sprache === s.kennung} onclick={() => abfrage.oeffnen(s.kennung)}>{s.name}</button>
    {/each}
  </nav>
  <button class="vorschau mono" title="Abfrage öffnen" onclick={() => abfrage.oeffnen()}>{abfrage.ausdruck || "Abfrage mit jq, SQL, JSONPath oder Suche"}</button>
  <span class="rechts">
    {#if treffer !== null}<span class="abzeichen">{treffer} Treffer</span>{/if}
    <button class="knopf" onclick={() => abfrage.oeffnen()}><i class="fa-solid fa-chevron-up"></i> Öffnen</button>
  </span>
</div>

<style>
  .vorschau {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    border: 0;
    background: transparent;
    color: var(--text-3);
    font-size: var(--klein);
    text-align: left;
    cursor: text;
  }
</style>
