<script lang="ts">
  // Inspektor zu Rezepten: beim Ansehen, worauf es sich anwenden lässt (dieses und die anderen offenen Dokumente),
  // zuletzt angewendet und wo es liegt; beim Anwenden die Datei und die Zahlen je Schritt.
  import "./rezepte.css";
  import { schrittTitel } from "../../../analyse/rezepte/rezept";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { arbeitsplatz } from "../../../zustand/arbeitsplatz.svelte";
  import { rezepte } from "../../../zustand/rezepte.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import { datum } from "./datum";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const r = $derived(rezepte.aktuell);

  function anwendenAuf(b: Arbeitsblatt): void {
    if (!r) return;
    if (b !== blatt) arbeitsplatz.waehlen(b);
    rezepte.oeffnen(b, r.kennung, "anwenden");
  }
</script>

{#if rezepte.modus === "neu"}
  <div class="karte">
    <div class="karte-titel">Aus dem Verlauf</div>
    <p class="vw-hilfe">Ein Rezept merkt sich, was getan wurde (Spalte und Regel), nicht wo im Text. So passt es auf die nächste Datei gleicher Bauart, auch mit anderen Zeilen.</p>
  </div>
{:else if r && rezepte.modus === "anwenden"}
  <div class="karte">
    <div class="karte-titel">Datei</div>
    <dl class="paare">
      <dt>Name</dt><dd class="mono">{blatt.name}</dd>
      <dt>Ordner</dt><dd>{blatt.ordner || "oberste Ebene"} in {arbeitsplatz.ablage.ort}</dd>
      <dt>Größe</dt><dd class="mono">{anzahl(Math.ceil(blatt.text.length / 1024))} KB</dd>
      <dt>Format</dt><dd>{blatt.analyse?.format.name ?? "wird gelesen"}</dd>
    </dl>
  </div>
  <div class="karte">
    <div class="karte-titel">Rezept <span class="rechts abzeichen">{r.schritte.length} {r.schritte.length === 1 ? "Schritt" : "Schritte"}</span></div>
    <dl class="paare">
      {#each r.schritte as s, i (i)}
        <dt class="mono">{i + 1}</dt><dd>{#if !s.an}<span class="abzeichen zweit">aus</span> {/if}{schrittTitel(s)}</dd>
      {/each}
    </dl>
  </div>
  <div class="karte">
    <div class="karte-titel">Danach</div>
    <p class="vw-hilfe">Als neues Dokument: öffnet als Reiter im selben Ordner, {blatt.name} bleibt, wie es ist.</p>
    <p class="vw-hilfe">Ins Dokument: ein Vorgang im Verlauf, rückgängig mit <span class="taste">⌘</span><span class="taste">Z</span>.</p>
  </div>
{:else if r}
  <div class="karte">
    <div class="karte-titel">Anwenden auf</div>
    <div class="vw-wahl-liste">
      {#each [blatt, ...arbeitsplatz.blaetter.filter((b) => b !== blatt)] as b (b.kennung)}
        <button class="vw-wahl" onclick={() => anwendenAuf(b)}>
          <i class="fa-solid fa-table text-3"></i>
          <span><span class="vw-wahl-name">{b.name}</span><span class="vw-wahl-info">{b === blatt ? "dieses Dokument" : "geöffnet"}{b.ordner ? `, ${b.ordner}` : ""}</span></span>
          <i class="fa-solid fa-chevron-right text-3"></i>
        </button>
      {/each}
    </div>
    <p class="vw-hilfe">Andere Dateien erst öffnen (Leiste, Datei öffnen), dann erscheinen sie hier.</p>
  </div>
  <div class="karte">
    <div class="karte-titel">Zuletzt angewendet</div>
    {#if r.zuletzt.length}
      <dl class="paare">
        {#each r.zuletzt as z (z.zeit)}
          <dt class="mono">{datum(z.zeit)}</dt><dd>{z.dokument}, {z.ergebnis}</dd>
        {/each}
      </dl>
    {:else}
      <p class="vw-hilfe">Noch nie angewendet.</p>
    {/if}
  </div>
  <div class="karte">
    <div class="karte-titel">Ablage</div>
    <dl class="paare"><dt>Ort</dt><dd>{arbeitsplatz.ablage.ort}</dd></dl>
    <p class="vw-hilfe">{arbeitsplatz.ablage.hinweis} Einzelne Rezepte lassen sich als Datei herunterladen.</p>
  </div>
{:else}
  <div class="karte">
    <p class="vw-hilfe">Noch kein Rezept. Im Werkzeug Bereinigen aufräumen, dann "Neues Rezept aus dem Verlauf".</p>
  </div>
{/if}
