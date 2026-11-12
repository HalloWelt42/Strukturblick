<script lang="ts">
  // Tafel mit dem Anfang eines Texts (Quelle oder Ergebnis): Zeilennummern, lange Zeilen umbrochen und gekürzt, darunter
  // wie viel noch folgt.
  import { anzahl } from "../../ansichten/tabelle/zahlen";

  let { titel, symbol, name, abzeichen, text, rest = "Zeilen" }: { titel: string; symbol: string; name: string; abzeichen: string; text: string; rest?: string } = $props();

  /** So viele Zeilen zeigt die Vorschau */
  const ZEILEN = 40;
  /** Längere Zeilen werden gekürzt */
  const ZEICHEN = 400;

  const vorschau = $derived.by(() => {
    const zeilen: string[] = [];
    let von = 0;
    while (zeilen.length < ZEILEN && von < text.length) {
      const ende = text.indexOf("\n", von);
      const z = text.slice(von, ende === -1 ? text.length : ende).replace(/\r$/, "");
      zeilen.push(z.length > ZEICHEN ? `${z.slice(0, ZEICHEN)}...` : z);
      if (ende === -1) break;
      von = ende + 1;
    }
    return zeilen;
  });
  const gesamt = $derived.by(() => {
    let n = text.length && !text.endsWith("\n") ? 1 : 0;
    for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) n++;
    return n;
  });
</script>

<section class="wz-tafel">
  <div class="wz-tafel-kopf">
    <i class="fa-solid {symbol}"></i> {titel} <span class="mono">{name}</span>
    <span class="rechts"><span class="abzeichen zweit">{abzeichen}</span></span>
  </div>
  <div class="wz-tafel-feld wz-mulde">
    <div class="wz-code wz-umbruch">
      {#each vorschau as z, i (i)}
        <div class="wz-z"><span class="wz-nr">{anzahl(i + 1)}</span><span class="wz-t">{z}</span></div>
      {/each}
      {#if gesamt > vorschau.length}<div class="wz-ausgelassen">{anzahl(gesamt - vorschau.length)} weitere {rest}</div>{/if}
    </div>
  </div>
</section>
