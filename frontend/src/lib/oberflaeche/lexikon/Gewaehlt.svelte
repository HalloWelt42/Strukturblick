<script lang="ts">
  // Lebendiger Teil im Lexikon (Markdown: <div data-live="gewaehlt"></div>): der gerade gewählte Wert des offenen
  // Dokuments mit seinem Pfad in allen Schreibweisen. So zeigt die Erklärung am eigenen Beispiel, wie die Pfade gebaut
  // sind. Ohne Dokument oder Wahl ein Satz, wie man etwas wählt.
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";
  import { KEIN, knotenZu, teileVon, SCHREIBWEISEN, SCHREIBWEISE_NAME, schreiben } from "../../kern";
  import { vorschau } from "../../analyse/tabelle";

  const blatt = $derived(arbeitsplatz.aktivesBlatt);
  const a = $derived(blatt?.analyse ?? null);
  const k = $derived(a?.index && blatt?.gewaehlt !== null && blatt?.gewaehlt !== undefined ? knotenZu(a.index, blatt.analyseText, blatt.gewaehlt) : KEIN);
  const teile = $derived(a?.index && k !== KEIN && blatt ? teileVon(a.index, blatt.analyseText, k) : null);
  const wert = $derived(a?.index && k !== KEIN && blatt ? vorschau(a.index, blatt.analyseText, k).text : "");
</script>

<div class="lx-live">
  {#if teile && blatt}
    <div class="lx-live-kopf">Dein gewählter Wert in <span class="mono">{blatt.name}</span>: <b class="mono">{wert.length > 60 ? `${wert.slice(0, 60)} ...` : wert}</b></div>
    <dl class="lx-pfade">
      {#each SCHREIBWEISEN as w (w)}<dt>{SCHREIBWEISE_NAME[w]}</dt><dd class="mono">{schreiben(teile, w)}</dd>{/each}
    </dl>
  {:else}
    <div class="lx-live-kopf">Wähle im Baum oder in der Tabelle einen Wert; hier steht dann sein Pfad in jeder Schreibweise.</div>
  {/if}
</div>
