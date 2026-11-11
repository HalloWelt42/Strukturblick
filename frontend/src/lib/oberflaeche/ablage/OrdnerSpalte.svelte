<script lang="ts">
  // Ordner der Ablage (eine Ebene) und der Papierkorb; Ordner umbenennen und leere entfernen am gewählten Ordner.
  import { fokussieren } from "../bausteine/fokus";
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { ablageverwaltung } from "../../zustand/ablageverwaltung.svelte";

  let { onwahl }: { onwahl: () => void } = $props();

  let umbenennen = $state<string | null>(null);
  let neuerName = $state("");

  const anzahl = (ordner: string): number => arbeitsplatz.dokumente.filter((d) => d.ordner === ordner).length;
  const wahl = $derived(ablageverwaltung.ordnerWahl);

  function waehlen(o: string | null): void {
    ablageverwaltung.ordnerWahl = o;
    onwahl();
  }

  async function bestaetigen(alt: string): Promise<void> {
    const neu = neuerName.trim();
    umbenennen = null;
    if (neu && neu !== alt) await ablageverwaltung.ordnerUmbenennen(alt, neu);
  }
</script>

<nav class="vw-seitenspalte vw-ordner" aria-label="Ordner">
  <button class="eintrag" class:aktiv={wahl === ""} onclick={() => waehlen("")}>
    <i class="fa-solid fa-server"></i><span class="name">{arbeitsplatz.ablage.ort}</span><span class="rechts">{anzahl("")}</span>
  </button>
  {#each ablageverwaltung.ordner as o (o)}
    {#if umbenennen === o}
      <form class="ordner-umbenennen" onsubmit={(e) => { e.preventDefault(); void bestaetigen(o); }}>
        <input class="feld" bind:value={neuerName} aria-label="Neuer Ordnername" maxlength="80" use:fokussieren onkeydown={(e) => e.key === "Escape" && (umbenennen = null)} />
      </form>
    {:else}
      <div class="ordner-zeile" class:aktiv-zeile={wahl === o}>
        <button class="eintrag eingerueckt" class:aktiv={wahl === o} onclick={() => waehlen(o)} ondblclick={() => ((umbenennen = o), (neuerName = o))} title="Doppelklick benennt um">
          <i class="fa-solid {wahl === o ? 'fa-folder-open' : 'fa-folder'}"></i><span class="name">{o}</span><span class="rechts">{anzahl(o)}</span>
        </button>
        {#if wahl === o}
          <button class="knopf still nur-symbol" title="Ordner umbenennen" onclick={() => ((umbenennen = o), (neuerName = o))}><i class="fa-solid fa-pen"></i></button>
          {#if anzahl(o) === 0}
            <button class="knopf still nur-symbol" title="Leeren Ordner entfernen" onclick={() => void ablageverwaltung.ordnerEntfernen(o)}><i class="fa-solid fa-folder-minus"></i></button>
          {/if}
        {/if}
      </div>
    {/if}
  {/each}
  <div class="vw-ordner-trenner"></div>
  <button class="eintrag" class:aktiv={wahl === null} onclick={() => waehlen(null)}>
    <i class="fa-solid fa-trash-can"></i><span class="name">Papierkorb</span><span class="rechts">{ablageverwaltung.papierkorb.length}</span>
  </button>
</nav>

<style>
  button.eintrag {
    width: 100%;
    border: 0;
    background: transparent;
    font: inherit;
    text-align: left;
  }
  .eingerueckt {
    padding-left: 30px;
  }
  .ordner-zeile {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .ordner-zeile .eintrag {
    flex: 1;
    min-width: 0;
  }
  .ordner-umbenennen {
    padding: 2px 0 2px 26px;
  }
  .ordner-umbenennen input {
    width: 100%;
    border: 0;
  }
</style>
