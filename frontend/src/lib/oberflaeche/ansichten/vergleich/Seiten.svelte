<script lang="ts">
  // Beide Seiten nebeneinander (entwuerfe/vergleich.html): Zeilen auf gleicher Höhe, Gleiches als Falte zum Aufklappen,
  // Geändertes links alt und rechts neu, Fehlendes schraffiert. Der gewählte Unterschied ist umrandet und rollt in Sicht.
  import { vergleichszeilen, type Teil } from "../../../analyse/vergleich/zeilen";
  import type { Vergleich } from "../../../analyse/vergleich/vergleichen";
  import type { Seite, VergleichZustand } from "./vergleichZustand.svelte";

  let { z, vergleich, seiten }: { z: VergleichZustand; vergleich: Vergleich; seiten: [Seite, Seite] } = $props();

  const ergebnis = $derived(vergleichszeilen(vergleich.wurzel, z.offen));
  const KLASSE: Record<Teil["art"], string> = { k: "an-k", idx: "an-idx", text: "w-text", zahl: "w-zahl", bool: "w-bool", null: "w-null", alt: "an-alt", neu: "an-neu", leer: "" };

  let feld = $state<HTMLElement>();
  $effect(() => {
    const p = z.gewaehlt;
    if (!p || !feld) return;
    feld.querySelector(`[data-pfad="${CSS.escape(p)}"]`)?.scrollIntoView({ block: "center" });
  });
</script>

{#snippet teile(t: readonly Teil[])}<span>{#each t as x, i (i)}{#if KLASSE[x.art]}<span class={KLASSE[x.art]}>{x.text}</span>{:else}{x.text}{/if}{/each}</span>{/snippet}

<section class="an-vg-seiten">
  <div class="an-vg-koepfe">
    <div class="an-vg-kopf an-vorher"><span class="abzeichen zweit">Vorher</span><span class="an-name">{seiten[0].name}</span><span class="an-neben">{seiten[0].neben}</span></div>
    <div class="an-vg-kopf an-jetzt"><span class="abzeichen">Jetzt</span><span class="an-name">{seiten[1].name}</span><span class="an-neben">{seiten[1].neben}</span></div>
  </div>
  <div class="an-vg-feld" bind:this={feld}>
    <div class="an-vg-raster">
      {#each ergebnis.zeilen as zeile, i (i)}
        {#if zeile.art === "falte"}
          <button class="an-vg-falte vg-falte" style="--an-ebene: {zeile.ebene}" title="Aufklappen" onclick={() => z.umschalten(zeile.id)}>
            <i class="fa-solid fa-caret-right"></i><span>{zeile.text}</span>{#if zeile.kennung}<span class="text-3">{zeile.kennung}</span>{/if}
          </button>
        {:else}
          {@const markiert = zeile.knoten !== null && zeile.knoten.pfad === z.gewaehlt}
          {@const ton = zeile.ton === "gleich" ? "" : `an-${zeile.ton}`}
          <div class="an-vg-zelle {zeile.links ? ton : 'an-leer'}" class:an-markiert={markiert} style="--an-ebene: {zeile.ebene}" data-pfad={zeile.knoten?.pfad}>{#if zeile.links}{@render teile(zeile.links)}{/if}</div>
          <div class="an-vg-zelle {zeile.rechts ? ton : 'an-leer'}" class:an-markiert={markiert} style="--an-ebene: {zeile.ebene}">{#if zeile.rechts}{@render teile(zeile.rechts)}{/if}</div>
        {/if}
      {/each}
    </div>
    {#if ergebnis.gekuerzt}<p class="klein text-3 vg-luft">Die Ansicht zeigt die ersten Zeilen; alle Unterschiede stehen in der Liste.</p>{/if}
  </div>
</section>

<style>
  .vg-falte {
    border: 0;
    width: 100%;
    font: inherit;
    font-size: var(--klein);
    text-align: left;
  }
  .vg-luft {
    padding: var(--a2) var(--a3);
  }
</style>
