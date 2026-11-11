<script lang="ts">
  // Rechte Spalte nach dem Entwurf (entwuerfe/arbeitsplatz.html): das Gewählte, Pfad kopieren, alle Werte dieses Pfads
  // und der Verlauf. Folgt `blatt.gewaehlt`, gleich aus welcher Ansicht gewählt wurde. Ist ein Werkzeug offen, zeigt
  // die Spalte dessen Karten (aus der Registrierung der Werkzeuge).
  import { KEIN, knotenZu, teileVon } from "../../kern";
  import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";
  import { lesestand } from "../bausteine/lesestand.svelte";
  import { InspektorZustand } from "./inspektorZustand.svelte";
  import KarteGewaehlt from "./KarteGewaehlt.svelte";
  import KartePfad from "./KartePfad.svelte";
  import KarteWerte from "./KarteWerte.svelte";
  import KarteVerlauf from "./KarteVerlauf.svelte";
  import { werkzeug } from "../werkzeuge/registrierung";

  let { blatt }: { blatt: Arbeitsblatt } = $props();

  const zustand = $derived(blatt.zustandFuer("inspektor", () => new InspektorZustand()));
  const quelle = lesestand(() => blatt);
  const stand = $derived(quelle.stand);
  const index = $derived(stand?.analyse.index ?? null);
  const text = $derived(stand?.text ?? "");
  const k = $derived(index && blatt.gewaehlt !== null ? knotenZu(index, text, blatt.gewaehlt) : KEIN);
  const teile = $derived(index && k !== KEIN ? teileVon(index, text, k) : null);
  const WerkzeugKarten = $derived(blatt.platz.art === "werkzeug" ? werkzeug(blatt.platz.kennung)?.inspektor : undefined);
</script>

<aside class="inspektor" aria-label="Inspektor">
  <div class="inspektor-feld">
    {#if WerkzeugKarten}
      <WerkzeugKarten {blatt} />
    {:else if index && stand && teile && k !== KEIN}
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
