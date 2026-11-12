<script lang="ts">
  // Tafel "Vorschau als Unterschied": je Zeile mit Befund die alte Zeile (was fehlt oder weg soll, unterstrichen), die
  // neue Zeile (Ergänztes hervorgehoben), darunter die Hinweise; ruhige Nachbarzeilen geben den Zusammenhang.
  import type { Reparatur, Zeilenbefund } from "../../../analyse/reparatur/reparatur";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import type { ReparierenZustand } from "./reparierenZustand.svelte";
  import { nachher, vorher } from "./stuecke";

  let { blatt, z, reparatur, gewaehlt, ergaenzt, geloescht }: { blatt: Arbeitsblatt; z: ReparierenZustand; reparatur: Reparatur; gewaehlt: Zeilenbefund | null; ergaenzt: number; geloescht: number } = $props();

  /** So viele Zeilen mit Befund zeigt die Vorschau */
  const GEZEIGT = 200;

  type Teil = { art: "ruhig"; zeile: number; text: string } | { art: "befund"; b: Zeilenbefund } | { art: "luecke" };

  /** Startstellen aller Zeilen, einmal je Text */
  const anfaenge = $derived.by(() => {
    const a = [0];
    const t = blatt.text;
    for (let i = t.indexOf("\n"); i !== -1; i = t.indexOf("\n", i + 1)) a.push(i + 1);
    return a;
  });
  const zeilentext = (n: number): string => {
    const von = anfaenge[n - 1];
    const ende = n < anfaenge.length ? anfaenge[n] - 1 : blatt.text.length;
    return blatt.text.slice(von, ende).replace(/\r$/, "");
  };

  const teile = $derived.by((): Teil[] => {
    const aus: Teil[] = [];
    const befunde = reparatur.befunde.slice(0, GEZEIGT);
    const mitBefund = new Set(befunde.map((b) => b.zeile));
    let zuletzt = 0;
    const ruhig = (n: number) => {
      if (n < 1 || n > reparatur.zeilen || n <= zuletzt || mitBefund.has(n)) return;
      if (zuletzt && n > zuletzt + 1) aus.push({ art: "luecke" });
      aus.push({ art: "ruhig", zeile: n, text: zeilentext(n) });
      zuletzt = n;
    };
    for (const b of befunde) {
      ruhig(b.zeile - 1);
      if (zuletzt && b.zeile > zuletzt + 1) aus.push({ art: "luecke" });
      aus.push({ art: "befund", b });
      zuletzt = b.zeile;
      ruhig(b.zeile + 1);
    }
    return aus;
  });

  let feld = $state<HTMLElement>();
  // Die gewählte Zeile in Sicht holen
  $effect(() => {
    const n = gewaehlt?.zeile;
    if (n === undefined || !feld) return;
    feld.querySelector(`[data-zeile="${n}"]`)?.scrollIntoView({ block: "nearest" });
  });
</script>

<section class="wz-tafel">
  <div class="wz-tafel-kopf">
    <i class="fa-solid fa-code-compare"></i> Vorschau als Unterschied
    <span class="rechts"><span class="abzeichen {ergaenzt ? 'gut' : ''}">+ {anzahl(ergaenzt)} Zeichen</span><span class="abzeichen">{anzahl(geloescht)} gelöscht</span></span>
  </div>
  <div class="wz-tafel-feld wz-mulde" bind:this={feld}>
    <div class="wz-code wz-umbruch">
      {#each teile as t, i (i)}
        {#if t.art === "luecke"}
          <div class="wz-ausgelassen">...</div>
        {:else if t.art === "ruhig"}
          <div class="wz-z wz-ruhig"><span class="wz-nr">{anzahl(t.zeile)}</span><span class="wz-zeichen"> </span><span class="wz-t">{t.text}</span></div>
        {:else}
          {@const b = t.b}
          {@const bleibt = z.bleibt(blatt, b.zeile)}
          {@const aendert = b.eingriffe.length > 0 && !bleibt}
          <div class="rp-gruppe" class:rp-gewaehlt={b === gewaehlt} data-zeile={b.zeile}>
            <div class="wz-z" class:wz-weg={aendert} class:wz-markiert={!aendert}><span class="wz-nr">{anzahl(b.zeile)}</span><span class="wz-zeichen">{aendert ? "-" : " "}</span><span class="wz-t">{#each vorher(blatt.text, b) as s, j (j)}{#if s.mark}<span class="wz-falsch">{s.text === " " ? " " : s.text}</span>{:else}{s.text}{/if}{/each}</span></div>
            {#if aendert}
              <div class="wz-z wz-hinzu"><span class="wz-nr">{anzahl(b.zeile)}</span><span class="wz-zeichen">+</span><span class="wz-t">{#each nachher(blatt.text, b) as s, j (j)}{#if s.mark}<span class="wz-neu">{s.text}</span>{:else}{s.text}{/if}{/each}</span></div>
            {/if}
            {#if bleibt}
              <div class="wz-anmerkung warn"><i class="fa-solid fa-hand"></i><span>Bleibt so, wie sie ist.</span></div>
            {/if}
            {#if b.ungeloest}
              <div class="wz-anmerkung"><i class="fa-solid fa-circle-xmark"></i><span>{b.ungeloest.meldung}. Von Hand im Editor lösen.</span></div>
            {/if}
            {#each b.hinweise as h, j (j)}
              <div class="wz-anmerkung warn"><i class="fa-solid fa-triangle-exclamation"></i><span>{h}.</span></div>
            {/each}
          </div>
        {/if}
      {:else}
        <p class="wz-satz rp-luft">Nichts zu ändern.</p>
      {/each}
    </div>
  </div>
</section>

<style>
  .rp-gruppe {
    scroll-margin: var(--a4);
  }
  .rp-luft {
    padding: var(--a3);
  }
</style>
