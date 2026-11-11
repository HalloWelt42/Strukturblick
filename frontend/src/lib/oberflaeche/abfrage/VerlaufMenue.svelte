<script lang="ts">
  // Abfragen-Verlauf als Menü im Kopf der Konsole: frühere Ausdrücke dieses Geräts, ein Klick setzt Sprache und Ausdruck.
  import { abfrageverlauf, SPRACHEN, type Gemerkt } from "../../zustand/abfrage.svelte";
  import { zeitpunkt } from "../ablage/auswahl.svelte";

  let { onwaehlen }: { onwaehlen: (g: Gemerkt) => void } = $props();

  let offen = $state(false);
  let huelle: HTMLElement | undefined = $state();
  const name = (k: string) => SPRACHEN.find((s) => s.kennung === k)?.name ?? k;

  function draussen(e: PointerEvent): void {
    if (offen && huelle && !e.composedPath().includes(huelle)) offen = false;
  }
</script>

<svelte:window onpointerdown={draussen} onkeydown={(e) => offen && e.key === "Escape" && (offen = false)} />

<span class="huelle" bind:this={huelle}>
  <button class="knopf still" title="Frühere Abfragen" aria-expanded={offen} onclick={() => (offen = !offen)}>
    <i class="fa-solid fa-clock-rotate-left"></i><span class="af-breit">Abfragen-Verlauf</span>
  </button>
  {#if offen}
    <div class="menue karte" role="menu">
      {#each abfrageverlauf.liste as g (g.sprache + g.ausdruck)}
        <div class="zeile">
          <button class="eintrag" role="menuitem" onclick={() => ((offen = false), onwaehlen(g))}>
            <span class="abzeichen">{name(g.sprache)}</span><span class="mono ausdruck">{g.ausdruck}</span><span class="text-3 klein">{zeitpunkt(g.zeit)}</span>
          </button>
          <button class="knopf still nur-symbol" title="Aus dem Verlauf entfernen" onclick={() => abfrageverlauf.entfernen(g)}><i class="fa-solid fa-xmark"></i></button>
        </div>
      {:else}
        <p class="klein text-3 leer">Noch nichts gemerkt. "In den Verlauf" oder "Als neues Dokument" legt eine Abfrage hier ab.</p>
      {/each}
    </div>
  {/if}
</span>

<style>
  .huelle {
    position: relative;
  }
  .menue {
    position: absolute;
    right: 0;
    top: calc(100% + 4px);
    z-index: 10;
    margin: 0;
    width: min(560px, 80vw);
    max-height: 360px;
    overflow-y: auto;
    box-shadow: var(--kante), var(--schatten-schwebend);
  }
  .zeile {
    display: flex;
    align-items: center;
    gap: var(--a1);
  }
  .eintrag {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--a2);
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: pointer;
  }
  .eintrag:hover {
    background: var(--akzent-weich);
  }
  .ausdruck {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .leer {
    margin: 0;
    padding: var(--a2);
  }
</style>
