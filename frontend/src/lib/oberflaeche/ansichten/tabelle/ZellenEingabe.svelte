<script lang="ts">
  // Feld zum Bearbeiten einer Zelle: beginnt mit dem markierten Inhalt (Tippen ersetzt ihn), Enter übernimmt, Escape
  // bricht ab, Tab übernimmt und springt zur nächsten Zelle (mit Umschalt zur vorigen). Verlässt der Fokus das Feld,
  // wird übernommen wie mit Enter.
  import { onMount } from "svelte";

  let { anfang, onuebernehmen, onabbrechen }: { anfang: string; onuebernehmen: (wert: string, schritt: 0 | 1 | -1, perTaste: boolean) => void; onabbrechen: () => void } = $props();

  let feld = $state<HTMLInputElement | null>(null);
  let erledigt = false;

  onMount(() => {
    feld?.focus({ preventScroll: true });
    feld?.select();
  });

  function fertig(schritt: 0 | 1 | -1, perTaste: boolean): void {
    if (erledigt || !feld) return;
    erledigt = true;
    onuebernehmen(feld.value, schritt, perTaste);
  }

  function taste(e: KeyboardEvent): void {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      fertig(0, true);
    } else if (e.key === "Tab") {
      e.preventDefault();
      fertig(e.shiftKey ? -1 : 1, true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      erledigt = true;
      onabbrechen();
    }
  }
</script>

<input class="tb-eingabe" bind:this={feld} value={anfang} onkeydown={taste} onblur={() => fertig(0, false)} onclick={(e) => e.stopPropagation()} ondblclick={(e) => e.stopPropagation()} aria-label="Wert bearbeiten" spellcheck="false" />
<span class="tb-tipp"><span class="taste">Enter</span> übernimmt <span class="taste">Esc</span> bricht ab <span class="taste">Tab</span> nächste Zelle</span>
