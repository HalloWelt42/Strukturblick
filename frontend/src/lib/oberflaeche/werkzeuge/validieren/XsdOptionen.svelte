<script lang="ts">
  // Optionen beim Prüfen gegen XML Schema: Schema aus der Ablage oder aus einem Schema-Paket (ZIP, bleibt im Browser),
  // Hinweis auf das Schema, auf das das Dokument selbst verweist.
  import { verwiesenesSchema } from "../../../analyse/xsd/pruefen";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import type { XsdZustand } from "./xsdZustand.svelte";

  let { blatt, x }: { blatt: Arbeitsblatt; x: XsdZustand } = $props();

  let menue = $state<"ablage" | "paket" | null>(null);
  let dateiwahl = $state<HTMLInputElement>();
  const ablage = $derived(x.schemasDerAblage());
  const verweis = $derived(verwiesenesSchema(blatt.text));
  const paketSchemas = $derived([...(x.paket?.dateien ?? [])].sort((a, b) => Number(b.pfad.split("/").pop() === verweis) - Number(a.pfad.split("/").pop() === verweis) || a.pfad.localeCompare(b.pfad, "de")));

  async function paketGewaehlt(): Promise<void> {
    const datei = dateiwahl?.files?.[0];
    if (datei) await x.paketLaden(datei, blatt);
    if (dateiwahl) dateiwahl.value = "";
  }
</script>

<svelte:window onpointerdown={(e) => menue && !(e.target as HTMLElement).closest(".xo-menue") && (menue = null)} />

<div class="wz-optionen">
  <div class="wz-option xo-menue">
    <span class="wz-etikett">XML Schema</span>
    <nav class="segment" aria-label="Herkunft des Schemas">
      <button class:aktiv={x.wahl?.art === "ablage"} title="Ein XML Schema aus der Ablage; Importe aus demselben Ordner" onclick={() => (menue = menue === "ablage" ? null : "ablage")}><i class="fa-solid fa-folder-open"></i><span>Aus der Ablage</span><i class="fa-solid fa-caret-down"></i></button>
      <button class:aktiv={x.wahl?.art === "paket"} title="Schema-Paket als ZIP: bleibt nur in diesem Browser" onclick={() => (x.paket ? (menue = menue === "paket" ? null : "paket") : dateiwahl?.click())}><i class="fa-solid fa-file-zipper"></i><span>{x.paket ? x.paket.name : "Schema-Paket (ZIP)"}</span>{#if x.paket}<i class="fa-solid fa-caret-down"></i>{/if}</button>
    </nav>
    <input type="file" accept=".zip" class="xo-versteckt" bind:this={dateiwahl} onchange={() => void paketGewaehlt()} />
    {#if menue === "ablage"}
      <div class="xo-liste karte" role="menu">
        {#each ablage as d (d.kennung)}
          <button role="menuitem" onclick={() => { menue = null; x.wahl = { art: "ablage", ...d }; }}><span class="mono">{d.ordner ? `${d.ordner} / ` : ""}{d.name}</span>{#if d.name === verweis}<span class="abzeichen gut">laut Dokument</span>{/if}</button>
        {:else}
          <p class="klein text-3">Kein XML Schema in der Ablage. Die .xsd-Dateien öffnen (am besten in einen gemeinsamen Ordner) oder ein Schema-Paket laden.</p>
        {/each}
      </div>
    {/if}
    {#if menue === "paket" && x.paket}
      <div class="xo-liste karte" role="menu">
        <button role="menuitem" onclick={() => { menue = null; dateiwahl?.click(); }}><span><i class="fa-solid fa-file-zipper"></i> Anderes Paket laden</span></button>
        {#each paketSchemas.slice(0, 300) as d (d.pfad)}
          <button role="menuitem" onclick={() => { menue = null; x.wahl = { art: "paket", pfad: d.pfad, name: d.pfad.split("/").pop() ?? d.pfad }; }}><span class="mono">{d.pfad}</span>{#if d.pfad.split("/").pop() === verweis}<span class="abzeichen gut">laut Dokument</span>{/if}</button>
        {/each}
        {#if paketSchemas.length > 300}<p class="klein text-3">und {anzahl(paketSchemas.length - 300)} weitere; das Schema laut Dokument steht oben.</p>{/if}
      </div>
    {/if}
  </div>
  <div class="wz-option">
    {#if x.wahl}<span class="mono klein">{x.wahl.name}</span>{:else if verweis}<span class="klein text-3">Das Dokument verweist auf <span class="mono">{verweis}</span></span>{/if}
    {#if x.paketfehler}<span class="abzeichen fehler">{x.paketfehler}</span>{/if}
  </div>
  <div class="rechts">
    {#if x.laeuft}<span class="wz-etikett"><i class="fa-solid fa-spinner fa-spin"></i> prüft</span>{:else}<span class="wz-etikett"><i class="fa-solid fa-gears"></i> libxml2 im Browser</span>{/if}
  </div>
</div>

<style>
  .xo-menue {
    position: relative;
  }
  .xo-versteckt {
    display: none;
  }
  .xo-liste {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 20;
    margin: 0;
    min-width: 320px;
    max-width: min(640px, 80vw);
    max-height: 380px;
    overflow-y: auto;
    padding: var(--a1);
    box-shadow: var(--kante), var(--schatten-schwebend);
  }
  .xo-liste button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--a2);
    width: 100%;
    min-height: var(--zeile);
    padding: 0 var(--a2);
    border: 0;
    background: transparent;
    font: inherit;
    font-size: var(--klein);
    color: var(--text-1);
    text-align: left;
    cursor: pointer;
  }
  .xo-liste button:hover {
    background: var(--akzent-weich);
  }
  .xo-liste .mono {
    overflow-wrap: anywhere;
  }
</style>
