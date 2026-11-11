<script lang="ts">
  // Werkzeugzeile der Tabelle: Pfad der gezeigten Liste, Zeilenfilter, Zähler, Filter aufheben und bei tabellarischen
  // Formaten die Leseweise (Dialekt) mit Menü zum Ändern.
  import { untrack } from "svelte";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import type { Analyse } from "../../../kern/befehl";
  import { zeigerAus } from "../../../kern/pfade";
  import type { Tabelle } from "../../../analyse/tabelle";
  import type { TabellenZustand } from "./tabellenZustand.svelte";
  import { anzahl } from "./zahlen";
  import DialektWahl from "./DialektWahl.svelte";

  let { blatt, zustand, analyse, tabelle, zeilenGezeigt, liest }: { blatt: Arbeitsblatt; zustand: TabellenZustand; analyse: Analyse; tabelle: Tabelle; zeilenGezeigt: number; liest: boolean } = $props();

  /** Wartezeit nach dem Tippen, bevor gefiltert wird (100.000 Zeilen je Taste wären zu viel) */
  const FILTER_NACH_MS = 150;

  let getippt = $state(untrack(() => zustand.filter));
  let filterZeit: ReturnType<typeof setTimeout> | null = null;

  function tippen(): void {
    if (filterZeit) clearTimeout(filterZeit);
    filterZeit = setTimeout(() => {
      filterZeit = null;
      zustand.filter = getippt;
    }, FILTER_NACH_MS);
  }

  function aufheben(): void {
    if (filterZeit) clearTimeout(filterZeit);
    getippt = "";
    zustand.filter = "";
  }

  const gefiltert = $derived(zustand.filter.trim() !== "");
  const segmente = $derived([
    { titel: "$", zeiger: "" },
    ...tabelle.listeTeile.map((t, i) => ({ titel: typeof t === "number" ? `[${t}]` : t, zeiger: zeigerAus(tabelle.listeTeile.slice(0, i + 1)) })),
  ]);
  const dialekt = $derived(analyse.format.leseoptionen.length > 0);
</script>

<div class="werkzeugzeile tb-werkzeugzeile">
  <nav class="pfad" aria-label="Gezeigte Liste">
    {#each segmente as s, i (s.zeiger)}
      {#if i > 0}<span class="trenner"><i class="fa-solid fa-chevron-right"></i></span>{/if}
      <button class="tb-pfadteil" class:letzter={i === segmente.length - 1} title="Im Inspektor zeigen" onclick={() => blatt.waehlen(s.zeiger)}>{s.titel}</button>
    {/each}
  </nav>
  <label class="feld tb-filter" title="Zeigt nur Zeilen, in denen der Text in einer Zelle vorkommt; Groß- und Kleinschreibung egal">
    <i class="fa-solid fa-magnifying-glass"></i>
    <input bind:value={getippt} oninput={tippen} onkeydown={(e) => e.key === "Escape" && aufheben()} placeholder="Zeilen filtern ..." aria-label="Zeilen filtern" spellcheck="false" />
  </label>
  <span class="tb-zaehler"><strong>{anzahl(zeilenGezeigt)}</strong> von {anzahl(tabelle.zeilen.length)} Zeilen</span>
  {#if gefiltert}
    <button class="knopf still" onclick={aufheben} title="Filter aufheben"><i class="fa-solid fa-xmark"></i><span class="tb-lang">Filter aufheben</span></button>
  {/if}
  <div class="rechts">
    {#if liest}<span class="abzeichen warn" title="Das Dokument wird nach einer Änderung neu gelesen; bis dahin lässt sich nichts bearbeiten">liest</span>{/if}
    {#if dialekt}<DialektWahl {blatt} {analyse} />{/if}
  </div>
</div>
