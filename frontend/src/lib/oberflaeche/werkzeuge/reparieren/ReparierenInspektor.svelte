<script lang="ts">
  // Inspektor zu Reparieren: gewählte Zeile (Rohtext, Länge, bis wohin lesbar, Felder), was die Reparatur tut, die
  // Datei und der Hinweis, dass alles im Browser rechnet.
  import "../werkzeuge.css";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import { reparierenZustand } from "./reparierenZustand.svelte";
  import { spalte } from "./stuecke";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(reparierenZustand(blatt));
  const reparatur = $derived(z.reparatur(blatt));
  const b = $derived(reparatur.befunde.find((x) => x.zeile === z.gewaehlt) ?? reparatur.befunde[0] ?? null);
  const kaputt = $derived(reparatur.befunde.filter((x) => x.eingriffe.length || x.ungeloest).length);
  const roh = $derived(b ? blatt.text.slice(b.von, b.bis) : "");
  const ersteStelle = $derived(b ? Math.min(...b.eingriffe.map((e) => e.von), b.ungeloest?.von ?? Infinity) : Infinity);
</script>

{#if b}
  <div class="karte">
    <div class="karte-titel">Gewählt: Zeile {anzahl(b.zeile)} <span class="rechts abzeichen {b.eingriffe.length || b.ungeloest ? 'fehler' : 'warn'}">{b.eingriffe.length || b.ungeloest ? "nicht lesbar" : "Hinweis"}</span></div>
    <div class="wertfeld mono rp-roh">{roh.length > 300 ? `${roh.slice(0, 299)}...` : roh}</div>
    <dl class="paare wz-abstand">
      <dt>Länge</dt><dd class="mono">{anzahl(roh.length)} Zeichen</dd>
      {#if Number.isFinite(ersteStelle)}<dt>Lesbar bis</dt><dd class="mono">{ersteStelle > b.von ? `Spalte ${anzahl(spalte(b, ersteStelle) - 1)}` : "nur bis zum Zeilenanfang"}</dd>{/if}
      {#if b.felder}<dt>Felder</dt><dd>{b.felder.vorhanden.join(", ")}{#if b.felder.fehlend.length} <span class="text-3">({b.felder.fehlend.join(", ")} {b.felder.fehlend.length === 1 ? "fehlt" : "fehlen"})</span>{/if}</dd>{/if}
    </dl>
  </div>
{/if}
<div class="karte">
  <div class="karte-titel">Was die Reparatur tut</div>
  <p class="wz-satz">Sie ergänzt nur Zeichen, die zum Lesen fehlen: Komma, Anführungszeichen, Klammern. Werte werden nicht geraten; wo einer fehlt, steht null und ein Hinweis.</p>
  <p class="wz-satz wz-abstand">Übernehmen ist ein Schritt im Verlauf und lässt sich zurücknehmen.</p>
</div>
<div class="karte">
  <div class="karte-titel">Datei</div>
  <dl class="paare">
    <dt>Name</dt><dd class="mono">{blatt.name}</dd>
    <dt>Ablage</dt><dd>{blatt.ordner || "oberste Ebene"}</dd>
    <dt>Zeilen</dt><dd class="mono">{anzahl(reparatur.zeilen)}{#if kaputt}, davon {anzahl(kaputt)} kaputt{/if}</dd>
  </dl>
</div>
<div class="karte">
  <div class="karte-titel">Im Browser</div>
  <p class="wz-satz">Die Reparatur rechnet ganz in diesem Browser; dafür gehen keine Daten an einen Server.</p>
</div>

<style>
  .rp-roh {
    font-size: var(--klein);
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
</style>
