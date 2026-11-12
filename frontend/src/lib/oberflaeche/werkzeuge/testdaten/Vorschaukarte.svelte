<script lang="ts">
  // Karte "Vorschau" (entwuerfe/testdaten.html): die ersten Datensätze als Tabelle oder als Text im Zielformat. Vor dem
  // Lauf zeigt sie die Probe mit dem Startwert, danach die ersten erzeugten.
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { ausgeben } from "../../../analyse/testdaten/auftrag";
  import type { Json } from "../../../analyse/testdaten/erzeuger";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import { zelleZeigen } from "./zeigen";
  import { VORSCHAU_ZEILEN, type TestdatenZustand } from "./testdatenZustand.svelte";

  let { blatt, z }: { blatt: Arbeitsblatt; z: TestdatenZustand } = $props();

  let art = $state<"tabelle" | "text">("tabelle");
  const zeilen = $derived<readonly Json[]>(z.lauf ? z.vorschau : z.probe(blatt));
  const objekte = $derived(zeilen.every((d) => typeof d === "object" && d !== null && !Array.isArray(d)));
  const spalten = $derived(objekte ? [...new Set(zeilen.flatMap((d) => Object.keys(d as object)))] : ["(Wert)"]);
  const text = $derived(ausgeben(zeilen, z.ziel, z.trennzeichen));
  const zahlSpalte = $derived(spalten.map((s) => zeilen.every((d) => typeof (d as Record<string, Json>)[s] === "number" || (d as Record<string, Json>)[s] === undefined)));
</script>

<section class="karte">
  <div class="td-karte-kopf">
    <h2>Vorschau</h2>
    <span class="text-3 klein">
      {#if z.lauf}Erste {Math.min(VORSCHAU_ZEILEN, z.lauf.erzeugt)} von {anzahl(z.lauf.erzeugt)} bisher erzeugten Datensätzen{:else}Die ersten {VORSCHAU_ZEILEN} mit Startwert {z.startwert}{/if}
    </span>
    <div class="rechts">
      <nav class="segment" aria-label="Vorschau als">
        <button class:aktiv={art === "tabelle"} onclick={() => (art = "tabelle")}>Tabelle</button>
        <button class:aktiv={art === "text"} onclick={() => (art = "text")}>Text</button>
      </nav>
    </div>
  </div>
  {#if art === "tabelle"}
    <div class="td-tafel-feld">
      <table class="td-tabelle td-vorschau">
        <thead><tr>{#each spalten as s, j (s)}<th class:zahl={zahlSpalte[j]}>{s}</th>{/each}</tr></thead>
        <tbody>
          {#each zeilen as d, i (i)}
            <tr>
              {#each spalten as s, j (s)}<td class:zahl={zahlSpalte[j]} class:mono={!zahlSpalte[j]}>{zelleZeigen(objekte ? (d as Record<string, Json>)[s] : d)}</td>{/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <pre class="wertfeld td-text">{text}</pre>
  {/if}
</section>
