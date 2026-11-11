<script lang="ts">
  // Leseweise des Formats (CSV: Trennzeichen, Kopfzeile): Abzeichen mit den aktuellen Werten aus den Merkmalen der
  // Analyse, dazu ein Menü zum Ändern. Welche Wahl es gibt, sagt allein das Format (leseoptionen, Regel A4). Die Wahl
  // geht über blatt.leseweise an das Blatt, das sie mitspeichert; alle Werte werden fest gesetzt, damit nach dem
  // Neuladen nichts neu geraten wird.
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import type { Analyse } from "../../../kern/befehl";

  let { blatt, analyse }: { blatt: Arbeitsblatt; analyse: Analyse } = $props();

  let offen = $state(false);
  let huelle = $state<HTMLElement | null>(null);

  const optionen = $derived(analyse.format.leseoptionen);
  const aktuell = (kennung: string): string | number | boolean | undefined => analyse.merkmale[kennung];
  const wertName = (kennung: string): string => {
    const o = optionen.find((x) => x.kennung === kennung);
    const w = aktuell(kennung);
    return o?.werte.find((x) => x.wert === w)?.name ?? `"${String(w)}"`;
  };
  const kurz = $derived(optionen.map((o) => wertName(o.kennung)).join(", "));
  const festGewaehlt = $derived(optionen.some((o) => blatt.optionen[o.kennung] !== undefined));
  const erklaerung = $derived(`So wird die Datei gelesen: ${optionen.map((o) => `${o.name} ${wertName(o.kennung)}`).join(", ")} (${festGewaehlt ? "von dir gewählt" : "erkannt"})`);

  function setzen(kennung: string, wert: string | boolean): void {
    const alle: Record<string, string | number | boolean> = {};
    for (const o of optionen) {
      const w = aktuell(o.kennung);
      if (w !== undefined) alle[o.kennung] = w;
    }
    blatt.leseweise(analyse.format.kennung, { ...blatt.optionen, ...alle, [kennung]: wert });
  }

  function aussen(e: PointerEvent): void {
    if (offen && huelle && !e.composedPath().includes(huelle)) offen = false;
  }
</script>

<svelte:window onpointerdown={aussen} onkeydown={(e) => offen && e.key === "Escape" && (offen = false)} />

{#if optionen.length}
  <span class="tb-dialekt" title={erklaerung} bind:this={huelle}>
    <span class="abzeichen zweit">{kurz}</span>
    <button class="knopf still" aria-expanded={offen} onclick={() => (offen = !offen)}>Ändern</button>
    {#if offen}
      <div class="tb-dialekt-menue" role="group" aria-label="Leseweise ändern">
        {#each optionen as o (o.kennung)}
          <div class="karte-titel">{o.name}</div>
          <div class="segment">
            {#each o.werte as w (String(w.wert))}
              <button class:aktiv={aktuell(o.kennung) === w.wert} onclick={() => setzen(o.kennung, w.wert)}>{w.name}</button>
            {/each}
          </div>
        {/each}
      </div>
    {/if}
  </span>
{/if}
