<script lang="ts">
  // Verlustkarte (entwuerfe/konvertieren.html): steht vor dem Ergebnis und sagt, was das Ziel nicht kann. Punkte mit
  // Wahl (Listen in CSV) stehen links, die übrigen rechts. Namen und Werte in `Backticks` werden als Code gesetzt.
  import type { Verlustpunkt } from "../../../analyse/konvertieren/konvertieren";
  import type { KonvertierenZustand } from "./konvertierenZustand.svelte";

  let { z, zielName, verluste }: { z: KonvertierenZustand; zielName: string; verluste: readonly Verlustpunkt[] } = $props();

  const mitWahl = $derived(verluste.filter((v) => v.wahl));
  const ohneWahl = $derived(verluste.filter((v) => !v.wahl));
  const nummer = (v: Verlustpunkt): number => verluste.indexOf(v) + 1;
  const teile = (s: string): { text: string; code: boolean }[] => s.split("`").map((text, i) => ({ text, code: i % 2 === 1 }));
</script>

{#snippet markiert(s: string)}{#each teile(s) as t, i (i)}{#if t.code}<span class="mono">{t.text}</span>{:else}{t.text}{/if}{/each}{/snippet}

{#snippet punkt(v: Verlustpunkt)}
  <div class="wz-verlust-punkt">
    <div class="wz-verlust-satz"><span class="abzeichen zweit">{nummer(v)}</span> {@render markiert(v.satz)}</div>
    <div class="wz-verlust-text">{@render markiert(v.text)}</div>
    {#if v.wahl}
      <div class="wz-wahl-gruppe" role="radiogroup" aria-label="Listen in {zielName}">
        {#each v.wahl.wege as w (w.wert)}
          {@const aktiv = z.optionen.listen === w.wert}
          <button class="wz-wahl" class:aktiv role="radio" aria-checked={aktiv} onclick={() => z.setzen("listen", w.wert)}>
            <i class={aktiv ? "fa-solid fa-circle-dot" : "fa-regular fa-circle"}></i>
            <span class="wz-wahl-text"><b>{w.titel}</b><small>{w.text}</small></span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
{/snippet}

{#if verluste.length}
  <section class="karte wz-verlust">
    <div class="karte-titel"><i class="fa-solid fa-triangle-exclamation"></i> Was {zielName} nicht kann <span class="rechts abzeichen warn">{verluste.length} {verluste.length === 1 ? "Punkt" : "Punkte"}</span></div>
    <div class="wz-verlust-raster">
      {#if mitWahl.length}<div>{#each mitWahl as v (v.satz)}{@render punkt(v)}{/each}</div>{/if}
      <div>{#each ohneWahl as v (v.satz)}{@render punkt(v)}{/each}</div>
    </div>
  </section>
{:else}
  <section class="karte wz-verlust kv-heil">
    <div class="karte-titel"><i class="fa-solid fa-circle-check"></i> Nichts geht verloren <span class="rechts abzeichen gut">vollständig</span></div>
    <p class="wz-satz">{zielName} kann alles abbilden, was im Dokument steht: Werte, Typen und Aufbau bleiben.</p>
  </section>
{/if}

<style>
  .kv-heil .karte-titel > i {
    color: var(--gut);
  }
</style>
