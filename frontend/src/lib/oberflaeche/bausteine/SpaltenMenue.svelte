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

<div class="menue" bind:this={huelle}>
  <button class="knopf" title={titel} aria-expanded={offen} onclick={() => (offen = !offen)}>{@render knopf()}</button>
  {#if offen}
    <div class="liste" role="menu">
      {#each spalten as s (s)}
        <button role="menuitem" onclick={() => waehlen(s)}><span class="mono">{s}</span>{#if markiert.includes(s)}<span class="abzeichen zweit">{markierung}</span>{/if}</button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .menue {
    position: relative;
  }
  .liste {
    position: absolute;
    top: calc(100% + 4px);
    right: 0;
    z-index: 20;
    min-width: 220px;
    max-height: 320px;
    overflow-y: auto;
    padding: var(--a1);
    background-color: var(--flaeche-panel-2);
    background-image: var(--erhaben);
    box-shadow: var(--kante), var(--schatten-ruhig);
  }
  .liste > button {
    display: flex;
    align-items: center;
    gap: var(--a2);
    width: 100%;
    min-height: var(--zeile);
    padding: 0 var(--a2);
    border: 0;
    background: transparent;
    font: inherit;
    font-size: var(--klein);
    color: var(--text-1);
    text-align: left;
    cursor: pointer;
  }
  .liste > button:hover {
    background: var(--flaeche-wechsel);
  }
  .liste > button .abzeichen {
    margin-left: auto;
  }
</style>
