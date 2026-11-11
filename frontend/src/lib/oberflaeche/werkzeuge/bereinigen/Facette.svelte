<script lang="ts">
  // Eine Facette: Kopf mit Spalte, Art, Auswahl aufheben und Schließen; darunter je nach Art der Werte die Liste zum
  // Ankreuzen, die Verteilung der Zahlen oder die Monate.
  import { facettenart } from "../../../analyse/bereinigen/facetten";
  import { spaltenprofil } from "../../../analyse/spaltenprofil";
  import { KNOTEN_NAME } from "../../../kern/strukturindex";
  import type { BereinigenZustand, Tabellenstand } from "./bereinigenZustand.svelte";
  import FacetteWerte from "./FacetteWerte.svelte";
  import FacetteZahl from "./FacetteZahl.svelte";
  import FacetteDatum from "./FacetteDatum.svelte";

  let { z, s, name, offen }: { z: BereinigenZustand; s: Tabellenstand; name: string; offen: readonly string[] } = $props();

  const spalte = $derived(s.tabelle.spalteNach.get(name) ?? -1);
  const art = $derived(facettenart(s.tabelle, s.index, s.text, spalte));
  const typ = $derived(spaltenprofil(s.tabelle, s.index, s.text, spalte, 1).typ);
  const betrag = $derived(art === "zahl" && typ.siehtAusWie === "betrag");
  // Werte-Facetten nennen die Art, wie sie steht (Text, Wahrheitswert, Liste); "gemischt", wenn sie wechselt
  const abzeichen = $derived(art === "datum" ? "Datum" : art === "zahl" ? (betrag ? "Betrag" : "Zahl") : typ.art === null ? "leer" : typ.art === "gemischt" ? "gemischt" : KNOTEN_NAME[typ.art]);
  const gewaehlt = $derived(z.auswahl(name) !== null);
</script>

<section class="br-facette" aria-label="Facette {name}">
  <div class="br-facette-kopf">
    <strong>{name}</strong><span class="abzeichen zweit" title={betrag ? "Aus Text gelesen, deutsches Format" : undefined}>{abzeichen}</span>
    <span class="br-rechts">
      {#if gewaehlt}
        <button class="knopf still nur-symbol" title="Auswahl in {name} aufheben" onclick={() => z.auswahlSetzen(name, null)}><i class="fa-solid fa-filter-circle-xmark"></i></button>
      {/if}
      <button class="knopf still nur-symbol" title="Facette schließen" onclick={() => z.facetteSchliessen(offen, name)}><i class="fa-solid fa-xmark"></i></button>
    </span>
  </div>
  {#if art === "werte"}
    <FacetteWerte {z} {s} {name} {spalte} />
  {:else if art === "zahl"}
    <FacetteZahl {z} {s} {name} {spalte} />
  {:else}
    <FacetteDatum {z} {s} {name} {spalte} />
  {/if}
</section>
