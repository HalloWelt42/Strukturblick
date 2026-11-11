<script lang="ts">
  // Ganzes Abfrageergebnis als Datei: JSON, NDJSON oder CSV. Das Menü kommt aus der Liste der Ausgabeformate.
  import { abfrage, AUSGABEFORMATE, type Ausgabeformat } from "../../zustand/abfrage.svelte";
  import { herunterladen } from "../schale/dateien";

  let { gesperrt = false, nachOben = false, rechtsbuendig = false }: { gesperrt?: boolean; nachOben?: boolean; rechtsbuendig?: boolean } = $props();

  let offen = $state(false);
  let huelle: HTMLElement | undefined = $state();

  async function laden(f: Ausgabeformat): Promise<void> {
    offen = false;
    const text = await abfrage.ganzerText(f);
    if (text !== null) herunterladen(abfrage.dateiname(f), text);
  }
</script>

<svelte:window onpointerdown={(e) => offen && huelle && !e.composedPath().includes(huelle) && (offen = false)} onkeydown={(e) => offen && e.key === "Escape" && (offen = false)} />

<span class="huelle" bind:this={huelle}>
  <button class="knopf" disabled={gesperrt} aria-expanded={offen} title="Ganzes Ergebnis als Datei" onclick={() => (offen = !offen)}>
    <i class="fa-solid fa-download"></i><span class="af-breit">Herunterladen</span> <i class="fa-solid fa-caret-down"></i>
  </button>
  {#if offen}
    <div class="menue karte" class:oben={nachOben} class:rechtsbuendig role="menu">
      {#each AUSGABEFORMATE as f (f.kennung)}
        <button class="eintrag" role="menuitem" onclick={() => void laden(f.kennung)}>
          <span class="abzeichen">{f.name}</span><span class="name">{f.erklaerung}</span>
        </button>
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
    left: 0;
    top: calc(100% + 4px);
    z-index: 10;
    margin: 0;
    min-width: 320px;
    box-shadow: var(--kante), var(--schatten-schwebend);
  }
  .menue.rechtsbuendig {
    left: auto;
    right: 0;
  }
  .menue.oben {
    top: auto;
    bottom: calc(100% + 4px);
  }
  .eintrag {
    width: 100%;
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
</style>
