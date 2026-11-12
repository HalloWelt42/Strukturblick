<script lang="ts">
  // Schale nach den abgenommenen Entwürfen (entwuerfe/arbeitsplatz.html): Kopf, Leiste, Hauptbereich, Inspektor, Fuß.
  import { onMount, untrack } from "svelte";
  import { arbeitsplatz } from "./lib/zustand/arbeitsplatz.svelte";
  import Kopf from "./lib/oberflaeche/schale/Kopf.svelte";
  import Leiste from "./lib/oberflaeche/schale/Leiste.svelte";
  import Haupt from "./lib/oberflaeche/schale/Haupt.svelte";
  import Fuss from "./lib/oberflaeche/schale/Fuss.svelte";
  import Willkommen from "./lib/oberflaeche/schale/Willkommen.svelte";
  import Inspektor from "./lib/oberflaeche/inspektor/Inspektor.svelte";
  import Meldung from "./lib/oberflaeche/bausteine/Meldung.svelte";
  import Kontextmenue from "./lib/oberflaeche/bausteine/Kontextmenue.svelte";
  import Ablagezone from "./lib/oberflaeche/schale/Ablagezone.svelte";
  import { tastaturAnmelden } from "./lib/oberflaeche/aktionen/tastatur";
  import Zugangsseite from "./lib/oberflaeche/schale/Zugangsseite.svelte";
  import Startanzeige from "./lib/oberflaeche/schale/Startanzeige.svelte";
  import StartHinweis from "./lib/oberflaeche/schale/StartHinweis.svelte";
  import { starthinweis } from "./lib/zustand/starthinweis.svelte";
  import AblageSeite from "./lib/oberflaeche/ablage/AblageSeite.svelte";
  import { zugang } from "./lib/zustand/zugang.svelte";
  import { adresseVerfolgen } from "./lib/oberflaeche/schale/adressleitung.svelte";

  // Sobald der Zugang bereit ist (ohne Server sofort, mit Server nach der Anmeldung), startet der Arbeitsplatz einmal
  $effect(() => {
    if (zugang.stand === "bereit") void zugang.arbeitsplatzStarten();
  });

  // Adresse und Arbeitsplatz gleich halten (Deeplinks, Zurück/Vor), sobald der Arbeitsplatz steht
  $effect(() => {
    if (arbeitsplatz.bereit) return untrack(adresseVerfolgen);
  });

  onMount(() => {
    void zugang.starten();
    const sichern = () => void arbeitsplatz.allesSpeichern();
    const sichtbar = () => document.visibilityState === "hidden" && sichern();
    window.addEventListener("pagehide", sichern);
    document.addEventListener("visibilitychange", sichtbar);
    const weg = tastaturAnmelden();
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
  <Startanzeige />
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
<Kontextmenue />
{#if starthinweis.offen}<StartHinweis />{/if}

