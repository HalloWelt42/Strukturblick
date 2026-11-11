<script lang="ts">
  // Hauptbereich: Ansichtswahl aus der Registrierung, darunter die gewählte Ansicht des Blatts. Genau eins ist gewählt.
  import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";
  import { ANSICHTEN, ansicht } from "../ansichten/registrierung";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const gewaehlt = $derived(ansicht(blatt.platz.kennung));
  const Komponente = $derived(gewaehlt.komponente);
</script>

<main class="haupt">
  <div class="ansicht-kopf">
    <nav class="segment" aria-label="Ansicht">
      {#each ANSICHTEN as a (a.kennung)}
        <button class:aktiv={blatt.platz.art === "ansicht" && blatt.platz.kennung === a.kennung} onclick={() => blatt.zeigen({ art: "ansicht", kennung: a.kennung })}>
          <i class="fa-solid {a.symbol}"></i><span>{a.titel}</span>
        </button>
      {/each}
    </nav>
  </div>
  <Komponente {blatt} />
</main>
