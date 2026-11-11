<script lang="ts">
  // Schale nach den abgenommenen Entwürfen (entwuerfe/arbeitsplatz.html): Kopf, Leiste, Hauptbereich, Inspektor, Fuß.
  import { onMount } from "svelte";
  import { arbeitsplatz } from "./lib/zustand/arbeitsplatz.svelte";
  import Kopf from "./lib/oberflaeche/schale/Kopf.svelte";
  import Leiste from "./lib/oberflaeche/schale/Leiste.svelte";
  import Haupt from "./lib/oberflaeche/schale/Haupt.svelte";
  import Fuss from "./lib/oberflaeche/schale/Fuss.svelte";
  import Willkommen from "./lib/oberflaeche/schale/Willkommen.svelte";
  import Inspektor from "./lib/oberflaeche/inspektor/Inspektor.svelte";
  import Meldung from "./lib/oberflaeche/bausteine/Meldung.svelte";
  import Ablagezone from "./lib/oberflaeche/schale/Ablagezone.svelte";
  import { tastenkuerzel } from "./lib/oberflaeche/schale/tastenkuerzel";

  onMount(() => {
    void arbeitsplatz.starten();
    const sichern = () => void arbeitsplatz.allesSpeichern();
    const sichtbar = () => document.visibilityState === "hidden" && sichern();
    window.addEventListener("pagehide", sichern);
    document.addEventListener("visibilitychange", sichtbar);
    const weg = tastenkuerzel(() => arbeitsplatz.aktivesBlatt);
    return () => {
      window.removeEventListener("pagehide", sichern);
      document.removeEventListener("visibilitychange", sichtbar);
      weg();
    };
  });

  const blatt = $derived(arbeitsplatz.aktivesBlatt);
</script>

<Ablagezone>
  <div class="app">
    <Kopf />
    <Leiste />
    {#if blatt}
      {#key blatt.kennung}
        <Haupt {blatt} />
        <Inspektor {blatt} />
      {/key}
    {:else}
      <main class="haupt"><Willkommen /></main>
      <aside class="inspektor"></aside>
    {/if}
    <Fuss />
  </div>
</Ablagezone>
<Meldung />
