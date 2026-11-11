<script lang="ts">
  // Formatwahl: Erkennen oder ein angemeldetes Format; setzt die Leseweise des Blatts (wird mitgespeichert).
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { FORMATE } from "../../../formate/registrierung";
  import type { FormatKennung } from "../../../kern";

  let { blatt }: { blatt: Arbeitsblatt } = $props();

  let offen = $state(false);
  let wurzel: HTMLDivElement | undefined = $state();

  const erkannt = $derived(blatt.analyse?.format.name ?? null);
  const gewaehlt = $derived(FORMATE.find((f) => f.kennung === blatt.formatWahl) ?? null);
  const anzeige = $derived(gewaehlt?.name ?? erkannt ?? "Format");

  function waehlen(kennung: FormatKennung | null): void {
    offen = false;
    if (kennung === blatt.formatWahl) return;
    blatt.leseweise(kennung);
  }

  function draussen(e: PointerEvent): void {
    if (offen && wurzel && !e.composedPath().includes(wurzel)) offen = false;
  }
</script>

<svelte:window onpointerdown={draussen} onkeydown={(e) => offen && e.key === "Escape" && (offen = false)} />

<div class="ed-formatwahl" bind:this={wurzel}>
  <button class="knopf" title="Format wählen; Erkennen liest das Format aus dem Text" aria-haspopup="menu" aria-expanded={offen} onclick={() => (offen = !offen)}>
    <i class="fa-solid fa-file-lines"></i> {anzeige} <i class="fa-solid fa-chevron-down text-3"></i>
  </button>
  {#if offen}
    <div class="ed-menue karte" role="menu" aria-label="Format">
      <button role="menuitemradio" aria-checked={blatt.formatWahl === null} class:aktiv={blatt.formatWahl === null} onclick={() => waehlen(null)}>
        <i class="fa-solid fa-wand-magic-sparkles"></i><span>Erkennen</span>
        {#if blatt.formatWahl === null && erkannt}<span class="rechts text-3">{erkannt}</span>{/if}
      </button>
      {#each FORMATE as f (f.kennung)}
        <button role="menuitemradio" aria-checked={blatt.formatWahl === f.kennung} class:aktiv={blatt.formatWahl === f.kennung} onclick={() => waehlen(f.kennung)}>
          <i class="fa-solid fa-file-lines"></i><span>{f.name}</span>
          <span class="rechts text-3 mono">{f.endungen.map((e) => "." + e).join(" ")}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
