<script lang="ts">
  // Inspektor zu Konvertieren: Kennzahlen des Ergebnisses, bei Tabellen die Herkunft der Spalten, wohin das Ergebnis
  // gehen kann, und der Hinweis, dass alles im Browser rechnet.
  import "../werkzeuge.css";
  import { ziel, zielname } from "../../../analyse/konvertieren/konvertieren";
  import type { Spalte } from "../../../analyse/konvertieren/tabellieren";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import { konvertierenZustand } from "./konvertierenZustand.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(konvertierenZustand(blatt));
  const zk = $derived(z.ziel(blatt));
  const u = $derived(z.umwandlung(blatt));

  const groesse = $derived.by(() => {
    if (!u) return "";
    const bytes = new TextEncoder().encode(u.text).length;
    return bytes < 1024 ? `${anzahl(bytes)} Byte` : bytes < 1048576 ? `etwa ${anzahl(Math.round(bytes / 1024))} KB` : `etwa ${(bytes / 1048576).toLocaleString("de-DE", { maximumFractionDigits: 1 })} MB`;
  });
  const zeilenText = $derived.by(() => {
    if (!u) return "";
    if (u.tabelle) return `${anzahl(u.tabelle.zeilen)}${z.optionen.kopfzeile ? " + Kopfzeile" : ""}`;
    const n = u.text.split("\n").length - (u.text.endsWith("\n") ? 1 : 0);
    return anzahl(n);
  });

  /** Spalten in Gruppen gleicher Herkunft, in der Reihenfolge der Tabelle */
  const gruppen = $derived.by(() => {
    const aus: { namen: string[]; herkunft: Spalte["herkunft"]; oben: string }[] = [];
    for (const s of u?.tabelle?.spalten ?? []) {
      const oben = s.herkunft === "eintrag" || s.herkunft === "json" ? "" : s.name.split(".")[0];
      const letzte = aus[aus.length - 1];
      if (letzte && letzte.herkunft === s.herkunft && letzte.oben === oben) letzte.namen.push(s.name);
      else aus.push({ namen: [s.name], herkunft: s.herkunft, oben });
    }
    return aus;
  });
  const herkunft = (g: (typeof gruppen)[number]): string =>
    g.herkunft === "eintrag" ? "aus dem Eintrag" : g.herkunft === "objekt" ? "aufgeklappt" : g.herkunft === "liste" ? (z.optionen.listen === "spalten" ? "je Eintrag eine Spalte" : "eine Zeile je Eintrag") : "als JSON-Text";
  const namen = (n: readonly string[]): string => (n.length > 4 ? `${n.slice(0, 3).join(", ")} und ${n.length - 3} weitere` : n.join(", "));
</script>

{#if u && zk}
  <div class="karte">
    <div class="karte-titel">Ergebnis <span class="rechts abzeichen">{ziel(zk).name}</span></div>
    <dl class="paare">
      {#if u.datensaetze !== null}<dt>Datensätze</dt><dd class="mono">{anzahl(u.datensaetze)}</dd>{:else}<dt>Zeilen</dt><dd class="mono">{zeilenText}</dd>{/if}
      {#if u.tabelle}<dt>Spalten</dt><dd class="mono">{anzahl(u.tabelle.spalten.length)}</dd>{/if}
      <dt>Größe</dt><dd class="mono">{groesse}</dd>
      <dt>Kodierung</dt><dd>UTF-8</dd>
    </dl>
  </div>
  {#if gruppen.length}
    <div class="karte">
      <div class="karte-titel">Spalten</div>
      <div class="kv-spalten">
        {#each gruppen as g, i (i)}
          <span class="mono">{namen(g.namen)}</span><span class="text-3">{herkunft(g)}</span>
        {/each}
      </div>
    </div>
  {/if}
  <div class="karte">
    <div class="karte-titel">Wohin</div>
    <p class="wz-satz"><b>Als neues Dokument</b> öffnet {zielname(blatt.name, zk)} in einem eigenen Reiter und legt es in der Ablage ab, im selben Ordner wie {blatt.name}.</p>
    <p class="wz-satz wz-abstand"><b>Herunterladen</b> speichert die Datei auf diesem Gerät.</p>
  </div>
{/if}
<div class="karte">
  <div class="karte-titel">Im Browser</div>
  <p class="wz-satz">Das Umwandeln rechnet ganz in diesem Browser; dafür gehen keine Daten an einen Server.</p>
</div>

<style>
  .kv-spalten {
    display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    gap: var(--a1) var(--a3);
    font-size: var(--klein);
  }
  .kv-spalten > .mono {
    overflow-wrap: break-word;
  }
</style>
