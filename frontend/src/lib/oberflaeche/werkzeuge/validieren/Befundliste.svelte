<script lang="ts">
  // Tafel Befunde: Filter (alle, Fehler, Warnungen), je Befund Art, Pfad, Meldung, Soll und Ist, Eintrag und Stelle.
  // Ein Klick wählt ihn; Fundstelle und Inspektor folgen.
  import type { Strukturindex } from "../../../kern/strukturindex";
  import { eintragKennung, type Befund } from "../../../analyse/validieren";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import type { ValidierenZustand } from "./validierenZustand.svelte";

  let { z, befunde, gezeigt, gewaehlt, index, text }: { z: ValidierenZustand; befunde: readonly Befund[]; gezeigt: readonly Befund[]; gewaehlt: Befund | null; index: Strukturindex; text: string } = $props();

  /** So viele Befunde stehen in der Liste; der Bericht enthält alle */
  const GEZEIGT = 200;
  const fehler = $derived(befunde.filter((b) => b.art === "fehler").length);
</script>

<section class="wz-tafel">
  <div class="wz-tafel-kopf">
    <i class="fa-solid fa-list-check"></i> Befunde
    <span class="rechts">
      <nav class="segment" aria-label="Befunde filtern">
        <button class:aktiv={z.filter === "alle"} onclick={() => { z.filter = "alle"; z.gewaehlt = 0; }}>Alle <span class="mono">{anzahl(befunde.length)}</span></button>
        <button class:aktiv={z.filter === "fehler"} onclick={() => { z.filter = "fehler"; z.gewaehlt = 0; }}>Fehler <span class="mono">{anzahl(fehler)}</span></button>
        <button class:aktiv={z.filter === "warnung"} onclick={() => { z.filter = "warnung"; z.gewaehlt = 0; }}>Warnungen <span class="mono">{anzahl(befunde.length - fehler)}</span></button>
      </nav>
    </span>
  </div>
  <div class="wz-tafel-feld">
    {#each gezeigt.slice(0, GEZEIGT) as b, i (b.zeiger + b.regel + i)}
      {@const kennung = eintragKennung(index, text, b.knoten)}
      <button class="wz-befund" class:gewaehlt={b === gewaehlt} title="Zeigt die Stelle unten und im Inspektor" onclick={() => (z.gewaehlt = i)}>
        <i class="fa-solid {b.art === 'fehler' ? 'fa-circle-xmark' : 'fa-triangle-exclamation'} wz-symbol {b.art === 'fehler' ? 'fehler' : 'warn'}"></i>
        <div class="wz-befund-kopf"><span class="abzeichen {b.art === 'fehler' ? 'fehler' : 'warn'}">{b.art === "fehler" ? "Fehler" : "Warnung"}</span><span class="wz-pfad">{b.zeiger || "/"}</span></div>
        <div class="wz-meldung">{b.meldung}</div>
        <dl class="wz-soll-ist">
          <dt>Erwartet</dt><dd>{b.erwartet} <span class="mono text-3">{b.regel}</span></dd>
          <dt>Gefunden</dt><dd class="mono">{b.gefunden}</dd>
        </dl>
        <div class="wz-befund-fuss"><span>{b.art === "warnung" && b.regel.startsWith("format") ? "Nur Warnung: format ist im Schema ein Hinweis, keine Pflicht" : kennung}</span><span class="mono">Zeile {anzahl(b.zeile)}, Spalte {b.spalte}</span></div>
      </button>
    {:else}
      <p class="wz-satz va-luft">Keine {z.filter === "fehler" ? "Fehler" : z.filter === "warnung" ? "Warnungen" : "Befunde"}.</p>
    {/each}
    {#if gezeigt.length > GEZEIGT}<p class="wz-satz va-luft">und {anzahl(gezeigt.length - GEZEIGT)} weitere, vollständig im Bericht.</p>{/if}
  </div>
</section>

<style>
  .va-luft {
    padding: var(--a3);
  }
</style>
