<script lang="ts">
  // Reiter Facetten (entwuerfe/bereinigen.html): links je Spalte eine Facette zum Anklicken, rechts die Zeilen, die nach
  // allen Filtern bleiben, mit "Als neues Dokument" und "Nur diese Zeilen behalten" (Vorschau im Inspektor).
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { erklaerungVon, type BereinigenZustand, type Tabellenstand } from "./bereinigenZustand.svelte";
  import Facette from "./Facette.svelte";
  import FacettenErgebnis from "./FacettenErgebnis.svelte";

  let { blatt, z, s, offen }: { blatt: Arbeitsblatt; z: BereinigenZustand; s: Tabellenstand; offen: readonly string[] } = $props();
</script>

<div class="inhalt">
  <div class="br-facetten-raster">
    <aside class="br-facetten" aria-label="Facetten">
      <div class="br-spalten-titel">Facetten <span class="br-rechts text-3" title="Anzahl je Wert im ganzen Dokument">Anzahl im Dokument</span></div>
      <p class="br-erklaerung">{erklaerungVon("facetten")}</p>
      {#each offen as name (name)}
        <Facette {z} {s} {name} {offen} />
      {:else}
        <p class="br-facetten-leer">Keine Facette offen. Über "Facette hinzufügen" eine Spalte wählen: ihre Werte erscheinen hier zum Anklicken.</p>
      {/each}
    </aside>
    <FacettenErgebnis {blatt} {z} {s} />
  </div>
</div>

<style>
  .inhalt {
    overflow: hidden;
  }
</style>
