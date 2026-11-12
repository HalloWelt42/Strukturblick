<script lang="ts">
  // Werkzeug "Testdaten" (entwuerfe/testdaten.html): aus einer Vorlage (der Liste dieses Dokuments oder einem
  // abgelegten Auftrag) eine Spezifikation, je Feld ein Erzeuger; darunter Erzeugen in Blöcken und die Vorschau.
  // Alles rechnet im Browser; gleicher Startwert, gleiche Daten.
  import { untrack } from "svelte";
  import "../werkzeuge.css";
  import "./testdaten.css";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { arbeitsplatz } from "../../../zustand/arbeitsplatz.svelte";
  import { meldungen } from "../../../zustand/meldungen.svelte";
  import { alsText } from "../../../analyse/testdaten/auftrag";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import { testdatenZustand } from "./testdatenZustand.svelte";
  import Spezifikationstafel from "./Spezifikationstafel.svelte";
  import Erzeugenkarte from "./Erzeugenkarte.svelte";
  import Vorschaukarte from "./Vorschaukarte.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(testdatenZustand(blatt));
  const vorlage = $derived(z.vorlage(blatt));
  const spez = $derived(z.spezifikation(blatt));
  // Zielformat und Trennzeichen beim ersten Lesen wie die Vorlage
  $effect(() => {
    const v = vorlage;
    untrack(() => z.vorgabenUebernehmen(blatt, v));
  });

  /** Auftrag als eigenes Dokument neben diesem ablegen; es öffnet gleich im Werkzeug Testdaten */
  async function speichern(): Promise<void> {
    const a = z.auftrag(blatt);
    if (!a) return;
    const name = `${blatt.name.replace(/\.testdaten\.json$/, "").replace(/\.[^.]+$/, "")}.testdaten.json`;
    await arbeitsplatz.neu(name, alsText(a), blatt.ordner, { art: "werkzeug", kennung: "testdaten" });
    meldungen.zeigen({ text: `Spezifikation als ${name} abgelegt; geöffnet erzeugt sie dieselben Daten`, art: "erfolg" });
  }
</script>

<div class="td-ansicht">
  <div class="wz-optionen">
    <div class="wz-option td-vorlage">
      <span class="abzeichen">{blatt.analyse?.format.name ?? ""}</span>
      {#if vorlage?.art === "daten"}
        <span>Vorlage <span class="mono">{blatt.name}</span>, {anzahl(vorlage.felder)} {vorlage.felder === 1 ? "Feld" : "Felder"} aus {anzahl(vorlage.ableitung.eintraege)} {vorlage.ableitung.eintraege === 1 ? "Eintrag" : "Einträgen"} abgeleitet</span>
      {:else if vorlage?.art === "auftrag"}
        <span>Abgelegte Spezifikation <span class="mono">{blatt.name}</span></span>
      {/if}
      {#if z.eigen}<span class="abzeichen warn" title="Die Spezifikation weicht von der Vorlage ab">geändert</span>{/if}
    </div>
    <div class="rechts">
      {#if z.eigen}<button class="knopf still" title="Änderungen verwerfen, Spezifikation wieder aus der Vorlage" onclick={() => z.zuruecksetzen()}><i class="fa-solid fa-rotate-left"></i> Zurücksetzen</button>{/if}
      <button class="knopf" disabled={!spez} title="Spezifikation, Anzahl, Startwert und Zielformat als Dokument ablegen" onclick={() => void speichern()}><i class="fa-solid fa-floppy-disk"></i> Spezifikation speichern</button>
    </div>
  </div>
  <div class="inhalt td-inhalt">
    {#if !blatt.analyse}
      <p class="wz-satz">Das Dokument wird gelesen ...</p>
    {:else if !spez || !blatt.analyse.index}
      <div class="wz-band"><i class="fa-solid fa-triangle-exclamation"></i><span>Das Dokument lässt sich so nicht lesen; Testdaten brauchen eine lesbare Vorlage.</span></div>
    {:else}
      <section class="karte">
        <div class="td-karte-kopf">
          <h2>Spezifikation</h2>
          <span class="text-3 klein">Je Feld ein Erzeuger, Einstellungen aus der Vorlage übernommen; Klick wählt, der Inspektor ändert</span>
          <span class="rechts"><button class="knopf" onclick={() => z.feldHinzufuegen(blatt)}><i class="fa-solid fa-plus"></i> Feld hinzufügen</button></span>
        </div>
        <Spezifikationstafel {blatt} {z} {spez} />
        {#if vorlage?.art === "daten" && vorlage.ableitung.hinweise.length}
          <p class="td-hinweis"><i class="fa-solid fa-circle-info"></i><span>{vorlage.ableitung.hinweise.join(" ")} Die Testdaten bleiben sauber in einer Schreibweise.</span></p>
        {/if}
      </section>
      <Erzeugenkarte {blatt} {z} />
      <Vorschaukarte {blatt} {z} />
    {/if}
  </div>
</div>
