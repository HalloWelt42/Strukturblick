<script lang="ts">
  // Fenster mit dem Hinweis bei jedem Start (STB-29): Nutzung, Daten, Beta, Beispiele, dazu der Weg zu allen Lizenzen.
  // Escape oder "Verstanden" schließt; der Fokus liegt gleich auf "Verstanden".
  import { ABSCHNITTE, FASSUNG_TEXT, starthinweis } from "../../zustand/starthinweis.svelte";

  let knopf: HTMLButtonElement | undefined = $state();
  $effect(() => knopf?.focus());
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && starthinweis.schliessen()} />

<div class="abdunkeln" aria-hidden="true"></div>
<div class="fenster karte" role="dialog" aria-modal="true" aria-labelledby="sh-titel">
  <div class="kopf">
    <h2 id="sh-titel"><i class="fa-solid fa-sitemap"></i> Strukturblick</h2>
    <span class="abzeichen warn">{FASSUNG_TEXT}</span>
  </div>
  {#each ABSCHNITTE as a (a.titel)}
    <section class="abschnitt">
      <i class="fa-solid {a.symbol}" aria-hidden="true"></i>
      <div>
        <h3>{a.titel}</h3>
        <p>{a.text}</p>
      </div>
    </section>
  {/each}
  <div class="fuss">
    <a class="knopf still" href="./lizenzen.txt" target="_blank" rel="noopener"><i class="fa-solid fa-file-lines"></i> Lizenz und Lizenzen der verwendeten Bausteine</a>
    <button class="knopf primaer" bind:this={knopf} onclick={() => starthinweis.schliessen()}><i class="fa-solid fa-check"></i> Verstanden</button>
  </div>
</div>

<style>
  .abdunkeln {
    position: fixed;
    inset: 0;
    z-index: 30;
    backdrop-filter: brightness(0.5) saturate(0.7);
    -webkit-backdrop-filter: brightness(0.5) saturate(0.7);
  }
  .fenster {
    position: fixed;
    z-index: 31;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
    width: min(640px, calc(100vw - 32px));
    max-height: calc(100vh - 32px);
    overflow-y: auto;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: var(--a3);
    box-shadow: var(--kante), var(--schatten-schwebend);
  }
  .kopf {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--a3);
  }
  h2 {
    margin: 0;
    font-size: var(--seitentitel);
  }
  h2 i,
  .abschnitt > i {
    color: var(--akzent);
  }
  .abschnitt {
    display: grid;
    grid-template-columns: 1.6em minmax(0, 1fr);
    gap: var(--a3);
  }
  .abschnitt > i {
    padding-top: 0.25em;
    text-align: center;
  }
  h3 {
    margin: 0 0 var(--a1);
    font-size: var(--gross);
  }
  p {
    margin: 0;
    color: var(--text-2);
    line-height: 1.5;
  }
  .fuss {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--a2);
    padding-top: var(--a2);
  }
</style>
