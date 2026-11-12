<script lang="ts">
  // Ansicht Vergleich (entwuerfe/vergleich.html): das Dokument gegen eine Gegenseite (offenes Dokument, Ablage, früherer
  // Stand, Datei) strukturell vergleichen. Listen werden über ein Schlüsselfeld gepaart, wo eins taugt; beide Seiten
  // nebeneinander, rechts die Unterschiede; als JSON Patch zum Herunterladen.
  import "../ansichten.css";
  import "./vergleich.css";
  import { jsonPatch } from "../../../analyse/vergleich/patch";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { arbeitsplatz } from "../../../zustand/arbeitsplatz.svelte";
  import { meldungen } from "../../../zustand/meldungen.svelte";
  import { einleserFuer } from "../../../formate/einlesen/registrierung";
  import { textAusBytes } from "../../../formate/kodierung";
  import { dateiWaehlen, herunterladen } from "../../schale/dateien";
  import { vergleichZustand } from "./vergleichZustand.svelte";
  import Seiten from "./Seiten.svelte";
  import Unterschiede from "./Unterschiede.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(vergleichZustand(blatt));
  const ergebnis = $derived(z.vergleich(blatt));
  const v = $derived(ergebnis.vergleich);
  const seiten = $derived(z.seiten(blatt));

  let menue = $state<"offen" | "ablage" | "stand" | "feld" | null>(null);
  const offeneDokumente = $derived(arbeitsplatz.blaetter.filter((b) => b.kennung !== blatt.kennung));
  const ablageDokumente = $derived(arbeitsplatz.dokumente.filter((d) => d.kennung !== blatt.kennung && !arbeitsplatz.blaetter.some((b) => b.kennung === d.kennung)));
  const staende = $derived(Array.from({ length: blatt.verlauf.eintraege.length + 1 }, (_, i) => i).filter((i) => i !== blatt.verlauf.zeiger).reverse());
  /** Die oberste Liste mit Schlüsselkandidaten: für sie gilt die Feldwahl in der Werkzeugzeile */
  const tiefe = (muster: string) => muster.split("[]").length;
  const hauptliste = $derived([...(v?.paarungen ?? [])].filter((p) => p.kandidaten.length).sort((a, b) => tiefe(a.muster) - tiefe(b.muster))[0] ?? null);

  // Ohne Wahl: der Anfang des Verlaufs, wenn es Änderungen gibt
  $effect(() => {
    if (!z.gegenseite && blatt.verlauf.zeiger > 0) z.standWaehlen(blatt, 0);
  });

  async function dateiOeffnen(): Promise<void> {
    const [datei] = await dateiWaehlen();
    if (!datei) return;
    const bytes = new Uint8Array(await datei.arrayBuffer());
    const einleser = einleserFuer(datei.name);
    try {
      z.dateiWaehlen(datei.name, einleser ? einleser.einlesen(bytes, datei.name).text : textAusBytes(bytes).text);
    } catch (e) {
      meldungen.zeigen({ text: `${datei.name}: ${(e as Error).message}`, art: "fehler" });
    }
  }

  function patchHerunterladen(): void {
    if (!v) return;
    herunterladen(`${blatt.name.replace(/\.[^.]+$/, "")}.patch.json`, JSON.stringify(jsonPatch(v.wurzel), null, 2) + "\n", "application/json-patch+json");
  }
</script>

<svelte:window onpointerdown={(e) => menue && !(e.target as HTMLElement).closest(".vg-menue") && (menue = null)} />

