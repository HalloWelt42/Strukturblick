<script lang="ts">
  // Inspektor zu den Typen: die gewählte Spalte (Zeile in der Übersicht anklicken) mit dem, was gelesen wurde, und die
  // nicht lesbaren Werte zum Ansehen in der Tabelle (von Hand ändern gilt sofort, die Vorschau zählt danach mit).
  import { spaltentypen, vorschlagFuer } from "../../../analyse/bereinigen/typen";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import type { BereinigenZustand, Tabellenstand } from "./bereinigenZustand.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";

  let { blatt, z, s }: { blatt: Arbeitsblatt; z: BereinigenZustand; s: Tabellenstand } = $props();

  const ZAHL = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const typen = $derived(spaltentypen(s.tabelle, s.index, s.text));
  const spalte = $derived(z.typenSpalte(s, typen.find((t) => t.vorschlag !== null)?.spalte ?? null));
  const typ = $derived(typen.find((t) => t.spalte === spalte));
  const v = $derived(vorschlagFuer(s.tabelle, s.index, s.text, s.tabelle.spalteNach.get(spalte) ?? 0));
  const spanne = $derived.by(() => {
    if (v?.art !== "betrag" || !v.aenderungen.length) return null;
    const z2 = v.aenderungen.map((a) => (a.neu.art === "zahl" ? Number(a.neu.roh) : Number.NaN)).filter((x) => !Number.isNaN(x));
    return `${ZAHL.format(Math.min(...z2))} bis ${ZAHL.format(Math.max(...z2))}`;
  });

  function zeigen(zeiger: string): void {
    blatt.waehlen(zeiger);
    blatt.zeigen({ art: "ansicht", kennung: "tabelle" });
  }
</script>

<div class="karte">
  <div class="karte-titel">Gewählt <span class="rechts abzeichen">Spalte {spalte}</span></div>
  <dl class="paare">
    <dt>Steht als</dt><dd>{typ?.stehtAls ?? "leer"}</dd>
    <dt>Erkannt</dt><dd>{typ?.erkannt ?? "nichts"}</dd>
    {#if v && v.art !== "text-bleibt"}
      <dt>Lesbar</dt><dd><span class="mono">{anzahl(v.aenderungen.length + v.bleiben)}</span> als {v.art === "betrag" ? "Betrag" : "Datum"}</dd>
    {/if}
    {#if v?.art === "text-bleibt"}
      <dt>Führende Null</dt><dd><span class="mono">{anzahl(v.fuehrendeNullen)}</span> Werte</dd>
    {/if}
    {#if spanne}<dt>Spanne</dt><dd class="mono">{spanne}</dd>{/if}
  </dl>
  {#if !v}<p class="br-karten-text br-oben">Kein Vorschlag: Die Spalte steht so, wie sie gelesen wird. In der Übersicht eine andere Spalte anklicken.</p>{/if}
</div>

{#if v?.unlesbar.length}
  <div class="karte">
    <div class="karte-titel">Nicht lesbar <span class="rechts abzeichen fehler">{anzahl(v.unlesbar.length)}</span></div>
    <div class="br-aenderungen">
      {#each v.unlesbar.slice(0, 10) as u (u.zeiger)}
        <span class="br-nr">{anzahl(s.tabelle.zeileImText[u.zeile])}</span>
        <button class="br-paar br-sprung" title="{u.grund}. In der Tabelle zeigen" onclick={() => zeigen(u.zeiger)}>"{u.wert}"</button>
      {/each}
    </div>
    <p class="br-karten-text br-oben">Von Hand ändern gilt sofort und lässt sich rückgängig machen. Danach zählt die Vorschau mit.</p>
    <div class="knopf-reihe">
      <button class="knopf" onclick={() => zeigen(v.unlesbar[0].zeiger)}><i class="fa-solid fa-table"></i> In der Tabelle zeigen</button>
    </div>
  </div>
{/if}
