<script lang="ts">
  // Dateien überall auf die App ziehen: öffnet sie als neue Dokumente; während des Ziehens ein deutlicher Rahmen.
  import type { Snippet } from "svelte";
  import { arbeitsplatz } from "../../zustand/arbeitsplatz.svelte";

  let { children }: { children: Snippet } = $props();
  let tiefe = $state(0);

  const mitDateien = (e: DragEvent): boolean => [...(e.dataTransfer?.types ?? [])].includes("Files");

  async function ablegen(e: DragEvent): Promise<void> {
    e.preventDefault();
    tiefe = 0;
    for (const d of [...(e.dataTransfer?.files ?? [])]) await arbeitsplatz.dateiOeffnen(d);
  }
</script>

<div
  class="zone"
  role="presentation"
  ondragenter={(e) => { if (mitDateien(e)) { e.preventDefault(); tiefe++; } }}
  ondragover={(e) => { if (mitDateien(e)) e.preventDefault(); }}
  ondragleave={() => (tiefe = Math.max(0, tiefe - 1))}
  ondrop={ablegen}
>
  {@render children()}
  {#if tiefe > 0}
    <div class="hinweis"><i class="fa-solid fa-file-arrow-down"></i> Loslassen zum Öffnen</div>
  {/if}
</div>

<style>
  .zone {
    position: relative;
    height: 100vh;
  }
  .hinweis {
    position: absolute;
    inset: 12px;
    z-index: 40;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--a3);
    font-size: var(--titel);
    background: color-mix(in srgb, var(--flaeche-seite) 70%, transparent);
    box-shadow: inset 0 0 0 3px var(--akzent-flaeche);
    pointer-events: none;
  }
</style>
