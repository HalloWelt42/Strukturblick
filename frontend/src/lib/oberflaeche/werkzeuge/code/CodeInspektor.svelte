<script lang="ts">
  // Inspektor von "Code erzeugen": was erzeugt wurde (Sprache, Klassen, Quelle, Dateien), wie Schema-Typen im Code
  // ankommen (die erklärenswerten Felder), wie man die Daten einliest, und dass alles im Browser bleibt.
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { codeziel } from "../../../analyse/codegen/codeziele";
  import { codeZustand } from "./codeZustand.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(codeZustand(blatt));
  const e = $derived(z.ergebnis(blatt));
</script>

{#if e?.ok}
  <div class="karte">
    <div class="karte-titel">Erzeugt <span class="rechts abzeichen">{codeziel(z.ziel).name}</span></div>
    <dl class="paare">
      <dt>Klassen</dt><dd class="mono">{e.modell.klassen.map((k) => k.name).join(", ")}</dd>
      <dt>Quelle</dt><dd class="mono">{e.quelle}</dd>
      <dt>Schema</dt><dd>{e.schemafassung}</dd>
      <dt>Braucht</dt><dd>{e.ausgabe.voraussetzung}</dd>
      <dt>{e.ausgabe.dateien.length === 1 ? "Datei" : "Dateien"}</dt><dd class="mono">{e.ausgabe.dateien.map((d) => d.name).join(", ")}</dd>
    </dl>
    {#if e.modell.hinweise.length}<p class="an-tafel-fuss cg-oben">{e.modell.hinweise.join("; ")}</p>{/if}
  </div>
  {#if e.ausgabe.abbildung.length}
    <div class="karte">
      <div class="karte-titel">Vom Schema zum Typ</div>
      <ul class="cg-abbildung">
        {#each e.ausgabe.abbildung as a (a.feld)}
          <li><span class="mono cg-feld">{a.feld}</span><span class="mono">{a.typ}</span><span class="text-3">{a.erklaerung}</span></li>
        {/each}
      </ul>
    </div>
  {/if}
  <div class="karte">
    <div class="karte-titel">Einlesen</div>
    <pre class="wertfeld cg-code">{e.ausgabe.einlesen}</pre>
  </div>
{/if}
<div class="karte">
  <div class="karte-titel">Im Browser</div>
  <p class="an-tafel-fuss">Der Code entsteht ganz in diesem Browser; dafür gehen keine Daten an einen Server.</p>
</div>

<style>
  .cg-oben {
    margin-top: var(--a2);
  }
  .cg-abbildung {
    display: grid;
    gap: var(--a2);
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: var(--klein);
  }
  .cg-abbildung li {
    display: grid;
  }
  .cg-feld {
    font-weight: 600;
    color: var(--typ-schluessel);
  }
  .cg-code {
    margin: 0;
    font-size: var(--klein);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
</style>
