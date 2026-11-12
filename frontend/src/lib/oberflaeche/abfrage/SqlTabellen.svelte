<script lang="ts">
  // Verfügbare Tabellen für SQL (Entwurf entwuerfe/abfrage-sql.html): je Tabelle Name, Quelle, Zeilen, Spalten mit Art.
  // Ein Klick auf einen Namen fügt ihn in den Ausdruck ein; Tabellen lassen sich auf- und zuklappen.
  import type { Tabellenuebersicht } from "../../zustand/abfrage.svelte";

  let { tabellen, oneinfuegen }: { tabellen: readonly Tabellenuebersicht[]; oneinfuegen: (name: string) => void } = $props();

  let zu = $state(new Set<string>());
  const umschalten = (n: string) => {
    const neu = new Set(zu);
    if (!neu.delete(n)) neu.add(n);
    zu = neu;
  };
  const zahl = new Intl.NumberFormat("de-DE");
</script>

<div class="af-fach">
  <div class="af-fach-kopf"><span class="af-etikett">Tabellen</span><span class="rechts kurz" title="Klick fügt den Namen ein">Klick fügt den Namen ein</span></div>
  <div class="af-tabellen">
    {#each tabellen as t (t.name)}
      <div class="af-tab-kopf">
        <button class="still-knopf" aria-expanded={!zu.has(t.name)} title={zu.has(t.name) ? "Spalten zeigen" : "Spalten verbergen"} onclick={() => umschalten(t.name)}><i class="fa-solid {zu.has(t.name) ? 'fa-caret-right' : 'fa-caret-down'}"></i></button>
        <button class="still-knopf af-tab-name" title="{t.name} einfügen" onclick={() => oneinfuegen(t.name)}>{t.name}</button>
        <span class="af-tab-quelle">= {t.quelle}</span>
        <span class="rechts">{zahl.format(t.anzahl)}</span>
      </div>
      {#if !zu.has(t.name)}
        {#if t.notiz}<div class="af-tab-notiz">{t.notiz}</div>{/if}
        {#each t.spalten as s (s.name)}
          <button class="af-spalte still-knopf" title="{s.name} einfügen" onclick={() => oneinfuegen(s.name)}>
            <span class="mono">{#each s.name.split(/(?<=_)/) as teil, i (i)}{teil}<wbr />{/each}</span><span class="rechts"><span class="af-typ">{s.art}</span></span>
          </button>
        {/each}
      {/if}
    {:else}
      <p class="leer text-3">Keine Dokumente offen. Jedes geöffnete Dokument wird eine Tabelle.</p>
    {/each}
  </div>
</div>

<style>
  .still-knopf {
    border: 0;
    background: transparent;
    font: inherit;
    color: inherit;
    padding: 0;
    cursor: pointer;
    text-align: left;
  }
  button.af-spalte {
    width: 100%;
  }
  .af-tab-kopf .still-knopf:first-child {
    width: 14px;
    color: var(--text-3);
  }
  .kurz {
    display: block;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .leer {
    margin: 0;
    padding: var(--a3);
  }
</style>
