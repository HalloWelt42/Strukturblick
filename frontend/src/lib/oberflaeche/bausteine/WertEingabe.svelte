<script lang="ts">
  // Eingabefeld zum direkten Bearbeiten eines Werts (Baumzeile, Inspektor): beginnt mit dem markierten Inhalt,
  // Enter übernimmt, Escape oder Wegklicken bricht ab. Tasten bleiben beim Feld.
  import { untrack } from "svelte";

  let {
    anfang,
    variante = "zeile",
    beschriftung = "Neuer Wert",
    onuebernehmen,
    onabbrechen,
  }: {
    anfang: string;
    variante?: "zeile" | "feld";
    beschriftung?: string;
    onuebernehmen: (eingabe: string) => void;
    onabbrechen: () => void;
  } = $props();

  let wert = $state(untrack(() => anfang));
  let fertig = false;

  function markieren(feld: HTMLInputElement): void {
    feld.focus();
    feld.select();
  }

  function beenden(uebernehmen: boolean): void {
    if (fertig) return;
    fertig = true;
    if (uebernehmen) onuebernehmen(wert);
    else onabbrechen();
  }

  function taste(e: KeyboardEvent): void {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      beenden(true);
    } else if (e.key === "Escape") {
      e.preventDefault();
      beenden(false);
    }
  }
</script>

<input
  class="eingabe {variante}"
  aria-label={beschriftung}
  spellcheck="false"
  autocomplete="off"
  bind:value={wert}
  use:markieren
  onkeydown={taste}
  onclick={(e) => e.stopPropagation()}
  ondblclick={(e) => e.stopPropagation()}
  onblur={() => beenden(false)}
/>

<style>
  .eingabe {
    flex: 1;
    min-width: 0;
    border: 0;
    outline: 0;
    background: var(--flaeche-eingabe);
    box-shadow: var(--vertieft), 0 0 0 2px var(--akzent-flaeche);
    color: var(--text-1);
    font-family: var(--schrift-mono);
  }
  .zeile {
    height: calc(var(--zeile) - 6px);
    padding: 0 var(--a2);
    font-size: var(--klein);
  }
  .feld {
    width: 100%;
    padding: var(--a2) var(--a3);
    font-size: var(--gross);
  }
</style>
