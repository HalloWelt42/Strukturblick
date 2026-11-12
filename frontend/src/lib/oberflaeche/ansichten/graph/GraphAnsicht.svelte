<script lang="ts">
  // Ansicht Graph (entwuerfe/graph.html): ein Ausschnitt der Daten als Wertkarten ab einem Fokus, wenige Ebenen tief.
  // Links die Karte eine Ebene höher (Klick: Fokus dorthin), dann der leuchtende Fokus mit seinen Kindern. Der Pfad
  // oben setzt den Fokus auf einen Vorfahren, die Tiefe wählt 1 bis 3 Ebenen. Klick auf eine Karte mit Inhalt setzt den
  // Fokus dorthin (wie im Entwurf: Fokus verschieben per Klick), Klick auf einen Wert wählt ihn (Inspektor, andere
  // Ansichten).
  import "../ansichten.css";
  import "./graph.css";
  import { tick } from "svelte";
  import { KEIN, KNOTEN_NAME, knotenZu, teileVon, zeigerAus, zeigerVon } from "../../../kern";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { anzahl } from "../tabelle/zahlen";
  import GraphKarte from "./GraphKarte.svelte";
  import { graphZustand, TIEFEN } from "./graphZustand.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(graphZustand(blatt));
  const a = $derived(z.ausschnitt(blatt));
  const index = $derived(blatt.analyse?.index ?? null);
  const teile = $derived(index && a ? teileVon(index, blatt.analyseText, a.fokus.k) : []);
  const gewaehlt = $derived(index && blatt.gewaehlt !== null ? knotenZu(index, blatt.analyseText, blatt.gewaehlt) : KEIN);

  const zeiger = (k: number): string => (index ? zeigerVon(index, blatt.analyseText, k) : "");
  const waehlen = (k: number): void => blatt.waehlen(zeiger(k));
  // Neuer Fokus oder neue Tiefe: den Fokus in die Mitte rollen (lange Listen machen die Leinwand hoch)
  let leinwand: HTMLElement | undefined = $state();
  $effect(() => {
    void a?.fokus.k;
    void z.tiefe;
    void tick().then(() => {
      // Erst ganz nach links (dort steht der Rückweg), dann den Fokus senkrecht in die Mitte
      const feld = leinwand?.parentElement;
      if (feld) feld.scrollLeft = 0;
      leinwand?.querySelector(".an-fokus")?.scrollIntoView({ block: "center", inline: "nearest" });
    });
  });

  function fokussieren(k: number): void {
    z.fokus = zeiger(k);
    waehlen(k);
  }
</script>

<div class="an-ansicht">
  <div class="werkzeugzeile an-umbruch">
    <nav class="pfad" aria-label="Fokus">
      <button class="teil" class:letzter={!teile.length} title="Fokus auf die Wurzel" onclick={() => (z.fokus = "")}>$</button>
      {#each teile as t, i (i)}
        <span class="trenner"><i class="fa-solid fa-chevron-right"></i></span>
        <button class="teil" class:letzter={i === teile.length - 1} title="Fokus hierher" onclick={() => (z.fokus = zeigerAus(teile.slice(0, i + 1)))}>{typeof t === "number" ? `[${t}]` : t}</button>
      {/each}
    </nav>
    <div class="rechts">
      <span class="an-zeilen-name">Tiefe</span>
      <nav class="segment" aria-label="Ebenen ab dem Fokus" title="Ebenen ab dem Fokus">
        {#each TIEFEN as t (t)}<button class:aktiv={z.tiefe === t} onclick={() => (z.tiefe = t)}>{t}</button>{/each}
      </nav>
    </div>
  </div>
  {#if !blatt.analyse}
    <p class="an-tafel-fuss an-leer">Das Dokument wird gelesen ...</p>
  {:else if !a}
    <p class="an-tafel-fuss an-leer">Das Dokument lässt sich so nicht lesen; der Graph braucht ein lesbares Dokument.</p>
  {:else}
    <div class="an-hinweis">
      <i class="fa-solid fa-crosshairs"></i>
      <span>Ausschnitt: {anzahl(a.sichtbar)} von {anzahl(a.gesamt)} Knoten. Klick auf Objekt oder Liste setzt den Fokus dorthin, auf einen Wert wählt ihn. <i class="fa-solid fa-plus an-wk-mehr"></i> heißt: darunter liegt mehr, als die Tiefe zeigt.</span>
    </div>
    <div class="inhalt">
      <div class="an-leinwand" bind:this={leinwand}>
        {#if a.eltern}
          {@const e = a.eltern}
          <div class="an-zweig">
            <button class="an-wk an-kontext" title="Fokus eine Ebene höher" onclick={() => fokussieren(e.k)}>
              <span class="an-wk-kopf"><span class="an-wk-schl">{e.beschriftung}</span><span class="an-wk-art">{KNOTEN_NAME[e.art]}</span></span>
              <span class="an-wk-info"><i class="fa-solid fa-chevron-left"></i>{e.info}</span>
            </button>
            <div class="an-kinder">
              <GraphKarte w={a.fokus} fokus {gewaehlt} onwahl={waehlen} onfokus={fokussieren} />
            </div>
          </div>
        {:else}
          <GraphKarte w={a.fokus} fokus {gewaehlt} onwahl={waehlen} onfokus={fokussieren} />
        {/if}
      </div>
    </div>
  {/if}
</div>
