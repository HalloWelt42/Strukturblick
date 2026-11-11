<script lang="ts">
  // Seite Ablage (Entwurf entwuerfe/ablage.html): Ordner links, Ablagezone, Dokumente mit Auswahl, Papierkorb. Sie
  // ersetzt Hauptbereich und Inspektor, solange sie offen ist; im Ansichtskopf steht sie als eigenes Segment mit Kreuz.
  import { fokussieren } from "../bausteine/fokus";
  import "./ablage.css";
  import { onMount } from "svelte";
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { ablageverwaltung } from "../../zustand/ablageverwaltung.svelte";
  import { zugang } from "../../zustand/zugang.svelte";
  import { ANSICHTEN } from "../ansichten/registrierung";
  import { dateiWaehlen } from "../schale/dateien";
  import { Ablageauswahl } from "./auswahl.svelte";
  import OrdnerSpalte from "./OrdnerSpalte.svelte";
  import DokumentTabelle from "./DokumentTabelle.svelte";
  import PapierkorbTabelle from "./PapierkorbTabelle.svelte";
  import AblageInspektor from "./AblageInspektor.svelte";

  const auswahl = new Ablageauswahl();
  let neuerOrdner = $state<string | null>(null);

  onMount(() => void ablageverwaltung.neuLaden());

  const wahl = $derived(ablageverwaltung.ordnerWahl);
  const imPapierkorb = $derived(wahl === null);
  const dokumente = $derived(auswahl.sicht(arbeitsplatz.dokumente, wahl));
  const papierkorb = $derived(auswahl.sicht(ablageverwaltung.papierkorb, null));
  const blatt = $derived(arbeitsplatz.aktivesBlatt);

  async function oeffnen(): Promise<void> {
    for (const d of await dateiWaehlen()) await arbeitsplatz.dateiOeffnen(d, wahl ?? "");
  }

  async function ordnerAnlegen(e: Event): Promise<void> {
    e.preventDefault();
    if (neuerOrdner !== null && (await ablageverwaltung.ordnerAnlegen(neuerOrdner))) neuerOrdner = null;
  }

  function zurAnsicht(kennung: string): void {
    if (!blatt) return;
    blatt.zeigen({ art: "ansicht", kennung });
    ablageverwaltung.schliessen();
  }
</script>

<main class="haupt">
  <div class="ansicht-kopf">
    {#if blatt}
      <nav class="segment" aria-label="Ansicht">
        {#each ANSICHTEN as a (a.kennung)}
          <button onclick={() => zurAnsicht(a.kennung)}><i class="fa-solid {a.symbol}"></i><span>{a.titel}</span></button>
        {/each}
      </nav>
    {/if}
    <nav class="segment"><button class="aktiv" onclick={() => ablageverwaltung.schliessen()} title="Ablage schließen"><i class="fa-solid fa-folder-open"></i><span>Ablage</span> <i class="fa-solid fa-xmark"></i></button></nav>
    <div class="vw-anmeldung"><i class="fa-solid fa-server"></i><span>{arbeitsplatz.ablage.ort}{#if zugang.konto}, angemeldet als {zugang.konto}{/if}</span></div>
  </div>
  <div class="werkzeugzeile">
    <nav class="pfad" aria-label="Ordner">
      <button class="pfad-teil" onclick={() => (ablageverwaltung.ordnerWahl = "")}>Ablage</button>
      {#if wahl}<span class="trenner"><i class="fa-solid fa-chevron-right"></i></span><span class="letzter">{wahl}</span>{/if}
      {#if imPapierkorb}<span class="trenner"><i class="fa-solid fa-chevron-right"></i></span><span class="letzter">Papierkorb</span>{/if}
    </nav>
    <div class="rechts">
      <label class="feld suchfeld"><i class="fa-solid fa-magnifying-glass"></i><input bind:value={auswahl.suche} placeholder="In der Ablage suchen" /></label>
      {#if neuerOrdner === null}
        <button class="knopf" onclick={() => (neuerOrdner = "")}><i class="fa-solid fa-folder-plus"></i><span class="nur-breit">Neuer Ordner</span></button>
      {:else}
        <form class="neuer-ordner" onsubmit={ordnerAnlegen}>
          <input class="feld" bind:value={neuerOrdner} placeholder="Name des Ordners" maxlength="80" use:fokussieren onkeydown={(e) => e.key === "Escape" && (neuerOrdner = null)} />
          <button class="knopf primaer" type="submit" disabled={!neuerOrdner.trim()}>Anlegen</button>
        </form>
      {/if}
    </div>
  </div>
  <div class="inhalt">
    <div class="vw-zweiteilig">
      <OrdnerSpalte onwahl={() => auswahl.aufheben()} />
      <div class="vw-hauptspalte vw-gestapelt">
        {#if imPapierkorb}
          <PapierkorbTabelle {auswahl} eintraege={papierkorb} />
        {:else}
          <div class="vw-ablagezone">
            <i class="fa-solid fa-cloud-arrow-up"></i>
            <span>Dateien hierher ziehen, sie landen in <strong>{wahl || arbeitsplatz.ablage.ort}</strong>.</span>
            <span class="rechts"><button class="knopf" onclick={oeffnen}><i class="fa-solid fa-folder-open"></i> Datei wählen</button></span>
          </div>
          <DokumentTabelle {auswahl} {dokumente} />
        {/if}
      </div>
    </div>
  </div>
</main>
<AblageInspektor {auswahl} />

<style>
  .pfad-teil {
    border: 0;
    background: transparent;
    font: inherit;
    color: var(--text-2);
    padding: 2px 6px;
    cursor: pointer;
  }
  .pfad .letzter {
    color: var(--akzent);
    font-weight: 600;
    padding: 2px 6px;
  }
  .suchfeld {
    width: 220px;
  }
  .neuer-ordner {
    display: flex;
    gap: var(--a2);
  }
  .neuer-ordner input {
    border: 0;
    width: 200px;
  }
</style>
