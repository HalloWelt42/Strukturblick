<script lang="ts">
  // Tafel Fundstelle: Zeilen um den Befund mit Nummern, die Zeile markiert, der Wert rot unterstrichen, darunter die
  // Meldung. "Im Editor" und "Im Baum" springen mit gewählter Stelle in die Ansicht.
  import { KEIN } from "../../../kern/strukturindex";
  import type { Befund } from "../../../analyse/validieren";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";

  let { blatt, befund, text }: { blatt: Arbeitsblatt; befund: Befund; text: string } = $props();

  /** So viele Zeilen vor und nach der Fundstelle */
  const UMFELD = 10;

  const ausschnitt = $derived.by(() => {
    const zeilen = text.split("\n");
    const von = Math.max(1, befund.zeile - UMFELD);
    const bis = Math.min(zeilen.length, befund.zeile + UMFELD);
    const index = blatt.analyse?.index;
    const k = befund.knoten;
    // Markierung des Werts in seiner ersten Zeile (Spalten ab 1)
    const wertAnfang = befund.spalte - 1;
    const wertEnde = index && k !== KEIN ? Math.min(zeilen[befund.zeile - 1]?.length ?? 0, wertAnfang + (index.bis[k] - index.von[k])) : wertAnfang;
    return { zeilen: zeilen.slice(von - 1, bis), von, bis, gesamt: zeilen.length, wertAnfang, wertEnde };
  });

  function zeigen(kennung: "editor" | "baum"): void {
    blatt.waehlen(befund.zeiger);
    blatt.zeigen({ art: "ansicht", kennung });
  }
</script>

<section class="wz-tafel">
  <div class="wz-tafel-kopf">
    <i class="fa-solid fa-location-crosshairs"></i> Fundstelle
    <span class="rechts">
      <button class="knopf" title="Editor an dieser Stelle öffnen" onclick={() => zeigen("editor")}><i class="fa-solid fa-code"></i><span class="nur-breit"> Im Editor</span></button>
      <button class="knopf" title="Baum an dieser Stelle öffnen" onclick={() => zeigen("baum")}><i class="fa-solid fa-folder-tree"></i><span class="nur-breit"> Im Baum</span></button>
    </span>
  </div>
  <div class="wz-tafel-feld wz-mulde">
    <div class="wz-code">
      {#if ausschnitt.von > 1}<div class="wz-ausgelassen">Zeile 1 bis {anzahl(ausschnitt.von - 1)}</div>{/if}
      {#each ausschnitt.zeilen as z, i (i)}
        {@const nr = ausschnitt.von + i}
        {#if nr === befund.zeile}
          <div class="wz-z wz-markiert"><span class="wz-nr">{anzahl(nr)}</span><span class="wz-t">{z.slice(0, ausschnitt.wertAnfang)}<span class="wz-falsch">{z.slice(ausschnitt.wertAnfang, ausschnitt.wertEnde) || " "}</span>{z.slice(ausschnitt.wertEnde)}</span></div>
          <div class="wz-anmerkung"><i class="fa-solid {befund.art === 'fehler' ? 'fa-circle-xmark' : 'fa-triangle-exclamation'}"></i><span>{befund.meldung}.{#if befund.vorschlag} Vermutlich fehlt die führende Null: <span class="mono">"{befund.vorschlag}"</span>.{/if}</span></div>
        {:else}
          <div class="wz-z"><span class="wz-nr">{anzahl(nr)}</span><span class="wz-t">{z}</span></div>
        {/if}
      {/each}
      {#if ausschnitt.bis < ausschnitt.gesamt}<div class="wz-ausgelassen">ab Zeile {anzahl(ausschnitt.bis + 1)}</div>{/if}
    </div>
  </div>
</section>
