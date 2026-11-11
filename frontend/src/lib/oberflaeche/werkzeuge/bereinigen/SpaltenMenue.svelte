<script lang="ts">
  // Knopf mit Menü der Spalten einer Tabelle (Facette hinzufügen, Spalte für ähnliche Werte wählen).
  import type { Snippet } from "svelte";

  let {
    spalten,
    titel,
    knopf,
    markiert = [],
    markierung = "offen",
    onwahl,
  }: {
    spalten: readonly string[];
    titel: string;
    knopf: Snippet;
    /** Spalten mit Abzeichen (schon offen, gerade gewählt) */
    markiert?: readonly string[];
    markierung?: string;
    onwahl: (spalte: string) => void;
  } = $props();

  let offen = $state(false);
  let huelle: HTMLElement | undefined = $state();

  function waehlen(s: string): void {
    offen = false;
    onwahl(s);
  }
</script>

<svelte:window onpointerdown={(e) => offen && huelle && !e.composedPath().includes(huelle) && (offen = false)} onkeydown={(e) => offen && e.key === "Escape" && (offen = false)} />

<div class="br-menue" bind:this={huelle}>
  <button class="knopf" title={titel} aria-expanded={offen} onclick={() => (offen = !offen)}>{@render knopf()}</button>
  {#if offen}
    <div class="br-menue-liste" role="menu">
      {#each spalten as s (s)}
        <button role="menuitem" onclick={() => waehlen(s)}><span class="mono">{s}</span>{#if markiert.includes(s)}<span class="abzeichen zweit">{markierung}</span>{/if}</button>
      {/each}
    </div>
  {/if}
</div>
