<script lang="ts">
  // Papierkorb: wiederherstellen oder endgültig entfernen; endgültig fragt in der Fläche nach (kein Browser-Dialog).
  import { PAPIERKORB_TAGE, type Papierkorbeintrag } from "../../zustand/ablageverwaltung.svelte";
  import { ablageverwaltung } from "../../zustand/ablageverwaltung.svelte";
  import { endung, groesse, zeitpunkt, type Ablageauswahl } from "./auswahl.svelte";

  let { auswahl, eintraege }: { auswahl: Ablageauswahl; eintraege: Papierkorbeintrag[] } = $props();

  let rueckfrage = $state(false);
  const kennungen = $derived(eintraege.map((d) => d.kennung));
  const gewaehlt = $derived(kennungen.filter((k) => auswahl.istGewaehlt(k)));

  async function wiederherstellen(): Promise<void> {
    const k = [...gewaehlt];
    auswahl.aufheben();
    await ablageverwaltung.wiederherstellen(k);
  }

  async function endgueltig(): Promise<void> {
    const k = [...gewaehlt];
    rueckfrage = false;
    auswahl.aufheben();
    await ablageverwaltung.endgueltigEntfernen(k);
  }
</script>

<div class="hinweis klein text-3"><i class="fa-solid fa-circle-info"></i> Entfernte Dokumente bleiben {PAPIERKORB_TAGE} Tage hier, danach löscht die Ablage sie endgültig.</div>

{#if gewaehlt.length}
  <div class="vw-auswahl-leiste">
    <span class="vw-anzahl">{gewaehlt.length} von {eintraege.length} gewählt</span>
    <button class="knopf" onclick={wiederherstellen}><i class="fa-solid fa-rotate-left"></i> Wiederherstellen</button>
    {#if rueckfrage}
      <span class="rueckfrage"><span>Endgültig entfernen? Das lässt sich nicht rückgängig machen.</span>
        <button class="knopf" onclick={endgueltig}><i class="fa-solid fa-trash-can"></i> Ja, endgültig</button>
        <button class="knopf still" onclick={() => (rueckfrage = false)}>Abbrechen</button></span>
    {:else}
      <button class="knopf" onclick={() => (rueckfrage = true)}><i class="fa-solid fa-trash-can"></i> Endgültig entfernen</button>
    {/if}
    <span class="rechts"><button class="knopf still" onclick={() => auswahl.aufheben()}>Auswahl aufheben</button></span>
  </div>
{/if}

<div class="vw-tabellenfeld">
  <table class="vw-tabelle">
    <thead>
      <tr><th class="vw-schmal"><button class="vw-haken" aria-label="Alle wählen" onclick={() => auswahl.alleOderKeine(kennungen)}><i class="fa-solid fa-check"></i></button></th><th class="vw-name-zelle">Name</th><th class="vw-ab-mittel">Format</th><th class="vw-zahl-zelle">Größe</th><th class="vw-ab-breit">Entfernt</th><th>Ordner</th></tr>
    </thead>
    <tbody>
      {#each eintraege as d (d.kennung)}
        <tr class:gewaehlt={auswahl.istGewaehlt(d.kennung)} onclick={(e) => auswahl.umschalten(d.kennung, e.metaKey || e.ctrlKey || e.shiftKey)}>
          <td><button class="vw-haken" class:an={auswahl.istGewaehlt(d.kennung)} aria-label="{d.name} wählen" onclick={(e) => { e.stopPropagation(); auswahl.umschalten(d.kennung, true); }}><i class="fa-solid fa-check"></i></button></td>
          <td class="vw-name-zelle"><span class="vw-dateiname" title={d.name}><i class="fa-solid fa-file-lines"></i><span>{d.name}</span></span></td>
          <td class="vw-ab-mittel">{#if endung(d.name)}<span class="abzeichen">{endung(d.name)}</span>{/if}</td>
          <td class="vw-zahl-zelle mono">{groesse(d.groesse)}</td>
          <td class="mono vw-ab-breit">{zeitpunkt(d.geloescht)}</td>
          <td>{d.ordner || "Ablage"}</td>
        </tr>
      {:else}
        <tr><td colspan="6" class="leer-zeile text-3">Der Papierkorb ist leer.</td></tr>
      {/each}
    </tbody>
  </table>
</div>

<style>
  .hinweis {
    display: flex;
    gap: var(--a2);
    align-items: center;
    padding: var(--a2) 0;
  }
  button.vw-haken {
    border: 0;
    cursor: pointer;
  }
  .rueckfrage {
    display: flex;
    align-items: center;
    gap: var(--a2);
    padding: 2px var(--a2);
    background: var(--fehler-weich);
    color: var(--fehler);
  }
  .leer-zeile {
    padding: var(--a5);
    text-align: center;
  }
</style>
