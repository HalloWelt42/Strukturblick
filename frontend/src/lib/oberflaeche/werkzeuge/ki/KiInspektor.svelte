<script lang="ts">
  // Inspektor des Werkzeugs Mit KI (entwuerfe/ki.html): welches Modell auf welchem Weg wie lange gerechnet hat, was
  // genau zur Leitstelle ging, und die zuletzt gestellten Fragen zum Wiederholen.
  import "./ki.css";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { ki } from "../../../zustand/ki.svelte";
  import { aufgabe, SPRACH_NAME } from "../../../analyse/ki/aufgaben";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import { kiZustand } from "./kiZustand.svelte";
  import { kiVerlauf, type Gefragt } from "./kiVerlauf.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(kiZustand(blatt));
  const v = $derived(z.vorschlag);
  const g = $derived(z.gesendet);
  const modell = $derived(ki.stand?.modelle.find((m) => m.id === ki.stand?.modell || m.name === ki.stand?.modell) ?? null);
  const probeMs = $derived(z.probe?.art === "abfrage" && z.probe.ausgang?.ok ? Math.round(z.probe.ausgang.dauer) : null);
  const sekunden = (ms: number): string => `${(ms / 1000).toLocaleString("de-DE", { maximumFractionDigits: 1 })} s`;

  function wann(iso: string): string {
    const d = new Date(iso);
    const heute = new Date();
    const uhr = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
    if (d.toDateString() === heute.toDateString()) return `heute ${uhr}`;
    heute.setDate(heute.getDate() - 1);
    return d.toDateString() === heute.toDateString() ? `gestern ${uhr}` : d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" });
  }

  function wiederholen(x: Gefragt): void {
    z.aufgabeWaehlen(x.aufgabe);
    if (x.sprache) z.sprachWahl = x.sprache;
    if (x.frage !== aufgabe(x.aufgabe).titel) z.frage = x.frage;
  }
</script>

<div class="karte">
  <div class="karte-titel">Modell <span class="rechts abzeichen" class:gut={ki.stand?.bereit} class:warn={!ki.stand?.bereit}>{ki.stand?.bereit ? "bereit" : "nicht bereit"}</span></div>
  <dl class="paare">
    <dt>Modell</dt><dd>{v ? ki.modellname(v.modell) : (ki.stand?.modellname ?? "-")}</dd>
    <dt>Weg</dt><dd>Leitstelle</dd>
    {#if v?.rechner ?? modell?.rechner}<dt>Rechner</dt><dd>{v?.rechner ?? modell?.rechner}</dd>{/if}
    {#if v}<dt>Dauer</dt><dd class="mono">{sekunden(v.dauer_ms)}</dd>{/if}
    {#if probeMs !== null}<dt>Probelauf</dt><dd class="mono">{probeMs} ms</dd>{/if}
    {#if v?.verbrauch}<dt>Token</dt><dd class="mono">{anzahl(v.verbrauch.eingabe)} hin, {anzahl(v.verbrauch.ausgabe)} zurück</dd>{/if}
  </dl>
  {#if ki.stand?.meldung}<p class="ki-hinweis warn"><i class="fa-solid fa-triangle-exclamation"></i><span>{ki.stand.meldung}</span></p>{/if}
</div>

<div class="karte">
  <div class="karte-titel">Gesendet</div>
  {#if g}
    <dl class="paare">
      <dt>Frage</dt><dd>{g.frage ? "ja" : "keine"}</dd>
      <dt>{z.fuer?.sprache === "sql" ? "Spalten" : "Felder"}</dt><dd class="mono">{anzahl(g.felder)} mit Typen</dd>
      <dt>Beispiele</dt><dd class="mono">{anzahl(g.zeilen)} von {anzahl(g.eintraege)}</dd>
      <dt>Zeichen</dt><dd class="mono">{anzahl(g.zeichen)}</dd>
      <dt>Ganzes Dokument</dt><dd>nein</dd>
    </dl>
  {:else}
    <p class="ki-hinweis"><i class="fa-solid fa-circle-info"></i><span>Noch nichts. Gesendet werden nur Felder, Typen und bis zu 20 Beispiele.</span></p>
  {/if}
  {#if modell?.extern}
    <p class="ki-hinweis warn"><i class="fa-solid fa-globe"></i><span>Dieses Modell rechnet außer Haus; der Auszug verlässt das Heimnetz.</span></p>
  {:else}
    <p class="ki-hinweis"><i class="fa-solid fa-lock"></i><span>Die Daten verlassen das Heimnetz nicht.</span></p>
  {/if}
</div>

{#if kiVerlauf.liste.length}
  <div class="karte">
    <div class="karte-titel">Zuletzt gefragt</div>
    <div class="ki-liste">
      {#each kiVerlauf.liste as x (`${x.wann}|${x.frage}`)}
        <button title="Aufgabe und Frage wieder einstellen" onclick={() => wiederholen(x)}>
          {x.frage}<span>{x.dokument}, {wann(x.wann)}{x.sprache ? `, ${SPRACH_NAME[x.sprache]}` : x.frage !== aufgabe(x.aufgabe).titel ? `, ${aufgabe(x.aufgabe).titel}` : ""}</span>
        </button>
      {/each}
    </div>
  </div>
{/if}
