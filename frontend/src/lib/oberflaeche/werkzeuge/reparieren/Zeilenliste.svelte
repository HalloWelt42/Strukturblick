<script lang="ts">
  // Tafel "Befund je Zeile": je Zeile mit Befund die Fehler mit Spalte, Meldung und Vorschlag, Hinweise auf das, was
  // ein Mensch ansehen sollte, und die Wahl "Vorschlag übernehmen" oder "Zeile so lassen". Bei kleinen Dateien in
  // JSON Lines stehen die heilen Zeilen still dazwischen.
  import { zeilenSteckbrief, type Reparatur, type Zeilenbefund } from "../../../analyse/reparatur/reparatur";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import type { ReparierenZustand } from "./reparierenZustand.svelte";
  import { spalte } from "./stuecke";

  let { blatt, z, reparatur, gewaehlt }: { blatt: Arbeitsblatt; z: ReparierenZustand; reparatur: Reparatur; gewaehlt: Zeilenbefund | null } = $props();

  /** So viele Zeilen mit Befund stehen in der Liste */
  const GEZEIGT = 200;
  /** Bis zu so vielen Zeilen zeigt JSON Lines auch die heilen Zeilen */
  const MIT_HEILEN = 100;

  type Eintrag = { art: "heil"; zeile: number; text: string } | { art: "befund"; b: Zeilenbefund };

  const kaputt = $derived(reparatur.befunde.filter((b) => b.eingriffe.length || b.ungeloest).length);
  const eintraege = $derived.by((): Eintrag[] => {
    const befunde: Eintrag[] = reparatur.befunde.slice(0, GEZEIGT).map((b) => ({ art: "befund", b }));
    if (reparatur.als !== "ndjson" || reparatur.zeilen > MIT_HEILEN) return befunde;
    const mitBefund = new Set(reparatur.befunde.map((b) => b.zeile));
    const heile: Eintrag[] = blatt.text.split("\n").flatMap((t, i) => (t.trim() && !mitBefund.has(i + 1) ? [{ art: "heil" as const, zeile: i + 1, text: t }] : []));
    return [...befunde, ...heile].sort((a, b) => (a.art === "heil" ? a.zeile : a.b.zeile) - (b.art === "heil" ? b.zeile : b.b.zeile));
  });

  function titel(b: Zeilenbefund): string {
    const n = b.eingriffe.length + (b.ungeloest ? 1 : 0);
    if (!n) return "Lesbar, mit Hinweis";
    return `Nicht lesbar: ${n} Fehler`;
  }

  function waehlenTaste(e: KeyboardEvent, zeile: number): void {
    if (e.target !== e.currentTarget || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    z.gewaehlt = zeile;
  }
</script>

<section class="wz-tafel">
  <div class="wz-tafel-kopf">
    <i class="fa-solid fa-list-check"></i> Befund je Zeile
    <span class="rechts">{#if kaputt}<span class="abzeichen fehler">{anzahl(kaputt)} {kaputt === 1 ? "Zeile" : "Zeilen"} kaputt</span>{:else}<span class="abzeichen gut">alles lesbar</span>{/if}</span>
  </div>
  <div class="wz-tafel-feld">
    {#each eintraege as e (e.art === "heil" ? `h${e.zeile}` : `b${e.b.zeile}`)}
      {#if e.art === "heil"}
        <div class="wz-befund wz-still">
          <span class="wz-zeile-nr">Zeile<strong>{anzahl(e.zeile)}</strong></span>
          <div class="wz-befund-kopf"><i class="fa-solid fa-circle-check wz-symbol gut"></i><span class="wz-meldung">In Ordnung</span></div>
          <div class="wz-befund-fuss"><span>{zeilenSteckbrief(e.text)}</span></div>
        </div>
      {:else}
        {@const b = e.b}
        {@const bleibt = z.bleibt(blatt, b.zeile)}
        <div class="wz-befund rp-befund" class:gewaehlt={b === gewaehlt} role="button" tabindex="0" title="Zeigt die Zeile in der Vorschau und im Inspektor" onclick={() => (z.gewaehlt = b.zeile)} onkeydown={(ev) => waehlenTaste(ev, b.zeile)}>
          <span class="wz-zeile-nr">Zeile<strong>{anzahl(b.zeile)}</strong></span>
          <div class="wz-befund-kopf"><i class="fa-solid {b.eingriffe.length || b.ungeloest ? 'fa-circle-xmark' : 'fa-triangle-exclamation'} wz-symbol {b.eingriffe.length || b.ungeloest ? 'fehler' : 'warn'}"></i><span class="wz-meldung">{titel(b)}</span></div>
          <ul class="wz-befund-liste">
            {#each b.eingriffe as eg, i (i)}
              <li><i class="fa-solid fa-circle-xmark wz-symbol fehler"></i><span><span class="mono">Spalte {anzahl(spalte(b, eg.von))}</span>: {eg.meldung}. <b>Vorschlag:</b> {eg.vorschlag}.</span></li>
            {/each}
            {#if b.ungeloest}
              <li><i class="fa-solid fa-circle-xmark wz-symbol fehler"></i><span><span class="mono">Spalte {anzahl(spalte(b, b.ungeloest.von))}</span>: {b.ungeloest.meldung}. Hier greift keine feste Regel: bitte von Hand.</span></li>
            {/if}
            {#each b.hinweise as h, i (i)}
              <li><i class="fa-solid fa-triangle-exclamation wz-symbol warn"></i><span>{h}.</span></li>
            {/each}
          </ul>
          {#if b.eingriffe.length}
            <div class="wz-befund-fuss">
              <nav class="segment" aria-label="Zeile {b.zeile}">
                <button class:aktiv={!bleibt} onclick={(ev) => { ev.stopPropagation(); z.setzen(blatt, b.zeile, false); }}>Vorschlag übernehmen</button>
                <button class:aktiv={bleibt} onclick={(ev) => { ev.stopPropagation(); z.setzen(blatt, b.zeile, true); }}>Zeile so lassen</button>
              </nav>
            </div>
          {/if}
        </div>
      {/if}
    {:else}
      <p class="wz-satz rp-luft">Keine Zeile braucht eine Reparatur: Der Text lässt sich als {reparatur.als === "ndjson" ? "JSON Lines" : "JSON"} lesen.</p>
    {/each}
    {#if reparatur.befunde.length > GEZEIGT}<p class="wz-satz rp-luft">und {anzahl(reparatur.befunde.length - GEZEIGT)} weitere Zeilen mit Befund; Übernehmen gilt für alle.</p>{/if}
  </div>
</section>

<style>
  .rp-befund {
    cursor: pointer;
  }
  .rp-luft {
    padding: var(--a3);
  }
</style>
