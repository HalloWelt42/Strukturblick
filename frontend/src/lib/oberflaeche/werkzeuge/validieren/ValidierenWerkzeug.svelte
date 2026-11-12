<script lang="ts">
  // Werkzeug Validieren (entwuerfe/validieren.html): Schema wählen (ein Dokument der Ablage oder aus den Daten
  // abgeleitet), Befunde mit Filter, Fundstelle als Ausschnitt; prüft nach jeder Änderung neu. Bericht als Datei.
  import "../werkzeuge.css";
  import { KEIN, KnotenArt } from "../../../kern/strukturindex";
  import { listeFinden } from "../../../analyse/tabelle";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { arbeitsplatz } from "../../../zustand/arbeitsplatz.svelte";
  import { herunterladen } from "../../schale/dateien";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import { validierenZustand } from "./validierenZustand.svelte";
  import Befundliste from "./Befundliste.svelte";
  import Fundstelle from "./Fundstelle.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(validierenZustand(blatt));
  const ergebnis = $derived(z.pruefung(blatt));
  const p = $derived(ergebnis?.pruefung ?? null);
  const befunde = $derived(p?.ok ? p.befunde : []);
  const gezeigt = $derived(befunde.filter((b) => z.filter === "alle" || b.art === z.filter));
  const befund = $derived(gezeigt[Math.min(z.gewaehlt, gezeigt.length - 1)] ?? null);

  let menueOffen = $state(false);
  const schemaDokumente = $derived(arbeitsplatz.dokumente.filter((d) => d.kennung !== blatt.kennung && /\.json$/i.test(d.name)).sort((a, b) => Number(/schema/i.test(b.name)) - Number(/schema/i.test(a.name)) || a.name.localeCompare(b.name, "de")));

  /** Wie viele Einträge der Hauptliste ohne Befund sind */
  const eintraege = $derived.by(() => {
    const index = blatt.analyse?.index;
    if (!index || !p?.ok) return null;
    const liste = listeFinden(index, KEIN, KEIN);
    if (liste === KEIN || index.art[liste] !== KnotenArt.liste) return null;
    const mitBefund = new Set<number>();
    for (const b of befunde) {
      for (let k = b.knoten; k !== KEIN; k = index.eltern[k]) {
        if (index.eltern[k] === liste) { mitBefund.add(k); break; }
      }
    }
    return { gesamt: index.kinder[liste], ohne: index.kinder[liste] - mitBefund.size };
  });

  function bericht(): void {
    if (!p?.ok) return;
    const quelle = z.quelle.art === "daten" ? "aus den Daten abgeleitet" : z.quelle.name;
    const zeilen = [`Prüfbericht für ${blatt.name}`, `Schema: ${quelle}`, `Befunde: ${befunde.length} (${befunde.filter((b) => b.art === "fehler").length} Fehler, ${befunde.filter((b) => b.art === "warnung").length} Warnungen)`, ""];
    for (const b of befunde) zeilen.push(`Zeile ${b.zeile}, Spalte ${b.spalte}  ${b.art === "fehler" ? "Fehler" : "Warnung"}  ${b.zeiger || "/"}`, `  ${b.meldung}`, `  Erwartet: ${b.erwartet}`, `  Gefunden: ${b.gefunden}`, `  Regel: ${b.regel} (${b.imSchema})`, "");
    herunterladen(`${blatt.name.replace(/\.[^.]+$/, "")}.pruefbericht.txt`, zeilen.join("\n"));
  }
</script>

<svelte:window onpointerdown={(e) => menueOffen && !(e.target as HTMLElement).closest(".va-menue") && (menueOffen = false)} />

