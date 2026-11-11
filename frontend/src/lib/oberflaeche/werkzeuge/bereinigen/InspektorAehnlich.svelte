<script lang="ts">
  // Inspektor zu den ähnlichen Werten: wie das Verfahren vergleicht (beim gleichen Kern mit Beispielen aus den Gruppen),
  // welche Zellen sich ändern und wie die Spalte danach aussieht.
  import { ersetzungen, kern, VERFAHREN } from "../../../analyse/bereinigen/aehnlich";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import type { BereinigenZustand, Tabellenstand } from "./bereinigenZustand.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import WertText from "./WertText.svelte";

  let { blatt, z, s }: { blatt: Arbeitsblatt; z: BereinigenZustand; s: Tabellenstand } = $props();

  /** So viele betroffene Zellen nennt die Karte */
  const ZEIGEN = 8;
  const spalte = $derived(z.aehnlicheSpalte(s));
  const j = $derived(s.tabelle.spalteNach.get(spalte) ?? 0);
  const verfahren = $derived(VERFAHREN.find((v) => v.kennung === z.verfahren)!);
  const gruppen = $derived(z.gruppen(s, j, z.verfahren));
  const karte = $derived(z.ersetzungsKarte(spalte, gruppen));
  const aenderungen = $derived(ersetzungen(s.tabelle, s.index, s.text, j, karte));
  const verschieden = $derived(z.werte(s, j).length);
  const danach = $derived(new Set(z.werte(s, j).map((w) => karte.get(w.wert) ?? w.wert)).size);
  const beispiele = $derived(gruppen.slice(0, 2).flatMap((g) => g.varianten.slice(0, 2).map((v) => v.wert)));

  function zeigen(zeiger: string): void {
    blatt.waehlen(zeiger);
    blatt.zeigen({ art: "ansicht", kennung: "tabelle" });
  }
</script>

<div class="karte">
  <div class="karte-titel">Verfahren <span class="rechts abzeichen">{verfahren.name}</span></div>
  {#if z.verfahren === "kern"}
    <p class="br-karten-text">Jeder Wert wird auf seinen Kern gebracht. Werte mit gleichem Kern bilden eine Gruppe.</p>
    <ol class="br-schritte">
      <li>Alles klein</li>
      <li>Leerzeichen und Satzzeichen weg: Punkt, Klammern, Schrägstrich</li>
      <li>Was bleibt, sind Buchstaben und Ziffern</li>
    </ol>
    {#if beispiele.length}
      <div class="br-aenderungen br-oben">
        {#each beispiele as b (b)}
          <span class="br-nr"><i class="fa-solid fa-equals"></i></span><span class="br-paar"><WertText wert={b} /><i class="fa-solid fa-arrow-right"></i>{kern(b)}</span>
        {/each}
      </div>
    {/if}
    <p class="br-karten-text br-oben">Abkürzungen wie "Lpz." haben einen anderen Kern und fallen nicht in die Gruppe. Dafür einen eigenen Zielwert eintippen oder ein großzügigeres Verfahren wählen.</p>
  {:else}
    <p class="br-karten-text">{verfahren.erklaerung}</p>
    <p class="br-karten-text">Verglichen werden die Kerne (klein, ohne Satzzeichen); Werte unter 4 Zeichen nur, wenn ihr Kern gleich ist.</p>
  {/if}
</div>

<div class="karte">
  <div class="karte-titel">Betroffene Zellen <span class="rechts mono">{anzahl(aenderungen.length)}</span></div>
  {#if aenderungen.length}
    <div class="br-aenderungen">
      {#each aenderungen.slice(0, ZEIGEN) as a (a.zeiger)}
        <span class="br-nr">{anzahl(s.tabelle.zeileImText[a.zeile])}</span>
        <button class="br-paar br-sprung" title="In der Tabelle zeigen" onclick={() => zeigen(a.zeiger)}><span class="br-alt"><WertText wert={a.vorher} /></span><i class="fa-solid fa-arrow-right"></i><WertText wert={a.nachher} /></button>
      {/each}
    </div>
    {#if aenderungen.length > ZEIGEN}<p class="br-karten-text br-oben">... und {anzahl(aenderungen.length - ZEIGEN)} weitere.</p>{/if}
  {:else}
    <p class="br-karten-text">Keine: alle Gruppen sind ausgenommen oder es gibt keine.</p>
  {/if}
</div>

<div class="karte">
  <div class="karte-titel">Danach</div>
  <dl class="paare">
    <dt>{spalte}</dt><dd><span class="mono">{anzahl(danach)}</span> verschiedene Werte statt <span class="mono">{anzahl(verschieden)}</span></dd>
    <dt>Verlauf</dt><dd>Stand {blatt.verlauf.zeiger + 1}: "{spalte}: ähnliche Werte zusammengeführt"</dd>
  </dl>
</div>
