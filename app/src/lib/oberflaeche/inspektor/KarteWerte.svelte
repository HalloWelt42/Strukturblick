<script lang="ts">
  // Karte "Alle Werte dieses Pfads": Muster, Anzahl, Fehlende, Typen, Spanne bei Zahlen und die häufigsten Werte.
  // Gerechnet wird in analyse/pfadwerte.ts.
  import { KNOTEN_NAME, KnotenArt, type Strukturindex } from "../../kern";
  import { pfadwerte, type Haeufigkeit } from "../../analyse/pfadwerte";

  let { index, text, k }: { index: Strukturindex; text: string; k: number } = $props();

  const KURZ = 40;

  const w = $derived(pfadwerte(index, text, k));
  const typen = $derived(
    w.typen.length === 1 ? `immer ${KNOTEN_NAME[w.typen[0].art]}` : w.typen.map((t) => `${KNOTEN_NAME[t.art]} ${t.anzahl}`).join(", ") || "keine",
  );
  const meiste = $derived(w.haeufigste[0]?.anzahl ?? 1);

  function anzeige(h: Haeufigkeit): string {
    const roh = h.wert.length > KURZ ? h.wert.slice(0, KURZ - 1) + "..." : h.wert;
    if (h.art === KnotenArt.text) return `"${roh}"`;
    return h.art === KnotenArt.nichts && roh.trim() === "" ? "null" : roh;
  }
</script>

<div class="karte">
  <div class="karte-titel">Alle Werte dieses Pfads <span class="rechts mono" title="Stellen mit diesem Pfad">{w.anzahl}</span></div>
  <div class="mono text-3 muster">{w.muster}</div>
  <dl class="paare">
    {#if w.spanne}<dt>Spanne</dt><dd class="mono">{w.spanne.von} bis {w.spanne.bis}</dd>{/if}
    <dt>Fehlt</dt><dd class="mono">{w.fehlt}</dd>
    <dt>Typen</dt><dd>{typen}</dd>
  </dl>
  {#if w.haeufigste.length > 0}
    <div class="verteilung" title="{w.verschiedene} verschiedene Werte, die häufigsten zuerst">
      {#each w.haeufigste as h (h.art + h.wert)}
        <span class="mono">{anzeige(h)}</span><span class="mono text-3">{h.anzahl}</span>
        <div class="balken"><span style:width="{(h.anzahl / meiste) * 100}%"></span></div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .muster {
    margin-bottom: var(--a2);
    font-size: var(--klein);
  }
  .verteilung {
    margin-top: 10px;
  }
  .verteilung > .mono:nth-child(3n + 1) {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
