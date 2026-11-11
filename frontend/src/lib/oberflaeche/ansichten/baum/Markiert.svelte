<script lang="ts">
  // Text mit markierten Fundstellen der Suche.
  import { markieren } from "../../../analyse/baumsuche";

  let { text, suche }: { text: string; suche: string } = $props();
  const abschnitte = $derived(markieren(text, suche));
</script>

{#each abschnitte as a, i (i)}{#if a.treffer}<mark>{a.text}</mark>{:else}{a.text}{/if}{/each}

<style>
  mark {
    padding: 0 1px;
    background: var(--warn-weich);
    color: var(--warn);
    font-weight: 600;
  }
</style>
