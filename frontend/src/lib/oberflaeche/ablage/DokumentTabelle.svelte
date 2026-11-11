<script lang="ts">
  // Dokumente eines Ordners: Haken zum Wählen (Umschalt/Cmd für mehrere), Doppelklick öffnet, Umbenennen in der Zeile;
  // darüber die Leiste für die Auswahl (Herunterladen, Verschieben, Papierkorb).
  import { fokussieren } from "../bausteine/fokus";
  import type { Dokumentkopf } from "../../zustand/ablageverwaltung.svelte";
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { ablageverwaltung } from "../../zustand/ablageverwaltung.svelte";
  import { herunterladen } from "../schale/dateien";
  import { endung, groesse, zeitpunkt, type Ablageauswahl, type Sortierung } from "./auswahl.svelte";

  let { auswahl, dokumente }: { auswahl: Ablageauswahl; dokumente: Dokumentkopf[] } = $props();

  let neuerName = $state("");
  let verschiebenOffen = $state(false);
  let menue: HTMLElement | undefined = $state();

  const kennungen = $derived(dokumente.map((d) => d.kennung));
  const gewaehlt = $derived(kennungen.filter((k) => auswahl.istGewaehlt(k)));
  const alle = $derived(gewaehlt.length > 0 && gewaehlt.length === kennungen.length);
  const ziele = $derived(["", ...ablageverwaltung.ordner].filter((o) => o !== ablageverwaltung.ordnerWahl || auswahl.suche));

  function sortierenNach(s: Sortierung): void {
    auswahl.sortierung = s;
  }

  function umbenennenBeginnen(d: Dokumentkopf): void {
    auswahl.umbenennen = d.kennung;
    neuerName = d.name;
  }

  async function umbenennenFertig(d: Dokumentkopf): Promise<void> {
    const neu = neuerName.trim();
    auswahl.umbenennen = null;
    if (neu && neu !== d.name) await ablageverwaltung.umbenennen(d.kennung, neu);
  }

  async function alleHerunterladen(): Promise<void> {
    for (const k of gewaehlt) {
      const t = await ablageverwaltung.textVon(k);
      if (t) herunterladen(t.name, t.text);
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  async function verschieben(ziel: string): Promise<void> {
    verschiebenOffen = false;
    await ablageverwaltung.verschieben(gewaehlt, ziel);
    auswahl.aufheben();
  }

  async function entfernen(): Promise<void> {
    const weg = [...gewaehlt];
    auswahl.aufheben();
    await ablageverwaltung.entfernen(weg);
  }

  function aussen(e: PointerEvent): void {
    if (verschiebenOffen && menue && !e.composedPath().includes(menue)) verschiebenOffen = false;
  }
</script>

<svelte:window onpointerdown={aussen} />

{#if gewaehlt.length}
  <div class="vw-auswahl-leiste">
    <span class="vw-anzahl">{gewaehlt.length} von {dokumente.length} gewählt</span>
    <button class="knopf" onclick={alleHerunterladen}><i class="fa-solid fa-download"></i> Herunterladen</button>
    {#if gewaehlt.length === 1}
      <button class="knopf" onclick={() => { const d = dokumente.find((x) => x.kennung === gewaehlt[0]); if (d) umbenennenBeginnen(d); }}><i class="fa-solid fa-pen"></i> Umbenennen</button>
    {/if}
    <span class="menue-huelle" bind:this={menue}>
      <button class="knopf" aria-expanded={verschiebenOffen} onclick={() => (verschiebenOffen = !verschiebenOffen)}><i class="fa-solid fa-arrow-right-to-bracket"></i> Verschieben</button>
      {#if verschiebenOffen}
        <div class="menue karte" role="menu">
          {#each ziele as z (z)}
            <button class="eintrag" role="menuitem" onclick={() => void verschieben(z)}><i class="fa-solid {z ? 'fa-folder' : 'fa-server'}"></i><span class="name">{z || arbeitsplatz.ablage.ort}</span></button>
          {:else}
            <p class="klein text-3">Kein anderer Ordner da.</p>
          {/each}
        </div>
      {/if}
    </span>
    <button class="knopf" onclick={entfernen}><i class="fa-solid fa-trash-can"></i> In den Papierkorb</button>
    <span class="rechts"><button class="knopf still" onclick={() => auswahl.aufheben()}>Auswahl aufheben</button></span>
  </div>
{/if}

<div class="vw-tabellenfeld">
  <table class="vw-tabelle">
    <thead>
      <tr>
        <th class="vw-schmal">
          <button class="vw-haken" class:an={alle} class:teils={gewaehlt.length > 0 && !alle} title="Alle wählen" aria-label="Alle wählen" onclick={() => auswahl.alleOderKeine(kennungen)}>
            <i class="fa-solid {gewaehlt.length > 0 && !alle ? 'fa-minus' : 'fa-check'}"></i>
          </button>
        </th>
        <th class="vw-name-zelle" class:vw-sortiert={auswahl.sortierung === "name"}><button class="kopf-knopf" onclick={() => sortierenNach("name")}>Name</button></th>
        <th class="vw-ab-mittel">Format</th>
        <th class="vw-zahl-zelle" class:vw-sortiert={auswahl.sortierung === "groesse"}><button class="kopf-knopf" onclick={() => sortierenNach("groesse")}>Größe</button></th>
        <th class="vw-ab-breit" class:vw-sortiert={auswahl.sortierung === "geaendert"}><button class="kopf-knopf" onclick={() => sortierenNach("geaendert")}>Geändert</button></th>
        {#if auswahl.suche.trim()}<th>Ordner</th>{/if}
      </tr>
    </thead>
    <tbody>
      {#each dokumente as d (d.kennung)}
        <tr class:gewaehlt={auswahl.istGewaehlt(d.kennung)} onclick={(e) => auswahl.umschalten(d.kennung, e.metaKey || e.ctrlKey || e.shiftKey)} ondblclick={() => void arbeitsplatz.ausAblageOeffnen(d.kennung)}>
          <td><button class="vw-haken" class:an={auswahl.istGewaehlt(d.kennung)} aria-label="{d.name} wählen" onclick={(e) => { e.stopPropagation(); auswahl.umschalten(d.kennung, true); }}><i class="fa-solid fa-check"></i></button></td>
          <td class="vw-name-zelle">
            {#if auswahl.umbenennen === d.kennung}
              <form class="vw-umbenennen" onsubmit={(e) => { e.preventDefault(); void umbenennenFertig(d); }}>
                <input bind:value={neuerName} aria-label="Neuer Name" use:fokussieren onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === "Escape" && (auswahl.umbenennen = null)} />
                <button class="knopf primaer nur-symbol" type="submit" title="Übernehmen"><i class="fa-solid fa-check"></i></button>
              </form>
            {:else}
              <span class="vw-dateiname" title={d.name}><i class="fa-solid fa-file-lines"></i><span>{d.name}</span></span>
            {/if}
          </td>
          <td class="vw-ab-mittel">{#if endung(d.name)}<span class="abzeichen">{endung(d.name)}</span>{/if}</td>
          <td class="vw-zahl-zelle mono">{groesse(d.groesse)}</td>
          <td class="mono vw-ab-breit">{zeitpunkt(d.geaendert)}</td>
          {#if auswahl.suche.trim()}<td>{d.ordner || arbeitsplatz.ablage.ort}</td>{/if}
        </tr>
      {:else}
        <tr><td colspan="5" class="leer-zeile text-3">{auswahl.suche ? "Nichts gefunden." : "Noch keine Dokumente hier. Datei hineinziehen oder wählen."}</td></tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .menue-huelle {
    position: relative;
  }
  .menue {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 10;
    margin: 0;
    min-width: 240px;
    box-shadow: var(--kante), var(--schatten-schwebend);
  }
  .menue .eintrag {
    width: 100%;
    border: 0;
    background: transparent;
    font: inherit;
  }
  .kopf-knopf {
    border: 0;
    background: transparent;
    font: inherit;
    color: inherit;
    padding: 0;
    cursor: pointer;
  }
  button.vw-haken {
    border: 0;
    cursor: pointer;
  }
  .leer-zeile {
    padding: var(--a5);
    text-align: center;
  }
  tr {
    cursor: default;
  }
</style>
