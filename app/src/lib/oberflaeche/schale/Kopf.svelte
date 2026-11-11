<script lang="ts">
  // Kopf: Marke, Reiter der offenen Dokumente, Rückgängig und Wiederholen, Anzeige (Thema, Schrift).
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import Anzeigewahl from "./Anzeigewahl.svelte";

  const blatt = $derived(arbeitsplatz.aktivesBlatt);
  const letzter = $derived(blatt && blatt.kannZurueck ? blatt.verlauf.eintraege[blatt.verlauf.zeiger - 1]?.aufruf.titel : null);
  const naechster = $derived(blatt && blatt.kannVor ? blatt.verlauf.eintraege[blatt.verlauf.zeiger]?.aufruf.titel : null);

  async function neu(): Promise<void> {
    const zahl = arbeitsplatz.blaetter.filter((b) => b.name.startsWith("unbenannt")).length + 1;
    await arbeitsplatz.neu(zahl === 1 ? "unbenannt" : `unbenannt ${zahl}`, "");
  }
</script>

<header class="kopf">
  <div class="marke"><i class="fa-solid fa-sitemap"></i> <span>Strukturblick</span></div>
  <nav class="dok-reiter" aria-label="Geöffnete Dokumente">
    {#each arbeitsplatz.blaetter as b (b.kennung)}
      <div class="reiter" class:aktiv={b === blatt} role="tab" aria-selected={b === blatt} title={b.name}>
        <button class="reiter-knopf" onclick={() => arbeitsplatz.waehlen(b)}>
          <i class="fa-solid fa-file-lines"></i><span class="name">{b.name}</span>
        </button>
        {#if !b.gespeichert}<span class="stand" title="Wird gerade abgelegt"></span>{/if}
        <button class="reiter-knopf zu" title="Schließen (bleibt in der Ablage)" onclick={() => void arbeitsplatz.schliessen(b)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    {/each}
    <button class="reiter reiter-knopf" title="Neues leeres Dokument" onclick={() => void neu()}><i class="fa-solid fa-plus"></i></button>
  </nav>
  <div class="kopf-rechts">
    <button class="knopf nur-symbol" disabled={!blatt?.kannZurueck} title={letzter ? `Rückgängig: ${letzter} (⌘ Z)` : "Nichts rückgängig zu machen"} onclick={() => blatt?.rueckgaengig()}>
      <i class="fa-solid fa-rotate-left"></i>
    </button>
    <button class="knopf nur-symbol" disabled={!blatt?.kannVor} title={naechster ? `Wiederholen: ${naechster} (⇧ ⌘ Z)` : "Nichts zu wiederholen"} onclick={() => blatt?.wiederholen()}>
      <i class="fa-solid fa-rotate-right"></i>
    </button>
    <Anzeigewahl />
  </div>
</header>

<style>
  .reiter-knopf {
    display: flex;
    align-items: center;
    gap: var(--a2);
    min-width: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  .reiter-knopf:not(.reiter) {
    padding: 0;
  }
</style>
