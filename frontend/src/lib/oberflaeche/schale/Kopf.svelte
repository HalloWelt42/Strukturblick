<script lang="ts">
  // Kopf: Marke, Reiter der offenen Dokumente, Rückgängig und Wiederholen, Befehlspalette, Anzeige (Thema, Schrift).
  // Die Knöpfe führen Aktionen aus dem Register aus; Titel und Kürzel kommen von dort.
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { kontext } from "../bausteine/kontextstand.svelte";
  import { reiterMenue } from "../aktionen/kontextmenues";
  import { aktion } from "../aktionen/aktionen";
  import { knopfTitel, paletteKappen } from "../aktionen/tastatur";
  import { palette } from "../palette/palettenstand.svelte";
  import Anzeigewahl from "./Anzeigewahl.svelte";

  const blatt = $derived(arbeitsplatz.aktivesBlatt);
  const zurueck = aktion("rueckgaengig");
  const vor = aktion("wiederholen");
  const neu = aktion("dokument-neu");
  const schliessen = aktion("dokument-schliessen");
</script>

<header class="kopf">
  <div class="marke"><i class="fa-solid fa-sitemap"></i> <span>Strukturblick</span></div>
  <nav class="dok-reiter" aria-label="Geöffnete Dokumente">
    {#each arbeitsplatz.blaetter as b (b.kennung)}
      <div class="reiter" class:aktiv={b === blatt} role="tab" aria-selected={b === blatt} title="{b.name} (Rechtsklick: Menü)" use:kontext={() => reiterMenue(b)}>
        <button class="reiter-knopf" onclick={() => arbeitsplatz.waehlen(b)}>
          <i class="fa-solid fa-file-lines"></i><span class="name">{b.name}</span>
        </button>
        {#if !b.gespeichert}<span class="stand" title="Wird gerade abgelegt"></span>{/if}
        <button class="reiter-knopf zu" title={b === blatt ? knopfTitel(schliessen, "Schließen, bleibt in der Ablage") : "Schließen, bleibt in der Ablage"} onclick={() => void arbeitsplatz.schliessen(b)}>
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    {/each}
    <button class="reiter reiter-knopf" title={knopfTitel(neu)} onclick={() => neu.ausfuehren()}><i class="fa-solid fa-plus"></i></button>
  </nav>
  <div class="kopf-rechts">
    <button class="knopf nur-symbol" disabled={!zurueck.verfuegbar()} title={zurueck.verfuegbar() ? knopfTitel(zurueck, `Rückgängig: ${zurueck.beschreibung}`) : zurueck.beschreibung} onclick={() => zurueck.ausfuehren()}>
      <i class="fa-solid {zurueck.symbol}"></i>
    </button>
    <button class="knopf nur-symbol" disabled={!vor.verfuegbar()} title={vor.verfuegbar() ? knopfTitel(vor, `Wiederholen: ${vor.beschreibung}`) : vor.beschreibung} onclick={() => vor.ausfuehren()}>
      <i class="fa-solid {vor.symbol}"></i>
    </button>
    <button class="befehl-feld" title="Befehlspalette: Befehle, Dokumente, Ansichten" onclick={() => palette.oeffnen()}>
      <i class="fa-solid fa-magnifying-glass"></i><span class="text">Befehl oder Dokument</span>
      <span class="rechts">{#each paletteKappen() as k, i (i)}<span class="taste">{k}</span>{/each}</span>
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
  button.befehl-feld {
    border: 0;
    font: inherit;
    font-size: var(--klein);
  }
</style>
