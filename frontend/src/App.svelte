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
  import Zugangsseite from "./lib/oberflaeche/schale/Zugangsseite.svelte";
  import AblageSeite from "./lib/oberflaeche/ablage/AblageSeite.svelte";
  import { zugang } from "./lib/zustand/zugang.svelte";

  // Sobald der Zugang bereit ist (ohne Server sofort, mit Server nach der Anmeldung), startet der Arbeitsplatz einmal
  $effect(() => {
    if (zugang.stand === "bereit") void zugang.arbeitsplatzStarten();
  });

  onMount(() => {
    void zugang.starten();
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

{#if zugang.stand !== "bereit"}
  <Zugangsseite />
{:else if !arbeitsplatz.bereit}
  <div class="laden-start"><i class="fa-solid fa-spinner fa-spin"></i> Öffne den Arbeitsplatz ...</div>
{:else}
<Ablagezone>
  <div class="app">
    <Kopf />
    <Leiste />
    {#if arbeitsplatz.seite === "ablage"}
      <AblageSeite />
    {:else if blatt}
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
{/if}
<Meldung />

<style>
  .laden-start {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--a2);
    color: var(--text-3);
    background: var(--flaeche-seite);
  }
</style>