{#snippet liste(eintraege: readonly { titel: string; neben?: string; waehlen: () => void }[], leer: string)}
  <div class="vg-liste karte" role="menu">
    {#each eintraege as e, i (i)}
      <button role="menuitem" onclick={() => { menue = null; e.waehlen(); }}><span class="mono">{e.titel}</span>{#if e.neben}<span class="text-3 klein">{e.neben}</span>{/if}</button>
    {:else}
      <p class="klein text-3">{leer}</p>
    {/each}
  </div>
{/snippet}

<div class="vg-ansicht">
  <div class="werkzeugzeile an-umbruch">
    <span class="an-zeilen-name">Vergleichen mit</span>
    <nav class="segment vg-menue" aria-label="Gegenseite">
      <button class:aktiv={z.gegenseite?.art === "dokument" && offeneDokumente.some((b) => b.kennung === (z.gegenseite as { kennung: string }).kennung)} title="Offenes Dokument" onclick={() => (menue = menue === "offen" ? null : "offen")}><i class="fa-solid fa-file-code"></i><span>Offenes Dokument</span><i class="fa-solid fa-caret-down"></i></button>
      <button class:aktiv={z.gegenseite?.art === "dokument" && !offeneDokumente.some((b) => b.kennung === (z.gegenseite as { kennung: string }).kennung)} title="Dokument aus der Ablage" onclick={() => (menue = menue === "ablage" ? null : "ablage")}><i class="fa-solid fa-folder-open"></i><span>Aus der Ablage</span><i class="fa-solid fa-caret-down"></i></button>
      <button class:aktiv={z.gegenseite?.art === "stand"} title="Frühere Fassung dieses Dokuments aus dem Verlauf" onclick={() => (menue = menue === "stand" ? null : "stand")}><i class="fa-solid fa-clock-rotate-left"></i><span>{z.gegenseite?.art === "stand" ? `Stand ${z.gegenseite.zeiger}` : "Früherer Stand"}</span><i class="fa-solid fa-caret-down"></i></button>
      <button class:aktiv={z.gegenseite?.art === "datei"} title="Datei von diesem Gerät, ohne sie abzulegen" onclick={() => void dateiOeffnen()}><i class="fa-solid fa-upload"></i><span>Datei öffnen</span></button>
      {#if menue === "offen"}{@render liste(offeneDokumente.map((b) => ({ titel: b.name, neben: b.ordner, waehlen: () => void z.dokumentWaehlen(b.kennung, b.name, b.text) })), "Kein anderes Dokument offen.")}{/if}
      {#if menue === "ablage"}{@render liste(ablageDokumente.map((d) => ({ titel: d.name, neben: d.ordner, waehlen: () => void z.dokumentWaehlen(d.kennung, d.name) })), "Keine weiteren Dokumente in der Ablage.")}{/if}
      {#if menue === "stand"}{@render liste(staende.map((i) => ({ titel: `Stand ${i}`, neben: i === 0 ? "Anfang" : blatt.verlauf.eintraege[i - 1]?.aufruf.titel ?? "", waehlen: () => z.standWaehlen(blatt, i) })), "Noch keine Änderungen im Verlauf.")}{/if}
    </nav>
    <div class="rechts">
      <button class="knopf" title="Vorher und Jetzt tauschen" disabled={!z.gegenseite} onclick={() => (z.getauscht = !z.getauscht)}><i class="fa-solid fa-right-left"></i> Seiten tauschen</button>
      <button class="knopf primaer" title="Die Vorgänge, die Vorher in Jetzt verwandeln (RFC 6902)" disabled={!v} onclick={patchHerunterladen}><i class="fa-solid fa-file-export"></i> Als JSON Patch</button>
    </div>
  </div>
  <div class="werkzeugzeile an-umbruch">
    <button class="an-wahl" role="checkbox" aria-checked={z.optionen.schluessel} onclick={() => z.setzen("schluessel", !z.optionen.schluessel)}><span class="an-haken" class:an-an={z.optionen.schluessel}><i class="fa-solid fa-check"></i></span>Listen über Schlüssel abgleichen{hauptliste ? `, ${hauptliste.muster}:` : ""}</button>
    {#if hauptliste && z.optionen.schluessel}
      <div class="vg-menue vg-anker">
        <button class="knopf an-wahl-knopf" title="Schlüsselfeld für {hauptliste.muster} wählen" onclick={() => (menue = menue === "feld" ? null : "feld")}>{hauptliste.feld ?? "nach Stelle"} <i class="fa-solid fa-caret-down"></i></button>
        {#if menue === "feld"}{@render liste([...hauptliste.kandidaten.map((k) => ({ titel: k, neben: k === hauptliste.feld ? "gewählt" : "", waehlen: () => z.setzen("felder", { ...z.optionen.felder, [hauptliste.muster]: k }) })), { titel: "nach Stelle", neben: "ohne Schlüssel", waehlen: () => z.setzen("felder", { ...z.optionen.felder, [hauptliste.muster]: "" }) }], "")}{/if}
      </div>
    {/if}
    <button class="an-wahl" role="checkbox" aria-checked={z.optionen.reihenfolgeEgal} onclick={() => z.setzen("reihenfolgeEgal", !z.optionen.reihenfolgeEgal)}><span class="an-haken" class:an-an={z.optionen.reihenfolgeEgal}><i class="fa-solid fa-check"></i></span>Reihenfolge ignorieren</button>
  </div>
  <div class="inhalt an-raum">
    {#if v}
      <div class="an-vg">
        <Seiten {z} vergleich={v} {seiten} />
        <Unterschiede {z} vergleich={v} />
      </div>
    {:else}
      <div class="vg-leer">
        <i class="fa-solid fa-code-compare"></i>
        <p><strong>{ergebnis.fehler ?? "Womit vergleichen?"}</strong></p>
        <p class="klein text-3">{blatt.analyse ? "Oben ein offenes Dokument, eines aus der Ablage, einen früheren Stand dieses Dokuments oder eine Datei wählen." : "Das Dokument wird gelesen ..."}</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .vg-ansicht {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .vg-ansicht > .inhalt {
    flex: 1;
    min-height: 0;
  }
  .vg-menue,
  .vg-anker {
    position: relative;
  }
  .vg-liste {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 20;
    margin: 0;
    min-width: 280px;
    max-height: 360px;
    overflow-y: auto;
    padding: var(--a1);
    box-shadow: var(--kante), var(--schatten-schwebend);
  }
  .vg-liste button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--a3);
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
  .vg-liste button:hover {
    background: var(--akzent-weich);
  }
  .vg-leer {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--a2);
    height: 100%;
    padding: var(--a5);
    text-align: center;
    color: var(--text-2);
  }
  .vg-leer > i {
    font-size: 2rem;
    color: var(--text-3);
  }
</style>
