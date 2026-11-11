<script lang="ts">
  // Eine Zeile des Baums nach dem Entwurf (entwuerfe/arbeitsplatz.html): Klappen, Schlüssel oder Stelle, Wert in
  // Typfarbe oder Art mit Info, rechts Hinweise und "Als Tabelle". Die Daten kommen fertig aus baumbeschreibung.ts.
  import { KNOTEN_NAME, KnotenArt } from "../../../kern";
  import type { Baumzeile } from "../../../analyse/baumbeschreibung";
  import WertEingabe from "../../bausteine/WertEingabe.svelte";
  import Markiert from "./Markiert.svelte";

  let {
    zeile,
    gewaehlt,
    treffer,
    suche,
    eingabe,
    onwaehlen,
    onklappen,
    onbearbeiten,
    onuebernehmen,
    onabbrechen,
    onalsTabelle,
  }: {
    zeile: Baumzeile;
    gewaehlt: boolean;
    treffer: boolean;
    suche: string;
    /** Anfangstext, solange der Wert bearbeitet wird, sonst null */
    eingabe: string | null;
    onwaehlen: () => void;
    onklappen: () => void;
    onbearbeiten: () => void;
    onuebernehmen: (eingabe: string) => void;
    onabbrechen: () => void;
    onalsTabelle: () => void;
  } = $props();

  const WERTKLASSE: Record<number, string> = {
    [KnotenArt.text]: "w-text",
    [KnotenArt.zahl]: "w-zahl",
    [KnotenArt.wahrheitswert]: "w-bool",
    [KnotenArt.nichts]: "w-null",
  };
  const behaelter = $derived(zeile.wert === null);
</script>

<div
  class="knoten"
  class:gewaehlt
  class:treffer
  style:--tiefe={zeile.tiefe}
  role="treeitem"
  aria-level={zeile.tiefe + 1}
  aria-selected={gewaehlt}
  aria-expanded={zeile.klappbar ? zeile.offen : undefined}
  tabindex="-1"
  onclick={onwaehlen}
  ondblclick={() => !behaelter && onbearbeiten()}
  onkeydown={(e) => { if (e.key === " ") { e.preventDefault(); onwaehlen(); } }}
>
  <span class="klapp">
    {#if zeile.klappbar}
      <button class="klappknopf" tabindex="-1" title={zeile.offen ? "Zuklappen" : "Aufklappen"} onclick={(e) => { e.stopPropagation(); onklappen(); }}>
        <i class="fa-solid {zeile.offen ? 'fa-caret-down' : 'fa-caret-right'}"></i>
      </button>
    {/if}
  </span>
  {#if zeile.wurzel}
    <span class={zeile.art === KnotenArt.liste ? "w-liste" : "w-objekt"}>$</span>
  {:else if zeile.stelle !== null}
    <span class="idx">[{zeile.stelle}]</span>
  {:else if zeile.schluessel !== null}
    <span class="schl"><Markiert text={zeile.schluessel} {suche} /></span>
  {/if}
  {#if behaelter}
    <span class="art">{KNOTEN_NAME[zeile.art]}</span>
    <span class="info">{zeile.info}</span>
  {:else if eingabe !== null}
    <WertEingabe anfang={eingabe} beschriftung="Neuer Wert für {zeile.schluessel ?? `[${zeile.stelle}]`}" {onuebernehmen} {onabbrechen} />
  {:else}
    <span class="wert {WERTKLASSE[zeile.art]}"><Markiert text={zeile.wert ?? ""} {suche} /></span>
  {/if}
  {#if eingabe === null && (zeile.hinweise.length || zeile.tabellarisch)}
    <span class="rechts">
      {#each zeile.hinweise as h (h.kennung)}
        <span class="abzeichen" class:zweit={h.stufe === "zweit"} title={h.erklaerung}>{h.titel}</span>
      {/each}
      {#if zeile.tabellarisch}
        <button class="knopf still tabelle-knopf" title="Diese Liste in der Ansicht Tabelle zeigen" onclick={(e) => { e.stopPropagation(); onalsTabelle(); }}>
          <i class="fa-solid fa-table"></i> Als Tabelle
        </button>
      {/if}
    </span>
  {/if}
</div>

<style>
  .knoten {
    height: var(--zeile);
    padding-left: calc(var(--a2) + var(--tiefe) * 22px);
    outline: 0;
  }
  .knoten.treffer {
    background: var(--zweit-weich);
  }
  .knoten.treffer:hover {
    background: var(--akzent-weich);
  }
  .knoten.treffer.gewaehlt {
    background: var(--flaeche-hervor);
  }
  .klappknopf {
    width: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }
  .schl {
    flex: none;
  }
  .wert {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rechts {
    align-items: center;
  }
  .tabelle-knopf {
    min-height: calc(var(--zeile) - 8px);
  }
</style>
