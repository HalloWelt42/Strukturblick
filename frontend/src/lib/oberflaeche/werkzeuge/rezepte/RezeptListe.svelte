<script lang="ts">
  // Seitenspalte: alle Rezepte mit Suche, Zahl der Schritte und wann zuletzt angewendet.
  import { rezepte } from "../../../zustand/rezepte.svelte";
  import { datum } from "./datum";

  let suche = $state("");
  const gefunden = $derived(rezepte.liste.filter((r) => r.name.toLocaleLowerCase("de").includes(suche.trim().toLocaleLowerCase("de"))));
</script>

<nav class="vw-seitenspalte" aria-label="Rezepte">
  {#if rezepte.liste.length > 5}
    <label class="feld"><i class="fa-solid fa-magnifying-glass"></i><input placeholder="Rezept suchen" bind:value={suche} aria-label="Rezept suchen" /></label>
  {/if}
  {#each gefunden as r (r.kennung)}
    <button class="vw-rezept" class:aktiv={rezepte.aktuell?.kennung === r.kennung} onclick={() => (rezepte.gewaehlt = r.kennung)}>
      <i class="fa-solid fa-scroll"></i><span class="vw-rezept-name">{r.name}</span><span class="abzeichen">{r.schritte.length}</span>
      <span class="vw-rezept-info">aus {r.quelle}{r.zuletzt[0] ? `, zuletzt am ${datum(r.zuletzt[0].zeit)}` : ", noch nicht angewendet"}</span>
    </button>
  {:else}
    <p class="vw-hilfe">{rezepte.liste.length ? "Kein Rezept passt zur Suche." : "Noch keine Rezepte."}</p>
  {/each}
</nav>
