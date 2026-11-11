<script lang="ts">
  // Histogramm eines Zahlenfelds: Anzahl je runder Klasse, Achse mit fünf Marken, Klassen darunter.
  import { klassenBilden } from "../../../analyse/klassen";
  import type { Feld } from "../../../analyse/statistik";
  import { anzahl } from "../tabelle/zahlen";

  let { feld }: { feld: Feld } = $props();

  const ZAHL = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });
  const k = $derived(klassenBilden(feld.zahlen, 10, feld.ganz));
  const hoechste = $derived(k.klassen.reduce((m, c) => Math.max(m, c.anzahl), 1));
  /** Achse bis zu einer runden Obergrenze */
  const oben = $derived.by(() => {
    if (hoechste < 4) return 4;
    const p = 10 ** Math.floor(Math.log10(hoechste));
    return [1, 2, 4, 5, 10].map((f) => f * p).find((g) => g >= hoechste && g % 4 === 0) ?? Math.ceil(hoechste / 4) * 4;
  });
  /** Fünf Marken, immer ganze Zahlen (oben ist durch 4 teilbar) */
  const marken = $derived([0, 1, 2, 3, 4].map((i) => ({ y: i * 25, wert: (oben / 4) * i })));
</script>

<div class="karte-titel">Histogramm <span class="mono">{feld.pfad}</span> <span class="rechts klein">{anzahl(feld.zahlen.length)} Werte, Anzahl je Klasse</span></div>
<div class="an-histo">
  <div class="an-histo-achse" aria-hidden="true">
    {#each marken as m (m.y)}<span style="--y: {m.y}%">{anzahl(m.wert)}</span>{/each}
  </div>
  <div class="an-histo-flaeche">
    {#each k.klassen as c, i (i)}
      <div class="an-saeule" style="--h: {(c.anzahl / oben) * 100}%" title="{ZAHL.format(c.von)} bis unter {ZAHL.format(c.bis)}: {anzahl(c.anzahl)}">{#if c.anzahl}<b>{anzahl(c.anzahl)}</b>{/if}</div>
    {/each}
  </div>
  <div class="an-histo-klassen">
    {#each k.klassen as c, i (i)}<span>{ZAHL.format(c.von)}</span>{/each}
  </div>
  <div class="an-histo-titel">{feld.name}, Klassenbreite {ZAHL.format(k.schritt)}</div>
</div>