<div class="va-ansicht">
  <div class="wz-optionen">
    <div class="wz-option">
      <span class="wz-etikett">Schema</span>
      <nav class="segment" aria-label="Herkunft des Schemas">
        <button class:aktiv={z.quelle.art === "dokument"} title="Ein JSON Schema aus der Ablage nehmen" onclick={() => (menueOffen = !menueOffen)}><i class="fa-solid fa-folder-open"></i><span>Aus der Ablage</span></button>
        <button class:aktiv={z.quelle.art === "daten"} title="Schema aus den Daten dieses Dokuments ableiten (wie in der Ansicht Struktur)" onclick={() => z.datenWaehlen()}><i class="fa-solid fa-ruler-combined"></i><span>Aus den Daten</span></button>
      </nav>
    </div>
    <div class="wz-option va-menue">
      {#if z.quelle.art === "dokument"}
        <button class="knopf" title="Anderes Schema wählen" onclick={() => (menueOffen = !menueOffen)}><i class="fa-solid fa-file-shield"></i><span class="mono">{z.quelle.name}</span><i class="fa-solid fa-caret-down text-3"></i></button>
      {:else}
        <span class="klein text-3">Abgeleitet aus {blatt.name}: prüft Typen und Pflichtfelder</span>
      {/if}
      {#if menueOffen}
        <div class="va-liste karte" role="menu">
          {#each schemaDokumente as d (d.kennung)}
            <button role="menuitem" onclick={() => { menueOffen = false; void z.dokumentWaehlen(d.kennung, d.name); }}><i class="fa-solid fa-file-code"></i><span class="mono">{d.ordner ? `${d.ordner} / ` : ""}{d.name}</span></button>
          {:else}
            <p class="klein text-3">Kein JSON-Dokument in der Ablage. Ein Schema öffnen (Datei öffnen) oder in der Ansicht Struktur ableiten und herunterladen.</p>
          {/each}
        </div>
      {/if}
    </div>
    <div class="rechts">
      {#if z.quelle.art === "dokument"}<button class="knopf" title="Schema neu laden, etwa nach einer Änderung daran" onclick={() => void z.neuLaden()}><i class="fa-solid fa-rotate"></i> Erneut prüfen</button>{/if}
    </div>
  </div>
  <div class="inhalt">
    <div class="wz-flaeche">
      {#if !p}
        <p class="wz-satz">{blatt.analyse ? "Das Dokument lässt sich so nicht lesen." : "Das Dokument wird gelesen ..."}</p>
      {:else if !p.ok}
        <div class="wz-band"><i class="fa-solid fa-triangle-exclamation"></i><span>{p.fehler}</span></div>
      {:else}
        <div class="wz-raster wz-liste-breit">
          <Befundliste {z} {befunde} {gezeigt} gewaehlt={befund} index={blatt.analyse!.index!} text={blatt.analyseText} />
          {#if befund}
            <Fundstelle {blatt} {befund} text={blatt.analyseText} />
          {:else}
            <section class="wz-tafel"><div class="wz-tafel-kopf"><i class="fa-solid fa-circle-check"></i> Alles passt</div><div class="wz-tafel-feld"><p class="wz-satz va-luft">Keine Befunde: Das Dokument entspricht dem Schema.</p></div></section>
          {/if}
        </div>
      {/if}
    </div>
  </div>
  {#if p?.ok}
    <div class="wz-aktionen">
      <i class="fa-solid fa-circle-info"></i>
      <span>{eintraege ? `${anzahl(eintraege.ohne)} von ${anzahl(eintraege.gesamt)} Einträgen ohne Befund.` : `${anzahl(befunde.length)} Befunde.`} Prüft nach jeder Änderung neu.</span>
      <span class="rechts"><button class="knopf" disabled={!befunde.length} onclick={bericht}><i class="fa-solid fa-download"></i> Bericht herunterladen</button></span>
    </div>
  {/if}
</div>

<style>
  .va-ansicht {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  .va-menue {
    position: relative;
  }
  .va-liste {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    z-index: 20;
    margin: 0;
    min-width: 320px;
    max-height: 360px;
    overflow-y: auto;
    padding: var(--a1);
    box-shadow: var(--kante), var(--schatten-schwebend);
  }
  .va-liste button {
    display: flex;
    align-items: center;
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
  .va-liste button:hover {
    background: var(--akzent-weich);
  }
  .va-liste button > i {
    color: var(--akzent);
  }
  .va-luft {
    padding: var(--a3);
  }
</style>
