<script lang="ts">
  // Rechte Spalte nach dem Entwurf (entwuerfe/arbeitsplatz.html): das Gewählte, Pfad kopieren, alle Werte dieses Pfads
  // und der Verlauf. Folgt `blatt.gewaehlt`, gleich aus welcher Ansicht gewählt wurde.
  import { KEIN, knotenZu, teileVon } from "../../kern";
  import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";
  import { lesestand } from "../bausteine/lesestand.svelte";
  import { InspektorZustand } from "./inspektorZustand.svelte";
  import KarteGewaehlt from "./KarteGewaehlt.svelte";
  import KartePfad from "./KartePfad.svelte";
  import KarteWerte from "./KarteWerte.svelte";
  import KarteVerlauf from "./KarteVerlauf.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();

  const zustand = $derived(blatt.zustandFuer("inspektor", () => new InspektorZustand()));
  const quelle = lesestand(() => blatt);
  const stand = $derived(quelle.stand);
  const index = $derived(stand?.analyse.index ?? null);
  const text = $derived(stand?.text ?? "");
  const k = $derived(index && blatt.gewaehlt !== null ? knotenZu(index, text, blatt.gewaehlt) : KEIN);
  const teile = $derived(index && k !== KEIN ? teileVon(index, text, k) : null);
</script>

<aside class="inspektor" aria-label="Inspektor">
  <div class="inspektor-feld">
    {#if index && stand && teile && k !== KEIN}
      {#key k}
        <KarteGewaehlt {blatt} {index} {text} {k} aktuell={stand.aktuell} />
      {/key}
      <KartePfad {zustand} {teile} />
      <KarteWerte {index} {text} {k} />
    {:else}
      <div class="karte">
        <p class="hinweis text-3"><i class="fa-solid fa-hand-pointer"></i> Im Baum oder in der Tabelle etwas wählen</p>
      </div>
    {/if}
    <KarteVerlauf {blatt} />
  </div>
</aside>

<style>
  .hinweis {
    display: flex;
    align-items: center;
    gap: var(--a2);
    margin: 0;
    font-size: var(--klein);
  }
</style>
