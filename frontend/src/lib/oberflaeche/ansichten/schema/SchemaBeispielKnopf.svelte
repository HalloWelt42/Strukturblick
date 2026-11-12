<script lang="ts">
  // Knopf "Beispieldokument" der Ansicht Schema: ein gültiges Dokument zur gewählten Wurzel (im Elementbaum gewählt, sonst
  // die erste), nur mit Pflichtteilen oder mit jedem Teil einmal. Es landet neben dem Schema und öffnet in Validieren.
  import { anzeigename, type QName } from "../../../analyse/xsd/modell";
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { beispielAblegen } from "../../../zustand/schemaBeispiel";
  import type { SchemaZustand, Uebersicht } from "./schemaZustand.svelte";

  let { blatt, u, z }: { blatt: Arbeitsblatt; u: Uebersicht; z: SchemaZustand } = $props();

  let offen = $state(false);
  let huelle: HTMLElement | undefined = $state();

  /** Wurzel des gewählten Knotens, sonst die erste, die selbst im Dokument stehen darf */
  const wurzel = $derived.by((): QName | null => {
    const moeglich = u.wurzeln.filter((w) => w.element && !w.element.abstrakt);
    const gewaehlt = z.wahl?.art === "knoten" ? u.wurzeln[Number(z.wahl.kennung.split("/")[0])] : undefined;
    const w = gewaehlt && moeglich.includes(gewaehlt) ? gewaehlt : moeglich[0];
    return w?.element?.schluessel ?? null;
  });

  const UMFAENGE = [
    { kennung: "pflicht", titel: "Nur Pflichtteile", erklaerung: "Was ein gültiges Dokument mindestens braucht" },
    { kennung: "alles", titel: "Jedes Teil einmal", erklaerung: "Auch alles Optionale, je einmal; Auswahl: die erste Möglichkeit" },
  ] as const;

  function erzeugen(umfang: "pflicht" | "alles"): void {
    offen = false;
    if (wurzel) void beispielAblegen(blatt, u.modell, wurzel, umfang);
  }
</script>

<svelte:window onpointerdown={(e) => offen && huelle && !e.composedPath().includes(huelle) && (offen = false)} onkeydown={(e) => offen && e.key === "Escape" && (offen = false)} />

<span class="sc-huelle" bind:this={huelle}>
  <button class="knopf" disabled={!wurzel} aria-expanded={offen} title={wurzel ? "Ein gültiges Beispieldokument zu diesem Schema erzeugen" : "Das Schema hat kein Element, das als Wurzel stehen darf"} onclick={() => (offen = !offen)}>
    <i class="fa-solid fa-file-circle-plus"></i><span class="nur-breit"> Beispieldokument</span> <i class="fa-solid fa-caret-down"></i>
  </button>
  {#if offen && wurzel}
    <div class="sc-menue karte" role="menu">
      <p class="sc-menue-kopf">Beispiel mit Wurzel <span class="mono">{anzeigename(u.modell, wurzel)}</span></p>
      {#each UMFAENGE as f (f.kennung)}
        <button role="menuitem" onclick={() => erzeugen(f.kennung)}><span class="sc-menue-titel">{f.titel}</span><span class="text-3">{f.erklaerung}</span></button>
      {/each}
    </div>
  {/if}
</span>
