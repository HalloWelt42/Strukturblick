<script lang="ts">
  // Inspektor des Werkzeugs Bereinigen: je Reiter die Karten aus den Entwürfen. Rechnet nichts selbst, sondern liest
  // dasselbe gemerkte Ergebnis wie der Hauptbereich.
  import "./bereinigen.css";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { bereinigenZustand } from "./bereinigenZustand.svelte";
  import InspektorFacetten from "./InspektorFacetten.svelte";
  import InspektorAehnlich from "./InspektorAehnlich.svelte";
  import InspektorTypen from "./InspektorTypen.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(bereinigenZustand(blatt));
  const stand = $derived(z.stand(blatt));
</script>

{#if stand.art === "tabelle"}
  {#if z.reiter === "facetten"}
    <InspektorFacetten {blatt} {z} s={stand} />
  {:else if z.reiter === "aehnlich"}
    <InspektorAehnlich {blatt} {z} s={stand} />
  {:else}
    <InspektorTypen {blatt} {z} s={stand} />
  {/if}
{:else}
  <div class="karte">
    <p class="br-karten-text"><i class="fa-solid fa-broom"></i> Bereinigen zeigt hier Treffer, Vorschau und Spalten, sobald das Dokument als Tabelle lesbar ist.</p>
  </div>
{/if}
