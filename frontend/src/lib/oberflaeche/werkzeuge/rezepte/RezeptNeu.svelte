<script lang="ts">
  // Neues Rezept aus dem Verlauf: die Vorgänge aus Bereinigen in diesem Dokument, jeder mit Schalter (alle an), dazu
  // ein Name. Gespeichert werden die fachlichen Schritte, nicht die Stellen im Text.
  import { untrack } from "svelte";
  import { SCHRITT_ART, schrittErklaerung, schrittTitel } from "../../../analyse/rezepte/rezept";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { rezepte, type Verlaufsschritt } from "../../../zustand/rezepte.svelte";

  let { blatt, verlauf }: { blatt: Arbeitsblatt; verlauf: readonly Verlaufsschritt[] } = $props();

  let aus = $state<Record<number, boolean>>({});
  let name = $state(untrack(() => `${blatt.name.replace(/\.[^.]+$/, "")} säubern`));
  const gewaehlt = $derived(verlauf.filter((v) => !aus[v.nr]));

  async function speichern(): Promise<void> {
    await rezepte.ausVerlauf(blatt, gewaehlt, name);
  }
</script>

<div class="inhalt">
  <div class="vw-seite">
    <div>
      <h2 class="vw-titel"><i class="fa-solid fa-clock-rotate-left"></i> Neues Rezept aus dem Verlauf</h2>
      <p class="vw-unter">Jeder Vorgang aus Bereinigen in {blatt.name} wird ein Schritt. Ausgeschaltete Vorgänge bleiben draußen; Bearbeitungen von Hand im Editor oder in der Tabelle gehören nicht zu Rezepten.</p>
    </div>
    {#if verlauf.length}
      <section>
        <h3 class="vw-abschnitt">Vorgänge <span class="rechts">{gewaehlt.length} von {verlauf.length} gewählt</span></h3>
        <div class="vw-schritte">
          {#each verlauf as v, i (v.nr)}
            <div class="vw-schritt" class:rz-aus={aus[v.nr]}>
              <span class="vw-schritt-nr">{i + 1}</span>
              <button class="vw-schalter" class:an={!aus[v.nr]} role="switch" aria-checked={!aus[v.nr]} aria-label="Vorgang {v.titel}" onclick={() => (aus[v.nr] = !aus[v.nr])}></button>
              <div class="vw-schritt-text">
                <div class="vw-schritt-name">{schrittTitel(v.schritt)} <span class="abzeichen zweit">{SCHRITT_ART[v.schritt.art]}</span></div>
                <div class="vw-schritt-was">{schrittErklaerung(v.schritt)} Im Verlauf Stand {v.nr}: "{v.titel}".</div>
              </div>
            </div>
          {/each}
        </div>
      </section>
      <section>
        <h3 class="vw-abschnitt">Name</h3>
        <label class="feld rz-name"><i class="fa-solid fa-scroll"></i><input bind:value={name} maxlength="120" aria-label="Name des Rezepts" onkeydown={(e) => e.key === "Enter" && void speichern()} /></label>
      </section>
      <div class="knopf-reihe">
        <button class="knopf" onclick={() => (rezepte.modus = "ansehen")}>Abbrechen</button>
        <button class="knopf primaer" disabled={!gewaehlt.length || !name.trim()} onclick={() => void speichern()}><i class="fa-solid fa-check"></i> Rezept speichern</button>
      </div>
    {:else}
      <p class="vw-hilfe">Im Verlauf von {blatt.name} gibt es noch keine Vorgänge aus Bereinigen. Erst dort zusammenführen, umwandeln oder Zeilen behalten.</p>
      <div class="knopf-reihe"><button class="knopf primaer" onclick={() => blatt.zeigen({ art: "werkzeug", kennung: "bereinigen" })}><i class="fa-solid fa-broom"></i> Zum Bereinigen</button></div>
    {/if}
  </div>
</div>
