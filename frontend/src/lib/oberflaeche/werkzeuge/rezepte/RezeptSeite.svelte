<script lang="ts">
  // Ein Rezept: Name (umbenennen), Herkunft, Schritte von oben nach unten und die erwarteten Spalten mit dem Schritt,
  // der sie braucht. Jede Änderung wird gleich abgelegt.
  import { schrittSpalten, type Rezept } from "../../../analyse/rezepte/rezept";
  import { rezepte } from "../../../zustand/rezepte.svelte";
  import { herunterladen } from "../../schale/dateien";
  import { datum } from "./datum";
  import RezeptSchritt from "./RezeptSchritt.svelte";

  let { rezept }: { rezept: Rezept } = $props();

  let umbenennen = $state(false);
  const spalten = $derived([...new Set([...rezept.spalten, ...rezept.schritte.flatMap(schrittSpalten)])]);
  const schritteFuer = (s: string): number[] => rezept.schritte.flatMap((x, i) => (schrittSpalten(x).includes(s) ? [i + 1] : []));

  function fertig(e: Event): void {
    umbenennen = false;
    void rezepte.umbenennen(rezept, (e.currentTarget as HTMLInputElement).value);
  }

  const dateiname = $derived(`${rezept.name.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || "rezept"}.rezept.json`);
</script>

<div class="vw-seite">
  <div>
    <h2 class="vw-titel">
      <i class="fa-solid fa-scroll"></i>
      {#if umbenennen}
        <!-- svelte-ignore a11y_autofocus -->
        <label class="feld rz-name"><input value={rezept.name} aria-label="Name des Rezepts" maxlength="120" autofocus onchange={fertig} onblur={fertig} onkeydown={(e) => e.key === "Escape" && (umbenennen = false)} /></label>
      {:else}
        <span class="rz-titel-text">{rezept.name}</span>
      {/if}
      <span class="rechts">
        <button class="knopf still" title="Umbenennen" onclick={() => (umbenennen = true)}><i class="fa-solid fa-pen"></i><span class="nur-breit">Umbenennen</span></button>
        <button class="knopf still" title="Als Datei sichern oder weitergeben" onclick={() => herunterladen(dateiname, JSON.stringify(rezept, null, 2))}><i class="fa-solid fa-download"></i><span class="nur-breit">Herunterladen</span></button>
        <button class="knopf still" title="Rezept entfernen (mit Rückgängig in der Meldung)" onclick={() => void rezepte.entfernen(rezept)}><i class="fa-solid fa-trash"></i></button>
      </span>
    </h2>
    <p class="vw-unter">Aus dem Verlauf von {rezept.quelle}, gespeichert am {datum(rezept.angelegt)}. Die Schritte laufen von oben nach unten.</p>
  </div>
  <section>
    <h3 class="vw-abschnitt">Schritte <span class="rechts">{rezept.schritte.filter((s) => s.an).length} von {rezept.schritte.length} eingeschaltet</span></h3>
    {#if rezept.schritte.length}
      <div class="vw-schritte">
        {#each rezept.schritte as s, i (i)}
          <RezeptSchritt {rezept} schritt={s} nr={i} />
        {/each}
      </div>
    {:else}
      <p class="vw-hilfe">Keine Schritte mehr. Ein Rezept ohne Schritte ändert nichts; entfernen oder neu aus dem Verlauf anlegen.</p>
    {/if}
  </section>
  <section>
    <h3 class="vw-abschnitt">Erwartete Spalten <span class="rechts">{spalten.length} Spalten aus {rezept.quelle}</span></h3>
    <div class="vw-spaltenmarken">
      {#each spalten as s (s)}
        {@const nr = schritteFuer(s)}
        <span class="vw-spaltenmarke">{s}{#if nr.length}<span class="rechts">Schritt {nr.join(", ")}</span>{/if}</span>
      {/each}
    </div>
    <p class="vw-hilfe">Fehlt beim Anwenden eine Spalte, wird nur der Schritt übersprungen, der sie braucht. Zusätzliche Spalten bleiben, wie sie sind.</p>
  </section>
</div>
