<script lang="ts">
  // Eine Wertkarte im Graph mit ihren Kindern rechts daneben: Schlüssel oder Stelle, Art, Wert oder Beschriftung,
  // Umfang; ein Plus, wenn Kinder jenseits der Tiefe liegen. Klick auf eine Karte mit Inhalt (Objekt, Liste) setzt den
  // Fokus dorthin, Klick auf einen einfachen Wert oder auf den Fokus selbst wählt ihn.
  import { KNOTEN_NAME, KnotenArt } from "../../../kern";
  import type { Wertkarte } from "../../../analyse/graph";
  import GraphKarte from "./GraphKarte.svelte";

  let { w, fokus = false, gewaehlt, onwahl, onfokus }: {
    w: Wertkarte;
    fokus?: boolean;
    gewaehlt: number;
    onwahl: (k: number) => void;
    onfokus: (k: number) => void;
  } = $props();

  const KLASSE: Partial<Record<number, string>> = { [KnotenArt.text]: "w-text", [KnotenArt.zahl]: "w-zahl", [KnotenArt.wahrheitswert]: "w-bool", [KnotenArt.nichts]: "w-null" };
  /** Behälter mit Inhalt: Klick setzt den Fokus dorthin */
  const fokusbar = $derived(!fokus && w.wert === null && (w.kinder.length > 0 || w.verborgen > 0));
  const titel = $derived(
    fokus ? "Fokus: Klick wählt ihn" : w.verborgen ? `Darunter liegen ${w.info}, die diese Tiefe nicht zeigt. Klick setzt den Fokus hierher und zeigt sie` : fokusbar ? "Klick setzt den Fokus hierher" : "Klick wählt den Wert",
  );
</script>

<div class="an-zweig">
  <button class="an-wk" class:an-fokus={fokus} class:an-gewaehlt={gewaehlt === w.k} aria-pressed={gewaehlt === w.k} title={titel} onclick={() => (fokusbar ? onfokus(w.k) : onwahl(w.k))}>
    <span class="an-wk-kopf"><span class="an-wk-schl">{w.beschriftung}</span><span class="an-wk-art">{KNOTEN_NAME[w.art]}</span>{#if w.verborgen}<i class="fa-solid fa-plus an-wk-mehr" aria-label="darunter liegt mehr"></i>{/if}</span>
    {#if w.wert !== null}<span class="an-wk-wert {KLASSE[w.art] ?? ''}">{w.wert}</span>{:else if w.titel}<span class="an-wk-wert w-text">{w.titel}</span>{/if}
    {#if w.info}<span class="an-wk-info">{w.info}</span>{/if}
  </button>
  {#if w.kinder.length || w.weitere}
    <div class="an-kinder">
      {#each w.kinder as c (c.k)}
        <GraphKarte w={c} {gewaehlt} {onwahl} {onfokus} />
      {/each}
      {#if w.weitere}<div class="an-zweig"><div class="an-wk an-wk-weitere" title="Der Graph zeigt höchstens {w.kinder.length} Einträge je Ebene; alle zeigen Baum und Tabelle">und {w.weitere.toLocaleString("de-DE")} weitere</div></div>{/if}
    </div>
  {/if}
</div>
