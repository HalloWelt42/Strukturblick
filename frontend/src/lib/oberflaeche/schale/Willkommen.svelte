<script lang="ts">
  // Ohne offenes Dokument: öffnen, einfügen oder leer beginnen; zuletzt benutzte aus der Ablage.
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { FORMATE } from "../../formate/registrierung";
  import { dateiWaehlen } from "./dateien";
  import { beispieleOeffnen, BEISPIELE } from "../../zustand/beispiele";

  let eingefuegt = $state("");

  async function oeffnen(): Promise<void> {
    for (const d of await dateiWaehlen()) await arbeitsplatz.dateiOeffnen(d);
  }
  async function ausText(): Promise<void> {
    if (eingefuegt.trim()) await arbeitsplatz.neu("eingefügt", eingefuegt);
  }
</script>

<div class="willkommen">
  <div class="mitte">
    <h1><i class="fa-solid fa-sitemap"></i> Strukturdaten ansehen, prüfen, umbauen</h1>
    <p class="text-3">Datei hierher ziehen, öffnen oder Text einfügen. {arbeitsplatz.ablage.hinweis}</p>
    <div class="knopf-reihe">
      <button class="knopf primaer" onclick={oeffnen}><i class="fa-solid fa-file-import"></i> Datei öffnen</button>
      <button class="knopf" onclick={() => void arbeitsplatz.neu("unbenannt", "")}><i class="fa-solid fa-file"></i> Leeres Dokument</button>
      <button class="knopf" title={BEISPIELE.map((b) => `${b.name}: ${b.beschreibung}`).join("\n")} onclick={() => void beispieleOeffnen()}><i class="fa-solid fa-flask"></i> Beispiele zum Üben</button>
    </div>
    <label class="einfuegen">
      <span class="karte-titel">Text einfügen</span>
      <textarea class="feld" rows="5" placeholder="JSON, CSV, YAML ..." bind:value={eingefuegt}></textarea>
    </label>
    <button class="knopf" disabled={!eingefuegt.trim()} onclick={ausText}><i class="fa-solid fa-arrow-right"></i> Als Dokument öffnen</button>
    <p class="formate text-3">
      {#each FORMATE as f (f.kennung)}<span class="abzeichen">{f.name}</span>{/each}
    </p>
    {#if arbeitsplatz.dokumente.length}
      <div class="karte-titel abstand">Zuletzt</div>
      <div class="zuletzt">
        {#each arbeitsplatz.dokumente.slice(0, 6) as d (d.kennung)}
          <button class="eintrag" onclick={() => void arbeitsplatz.ausAblageOeffnen(d.kennung)}><i class="fa-solid fa-file-lines"></i><span class="name">{d.name}</span></button>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .willkommen {
    flex: 1;
    overflow: auto;
    display: flex;
    justify-content: center;
    padding: var(--a6) var(--a4);
  }
  .mitte {
    width: min(100%, 640px);
    display: flex;
    flex-direction: column;
    gap: var(--a3);
  }
  h1 {
    margin: 0;
    font-size: var(--seitentitel);
    display: flex;
    gap: var(--a3);
    align-items: center;
  }
  h1 i {
    color: var(--akzent);
  }
  p {
    margin: 0;
  }
  .einfuegen {
    display: flex;
    flex-direction: column;
    gap: var(--a1);
    margin-top: var(--a3);
  }
  textarea.feld {
    padding: var(--a2) var(--a3);
    font-family: var(--schrift-mono);
    font-size: var(--klein);
    border: 0;
    resize: vertical;
  }
  .formate {
    display: flex;
    gap: var(--a2);
    flex-wrap: wrap;
  }
  .abstand {
    margin-top: var(--a4);
  }
  .zuletzt .eintrag {
    width: 100%;
    border: 0;
    background: transparent;
    font: inherit;
  }
</style>
