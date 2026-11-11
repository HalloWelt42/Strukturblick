<script lang="ts">
  // Hauptbereich: Ansichtswahl aus der Registrierung, darunter die gewählte Ansicht des Blatts, am Fuß die Abfrage.
  // Ein SQL-Ergebnis verbindet mehrere Dokumente und belegt die Ansicht als eigenes Segment, bis es geschlossen wird.
  import type { Arbeitsblatt } from "../../zustand/arbeitsblatt.svelte";
  import { abfrage } from "../../zustand/abfrage.svelte";
  import { ANSICHTEN, ansicht } from "../ansichten/registrierung";
  import Konsole from "../abfrage/Konsole.svelte";
  import SqlErgebnis from "../abfrage/SqlErgebnis.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const gewaehlt = $derived(ansicht(blatt.platz.kennung));
  const Komponente = $derived(gewaehlt.komponente);

  // Gezeigt wird das letzte gültige SQL-Ergebnis; ist das letzte ein Fehler, gilt es als veraltet
  const sqlStand = $derived(abfrage.gueltig?.sprache === "sql" && abfrage.gueltig.ausgang.ok && abfrage.gueltig.ausgang.ergebnis.art === "tabelle" ? abfrage.gueltig : null);
  const sqlZeigen = $derived(abfrage.offen && abfrage.ergebnisZeigen && abfrage.sprache === "sql" && sqlStand !== null);

  function zeigen(kennung: string): void {
    abfrage.ergebnisZeigen = false;
    blatt.zeigen({ art: "ansicht", kennung });
  }
</script>

<main class="haupt">
  <div class="ansicht-kopf">
    <nav class="segment" aria-label="Ansicht">
      {#each ANSICHTEN as a (a.kennung)}
        <button class:aktiv={!sqlZeigen && blatt.platz.art === "ansicht" && blatt.platz.kennung === a.kennung} onclick={() => zeigen(a.kennung)}>
          <i class="fa-solid {a.symbol}"></i><span>{a.titel}</span>
        </button>
      {/each}
    </nav>
    {#if sqlZeigen}
      <nav class="segment"><button class="aktiv" title="Ergebnis schließen" onclick={() => (abfrage.ergebnisZeigen = false)}><i class="fa-solid fa-database"></i><span>Abfrageergebnis</span> <i class="fa-solid fa-xmark"></i></button></nav>
    {/if}
  </div>
  {#if sqlZeigen && sqlStand?.ausgang.ok && sqlStand.ausgang.ergebnis.art === "tabelle"}
    <SqlErgebnis
      ergebnis={sqlStand.ausgang.ergebnis}
      dauer={sqlStand.ausgang.dauer}
      veraltet={abfrage.letztes !== sqlStand}
      onalsdokument={(t) => void abfrage.alsDokument(t)}
      onmerken={() => abfrage.merken()}
    />
  {:else}
    <Komponente {blatt} />
  {/if}
  <Konsole {blatt} />
</main>
