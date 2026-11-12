<script lang="ts">
  // i-Knopf an einem Bedienelement: öffnet das Lexikon genau beim passenden Thema und Abschnitt (Tiefenlink), damit die
  // Erklärung im Moment der Entscheidung da ist. Erscheint nur, wenn es das Thema gibt.
  import { thema as themaVon } from "./themen";
  import { lexikon } from "./lexikonZustand.svelte";

  let { thema, abschnitt = null, titel = "" }: { thema: string; abschnitt?: string | null; titel?: string } = $props();
  const t = $derived(themaVon(thema));
</script>

{#if t}
  <button class="lx-knopf" type="button" title="Im Lexikon: {titel || t.titel}" aria-label="Im Lexikon: {titel || t.titel}" onclick={(e) => { e.stopPropagation(); lexikon.zeige(thema, abschnitt); }}><i class="fa-solid fa-circle-info"></i></button>
{/if}

<style>
  .lx-knopf {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 2px;
    border: 0;
    background: transparent;
    color: var(--text-3);
    font-size: var(--klein);
    cursor: pointer;
  }
  .lx-knopf:hover {
    color: var(--akzent);
  }
</style>
