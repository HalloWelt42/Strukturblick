<script lang="ts">
  // Werkzeug Bereinigen (entwuerfe/bereinigen*.html): Reiter Facetten, Ähnliche Werte und Typen über der Liste, die
  // auch die Ansicht Tabelle zeigen würde. Jede Änderung geht als ein Befehl über das Blatt (Rückgängig im Verlauf).
  import "./bereinigen.css";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { spaltentypen } from "../../../analyse/bereinigen/typen";
  import { bereinigenZustand, REITER } from "./bereinigenZustand.svelte";
  import SpaltenMenue from "../../bausteine/SpaltenMenue.svelte";
  import Facetten from "./Facetten.svelte";
  import Aehnlich from "./Aehnlich.svelte";
  import Typen from "./Typen.svelte";

  let { blatt }: { blatt: Arbeitsblatt } = $props();
  const z = $derived(bereinigenZustand(blatt));
  const stand = $derived(z.stand(blatt));
  const s = $derived(stand.art === "tabelle" ? stand : null);
  const spalten = $derived(s ? s.tabelle.spalten.map((x) => x.name) : []);

  const offen = $derived(s ? z.offeneFacetten(s) : []);
  const spalteAehnlich = $derived(s ? z.aehnlicheSpalte(s) : null);
  const typen = $derived(s && z.reiter === "typen" ? spaltentypen(s.tabelle, s.index, s.text) : []);
  const vorschlaege = $derived(typen.filter((t) => t.vorschlag !== null && t.vorschlag !== "text-bleibt").length);
  const hinweise = $derived(typen.filter((t) => t.vorschlag === "text-bleibt").length);
</script>

<div class="br-ansicht">
  <div class="werkzeugzeile">
    <nav class="segment" aria-label="Bereinigen">
      {#each REITER as r (r.kennung)}
        <button class:aktiv={z.reiter === r.kennung} title={r.erklaerung} onclick={() => (z.reiter = r.kennung)}><i class="fa-solid {r.symbol}"></i><span>{r.titel}</span></button>
      {/each}
    </nav>
    {#if s}
      <div class="rechts">
        {#if z.reiter === "facetten"}
          <SpaltenMenue {spalten} markiert={offen} titel="Eine Spalte als Facette zählen" onwahl={(n) => z.facetteOeffnen(offen, n)}>
            {#snippet knopf()}<i class="fa-solid fa-plus"></i><span class="br-breit">Facette hinzufügen</span>{/snippet}
          </SpaltenMenue>
        {:else if z.reiter === "aehnlich"}
          <SpaltenMenue {spalten} markiert={spalteAehnlich ? [spalteAehnlich] : []} markierung="gewählt" titel="Spalte wählen" onwahl={(n) => (z.spalteAehnlich = n)}>
            {#snippet knopf()}<span class="text-3">Spalte</span> <span class="mono">{spalteAehnlich}</span> <i class="fa-solid fa-caret-down"></i>{/snippet}
          </SpaltenMenue>
        {:else}
          <span class="text-3 klein br-breit">{spalten.length} Spalten, {vorschlaege} {vorschlaege === 1 ? "Vorschlag" : "Vorschläge"}, {hinweise} {hinweise === 1 ? "Hinweis" : "Hinweise"}</span>
        {/if}
      </div>
    {/if}
  </div>

  {#if stand.art === "liest"}
    <div class="br-meldung"><i class="fa-solid fa-spinner fa-spin"></i><span>Das Dokument wird gelesen ...</span></div>
  {:else if stand.art === "unlesbar"}
    <div class="br-meldung">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <span>Das Dokument lässt sich so nicht lesen. Erst reparieren, dann bereinigen.</span>
      <button class="knopf primaer" onclick={() => blatt.zeigen({ art: "ansicht", kennung: "editor" })}><i class="fa-solid fa-code"></i> Zum Editor</button>
    </div>
  {:else if stand.art === "keine-liste"}
    <div class="br-meldung">
      <i class="fa-solid fa-table"></i>
      <span>Bereinigen braucht eine Liste gleich aufgebauter Einträge, etwa die Zeilen einer CSV. In diesem Dokument gibt es keine.</span>
      <button class="knopf primaer" onclick={() => blatt.zeigen({ art: "ansicht", kennung: "baum" })}><i class="fa-solid fa-folder-tree"></i> Im Baum ansehen</button>
    </div>
  {:else if s}
    {#if z.reiter === "facetten"}
      <Facetten {blatt} {z} {s} {offen} />
    {:else if z.reiter === "aehnlich" && spalteAehnlich !== null}
      <Aehnlich {blatt} {z} {s} spalte={spalteAehnlich} />
    {:else}
      <Typen {blatt} {z} {s} {typen} />
    {/if}
  {/if}
</div>
