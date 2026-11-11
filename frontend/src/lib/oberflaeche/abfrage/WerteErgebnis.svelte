<script lang="ts">
  // Ergebnis als Liste eingerückter Werte (jq, JSONPath, Suche) nach dem Entwurf: Nummer, Wert, am Ende die Zahl. Ein
  // Wert mit bekanntem Ort springt per Klick dorthin.
  import { ABFRAGE_GRENZEN, type Werteergebnis } from "../../zustand/abfrage.svelte";
  import { farbstuecke, ortKurz } from "./farben";

  let { ergebnis, onspringen }: { ergebnis: Werteergebnis; onspringen: (zeiger: string) => void } = $props();
</script>

<div class="af-json" aria-live="polite">
  {#each ergebnis.stuecke as s, i (i)}
    <div class="af-stueck">
      <span class="af-stueck-nr">{i + 1}</span>
      <div class="stueck-inhalt">
        {#if s.ort !== null}
          <button class="ort mono" title="Im Dokument zeigen" onclick={() => onspringen(s.ort!)}><i class="fa-solid fa-location-crosshairs"></i> {ortKurz(s.ort)}</button>
        {/if}
        <pre>{#each farbstuecke(s.text) as f, k (k)}{#if f.klasse}<span class={f.klasse}>{f.text}</span>{:else}{f.text}{/if}{/each}</pre>
        {#if s.gekuerzt}<p class="gekuerzt text-3">Gekürzt auf {ABFRAGE_GRENZEN.zeichenJeStueck.toLocaleString("de-DE")} Zeichen; ganz mit "Als neues Dokument".</p>{/if}
      </div>
    </div>
  {:else}
    <div class="af-ende">Kein Ergebnis.</div>
  {/each}
  {#if ergebnis.anzahl > 0}
    <div class="af-ende">
      {#if ergebnis.anzahl > ergebnis.stuecke.length}
        Die ersten {ABFRAGE_GRENZEN.stuecke} von {ergebnis.anzahl} Ergebnissen; alle mit "Als neues Dokument".
      {:else}
        Ende, {ergebnis.anzahl === 1 ? "1 Ergebnis" : `${ergebnis.anzahl} Ergebnisse`}
      {/if}
    </div>
  {/if}
</div>

<style>
  .stueck-inhalt {
    min-width: 0;
  }
  .ort {
    display: inline-flex;
    align-items: center;
    gap: var(--a1);
    margin-bottom: 2px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--akzent);
    font-size: var(--marke);
    cursor: pointer;
  }
  .gekuerzt {
    margin: var(--a1) 0 0;
    font-family: var(--schrift);
    font-size: var(--marke);
  }
  .ort:hover {
    text-decoration: underline;
  }
</style>
