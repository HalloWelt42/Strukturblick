<script lang="ts">
  // Karte "Pfad kopieren": ein Knopf je Schreibweise; der Klick kopiert und zeigt die Schreibweise im Wertfeld.
  import { SCHREIBWEISEN, SCHREIBWEISE_NAME, schreiben, type Schreibweise, type Teil } from "../../kern";
  import { meldungen } from "../../zustand/meldungen.svelte";
  import type { InspektorZustand } from "./inspektorZustand.svelte";
  import LexikonKnopf from "../lexikon/LexikonKnopf.svelte";

  let { zustand, teile }: { zustand: InspektorZustand; teile: readonly Teil[] } = $props();

  /** So lange zeigt der Knopf den Haken nach dem Kopieren */
  const HAKEN_MS = 1500;

  const pfad = $derived(schreiben(teile, zustand.schreibweise));
  let kopiert = $state<Schreibweise | null>(null);
  let hakenZeit: ReturnType<typeof setTimeout> | null = null;

  async function kopieren(weise: Schreibweise): Promise<void> {
    zustand.schreibweise = weise;
    try {
      if (!navigator.clipboard) throw new Error("keine Zwischenablage");
      await navigator.clipboard.writeText(schreiben(teile, weise));
      kopiert = weise;
      if (hakenZeit) clearTimeout(hakenZeit);
      hakenZeit = setTimeout(() => (kopiert = null), HAKEN_MS);
    } catch {
      meldungen.zeigen({ text: "Kopieren ging nicht: Der Browser erlaubt hier keinen Zugriff auf die Zwischenablage. Der Pfad steht im Feld zum Markieren.", art: "fehler" });
    }
  }

  $effect(() => () => {
    if (hakenZeit) clearTimeout(hakenZeit);
  });
</script>

<div class="karte">
  <div class="karte-titel">Pfad kopieren <span class="rechts"><LexikonKnopf thema="json-pointer" titel="Was die Schreibweisen bedeuten" /></span></div>
  <div class="knopf-reihe">
    {#each SCHREIBWEISEN as w (w)}
      <button class="knopf" title="Pfad als {SCHREIBWEISE_NAME[w]} kopieren" onclick={() => void kopieren(w)}>
        {#if kopiert === w}<i class="fa-solid fa-check"></i>{/if}{SCHREIBWEISE_NAME[w]}
      </button>
    {/each}
  </div>
  <div class="wertfeld klein pfadfeld" aria-label="Pfad als {SCHREIBWEISE_NAME[zustand.schreibweise]}">{pfad}</div>
</div>

<style>
  .pfadfeld {
    margin-top: 10px;
    font-size: var(--klein);
    user-select: all;
  }
</style>
