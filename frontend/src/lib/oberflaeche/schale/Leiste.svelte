<script lang="ts">
  // Linke Leiste: Dokumente der obersten Ebene und Ordner der Ablage (Bauart ohne Server: dieser Browser), Öffnen,
  // Herunterladen; der Ordnerknopf öffnet die Seite Ablage.
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { ablageverwaltung } from "../../zustand/ablageverwaltung.svelte";
  import { herunterladen, dateiWaehlen } from "./dateien";

  const blatt = $derived(arbeitsplatz.aktivesBlatt);
  const offen = $derived(new Set(arbeitsplatz.blaetter.map((b) => b.kennung)));

  const oben = $derived(arbeitsplatz.dokumente.filter((d) => !d.ordner));
  const anzahl = (o: string): number => arbeitsplatz.dokumente.filter((d) => d.ordner === o).length;
  const ablageOffen = $derived(arbeitsplatz.seite === "ablage");

  function ordnerOeffnen(o: string): void {
    ablageverwaltung.ordnerWahl = o;
    ablageverwaltung.oeffnen();
  }

  async function oeffnen(): Promise<void> {
    for (const d of await dateiWaehlen()) await arbeitsplatz.dateiOeffnen(d);
  }
</script>

<aside class="leiste">
  <div class="leiste-feld">
    <div class="leiste-titel">{arbeitsplatz.ablage.ort} <span class="rechts"><button class="knopf still nur-symbol" class:aktiv-knopf={ablageOffen} title="Ablage verwalten: Ordner, Umbenennen, Papierkorb" onclick={() => ablageverwaltung.oeffnen()}><i class="fa-solid fa-folder-open"></i></button></span></div>
    <div class="knopf-spalte">
      <button class="knopf" onclick={oeffnen}><i class="fa-solid fa-folder-open"></i> <span class="name">Datei öffnen</span></button>
      <button class="knopf" disabled={!blatt} onclick={() => blatt && herunterladen(blatt.name, blatt.text)}><i class="fa-solid fa-download"></i> <span class="name">Herunterladen</span></button>
    </div>
    {#if arbeitsplatz.dokumente.length || ablageverwaltung.ordner.length}
      <div class="leiste-titel">Dokumente</div>
      {#each oben as d (d.kennung)}
        <a
          class="eintrag"
          class:aktiv={!ablageOffen && blatt?.kennung === d.kennung}
          href="#{d.kennung}"
          title={d.name}
          onclick={(e) => { e.preventDefault(); void arbeitsplatz.ausAblageOeffnen(d.kennung); }}
        >
          <i class="fa-solid fa-file-lines"></i><span class="name">{d.name}</span>
          <span class="rechts">{#if offen.has(d.kennung)}<span class="abzeichen" title="Als Reiter geöffnet">offen</span>{/if}</span>
        </a>
      {/each}
      {#each ablageverwaltung.ordner as o (o)}
        <a class="eintrag" class:aktiv={ablageOffen && ablageverwaltung.ordnerWahl === o} href="#{o}" title="Ordner {o}" onclick={(e) => { e.preventDefault(); ordnerOeffnen(o); }}>
          <i class="fa-solid fa-folder"></i><span class="name">{o}</span><span class="rechts"><span class="text-3 klein mono">{anzahl(o)}</span></span>
        </a>
      {/each}
    {/if}
  </div>
  <div class="leiste-fuss"><i class="fa-solid fa-circle-info"></i><span>{arbeitsplatz.ablage.hinweis}</span></div>
</aside>

<style>
  .aktiv-knopf {
    color: var(--akzent);
  }
  .knopf-spalte {
    display: flex;
    flex-direction: column;
    gap: var(--a2);
    padding: 0 var(--a2) var(--a2);
  }
  .knopf-spalte .knopf {
    justify-content: flex-start;
  }
  .leiste-fuss span {
    white-space: normal;
  }
</style>
