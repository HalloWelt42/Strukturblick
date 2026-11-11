<script lang="ts">
  // Eine Gruppe ähnlicher Schreibweisen: Zusammenführen ja oder nein, Zielwert wählen (Kästchen vor der Schreibweise)
  // oder einen eigenen eintippen; jede andere Schreibweise zeigt, wozu sie wird.
  import type { Gruppe } from "../../../analyse/bereinigen/aehnlich";
  import { gruppenSchluessel, type BereinigenZustand } from "./bereinigenZustand.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import WertText from "../../bausteine/WertText.svelte";

  let { z, spalte, g }: { z: BereinigenZustand; spalte: string; g: Gruppe } = $props();

  const schluessel = $derived(gruppenSchluessel(spalte, g));
  const ziel = $derived(z.zielVon(spalte, g));
  const eigen = $derived(!g.varianten.some((v) => v.wert === ziel));
  const aus = $derived(z.ohne[schluessel] ?? false);
  const zellen = $derived(g.varianten.reduce((n, v) => n + v.anzahl, 0));
  const aendert = $derived(g.varianten.filter((v) => v.wert !== ziel).reduce((n, v) => n + v.anzahl, 0));
  const hoechste = $derived(Math.max(1, ...g.varianten.map((v) => v.anzahl)));

  function zielSetzen(wert: string): void {
    if (wert === g.ziel) delete z.ziele[schluessel];
    else z.ziele[schluessel] = wert;
  }

  function eingeben(e: Event): void {
    const wert = (e.currentTarget as HTMLInputElement).value;
    zielSetzen(wert.trim() === "" ? g.ziel : wert);
  }
</script>

<article class="br-tafel" class:br-aus={aus}>
  <header class="br-tafel-kopf">
    <strong><WertText wert={ziel} /></strong>
    <span class="text-3 klein">{g.varianten.length} Schreibweisen, {anzahl(zellen)} Zellen</span>
    <span class="br-rechts">
      <span class="klein text-3">Zusammenführen</span>
      <nav class="segment">
        <button class:aktiv={!aus} onclick={() => delete z.ohne[schluessel]}>Ja</button>
        <button class:aktiv={aus} onclick={() => (z.ohne[schluessel] = true)}>Nein</button>
      </nav>
    </span>
  </header>
  <div class="br-varianten">
    {#each g.varianten as v (v.wert)}
      {@const istZiel = v.wert === ziel}
      <div class="br-variante" class:br-ist-ziel={istZiel}>
        <button class="br-ziel" class:an={istZiel} title={istZiel ? "Zielwert" : "Als Zielwert wählen"} aria-pressed={istZiel} onclick={() => zielSetzen(v.wert)}></button>
        <span class="br-wert-text"><WertText wert={v.wert} /></span>
        <span class="br-balken"><span style="width: {(v.anzahl / hoechste) * 100}%"></span></span>
        <span class="br-anzahl">{anzahl(v.anzahl)}</span>
        <span class="br-folge">
          {#if istZiel}
            <span class="abzeichen gut"><i class="fa-solid fa-bullseye"></i> Zielwert</span>{#if v.wert !== g.ziel}von dir gewählt{/if}
          {:else}
            wird zu <span class="mono"><WertText wert={ziel} /></span>
            {#if v.wert !== v.wert.trim()}<span class="abzeichen warn">Leerzeichen am Rand</span>{/if}
          {/if}
        </span>
      </div>
    {/each}
    <div class="br-variante br-frei" class:br-ist-ziel={eigen}>
      <button class="br-ziel" class:an={eigen} title="Eigenen Zielwert nehmen" aria-pressed={eigen} onclick={(e) => ((e.currentTarget.nextElementSibling?.querySelector("input") as HTMLInputElement | null)?.focus())}></button>
      <label class="feld"><i class="fa-solid fa-pen"></i><input placeholder="Eigenen Zielwert eingeben" value={eigen ? ziel : ""} aria-label="Eigener Zielwert für {g.ziel}" onchange={eingeben} /></label>
    </div>
  </div>
  <footer class="br-tafel-fuss">
    <span>Ändert <strong class="mono">{anzahl(aus ? 0 : aendert)}</strong> Zellen</span>
    {#if ziel !== g.ziel}<span class="text-3">Vorschlag war der häufigste Wert <span class="mono">{g.ziel}</span></span>{/if}
  </footer>
</article>
