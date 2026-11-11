<script lang="ts">
  // Linke Leiste: Dokumente der Ablage (Bauart ohne Server: dieser Browser), Öffnen, Neu, Herunterladen.
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { herunterladen, dateiWaehlen } from "./dateien";

  const blatt = $derived(arbeitsplatz.aktivesBlatt);
  const offen = $derived(new Set(arbeitsplatz.blaetter.map((b) => b.kennung)));

  async function oeffnen(): Promise<void> {
    for (const d of await dateiWaehlen()) await arbeitsplatz.dateiOeffnen(d);
  }
</script>

<aside class="leiste">
  <div class="leiste-feld">
    <div class="leiste-titel">{arbeitsplatz.ablage.ort}</div>
    <div class="knopf-spalte">
      <button class="knopf" onclick={oeffnen}><i class="fa-solid fa-folder-open"></i> <span class="name">Datei öffnen</span></button>
      <button class="knopf" disabled={!blatt} onclick={() => blatt && herunterladen(blatt.name, blatt.text)}><i class="fa-solid fa-download"></i> <span class="name">Herunterladen</span></button>
    </div>
    {#if arbeitsplatz.dokumente.length}
      <div class="leiste-titel">Dokumente</div>
      {#each arbeitsplatz.dokumente as d (d.kennung)}
        <a
          class="eintrag"
          class:aktiv={blatt?.kennung === d.kennung}
          href="#{d.kennung}"
          title={d.name}
          onclick={(e) => { e.preventDefault(); void arbeitsplatz.ausAblageOeffnen(d.kennung); }}
        >
          <i class="fa-solid fa-file-lines"></i><span class="name">{d.name}</span>
          <span class="rechts">{#if offen.has(d.kennung)}<span class="abzeichen" title="Als Reiter geöffnet">offen</span>{/if}</span>
        </a>
      {/each}
    {/if}
  </div>
  <div class="leiste-fuss"><i class="fa-solid fa-circle-info"></i><span>{arbeitsplatz.ablage.hinweis}</span></div>
</aside>

<style>
  .knopf-spalte {
    display: flex;
    flex-direction: column;
    gap: var(--a2);
    padding: 0 var(--a2) var(--a2);
  }
  .knopf-spalte .knopf {
    justify-content: flex-start;
  }
  .leiste-fuss span {
    white-space: normal;
  }
</style>
