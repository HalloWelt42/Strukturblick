<script lang="ts">
  // Werkzeugzeile des Baums: Pfad zum Gewählten (jeder Teil wählt seinen Knoten), Suche mit Zähler und "Nur Treffer",
  // Ebenen zum Aufklappen.
  import { zeigerAus, type Teil } from "../../../kern";
  import type { Suchergebnis } from "../../../analyse/baumsuche";
  import { EBENEN, type BaumZustand } from "./baumZustand.svelte";

  let {
    zustand,
    teile,
    treffer,
    ausAbfrage,
    gewaehlterKnoten,
    liest,
    onwaehlen,
    onweiter,
  }: {
    zustand: BaumZustand;
    /** Pfad des Gewählten, null wenn nichts gewählt ist */
    teile: readonly Teil[] | null;
    treffer: Suchergebnis | null;
    /** Die Treffer stammen aus der Abfrage, nicht aus dem Suchfeld */
    ausAbfrage: boolean;
    gewaehlterKnoten: number;
    liest: boolean;
    onwaehlen: (zeiger: string) => void;
    onweiter: (rueckwaerts: boolean) => void;
  } = $props();

  const stelle = $derived(treffer ? treffer.knoten.indexOf(gewaehlterKnoten) : -1);

  function taste(e: KeyboardEvent): void {
    if (e.key === "Enter") {
      e.preventDefault();
      onweiter(e.shiftKey);
    } else if (e.key === "Escape" && zustand.suche) {
      e.preventDefault();
      zustand.suche = "";
    }
  }
</script>

<div class="werkzeugzeile">
  <nav class="pfad" aria-label="Pfad">
    <button class="teil" class:letzter={!teile?.length} onclick={() => onwaehlen("")}>$</button>
    {#each teile ?? [] as t, i (i)}
      <span class="trenner"><i class="fa-solid fa-chevron-right"></i></span>
      <button class="teil" class:letzter={i === teile!.length - 1} onclick={() => onwaehlen(zeigerAus(teile!.slice(0, i + 1)))}>{typeof t === "number" ? `[${t}]` : t}</button>
    {/each}
  </nav>
  <div class="rechts">
    {#if liest}
      <span class="abzeichen warn" title="Das Dokument wird gerade gelesen; Bearbeiten geht gleich wieder"><i class="fa-solid fa-spinner fa-spin-pulse"></i> liest</span>
    {/if}
    <label class="feld suche" title="Enter: nächster Treffer, Umschalt und Enter: voriger">
      <i class="fa-solid fa-magnifying-glass"></i>
      <input placeholder="Im Baum suchen" aria-label="Im Baum suchen" spellcheck="false" bind:value={zustand.suche} onkeydown={taste} />
    </label>
    {#if treffer}
      {#if treffer.anzahl > 0}
        <div class="af-treffer-nav">
          <button class="knopf nur-symbol" title="Voriger Treffer (⇧ F3)" onclick={() => onweiter(true)}><i class="fa-solid fa-chevron-up"></i></button>
          <span role="status" title={ausAbfrage ? "Treffer der Abfrage" : "Treffer der Suche"}>{#if ausAbfrage}<i class="fa-solid fa-terminal"></i> {/if}{stelle >= 0 ? `Treffer ${stelle + 1} von ${treffer.anzahl}` : `${treffer.anzahl} Treffer`}</span>
          <button class="knopf nur-symbol" title="Nächster Treffer (F3)" onclick={() => onweiter(false)}><i class="fa-solid fa-chevron-down"></i></button>
        </div>
      {:else}
        <span class="abzeichen" role="status">0 Treffer</span>
      {/if}
      <div class="segment">
        <button class:aktiv={zustand.nurTreffer} aria-pressed={zustand.nurTreffer} onclick={() => (zustand.nurTreffer = !zustand.nurTreffer)}>Nur Treffer</button>
      </div>
    {/if}
    <div class="segment" title="Ebenen aufklappen" role="group" aria-label="Ebenen aufklappen">
      {#each EBENEN as e (e)}
        <button class:aktiv={zustand.ebene === e} aria-pressed={zustand.ebene === e} onclick={() => zustand.ebeneSetzen(e)}>{e === "alle" ? "Alle" : e}</button>
      {/each}
    </div>
  </div>
</div>

<style>
  .teil {
    padding: 2px 6px;
    border: 0;
    background: transparent;
    color: var(--text-2);
    font: inherit;
    cursor: pointer;
  }
  .teil:hover {
    background: var(--akzent-weich);
    color: var(--text-1);
  }
  .teil.letzter {
    color: var(--akzent);
    font-weight: 600;
  }
  .suche {
    width: 190px;
  }
  .af-treffer-nav .fa-terminal {
    color: var(--akzent);
  }
</style>
