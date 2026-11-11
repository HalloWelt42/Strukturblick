<script lang="ts">
  // Diagnosen unter dem Editor (entwuerfe/editor.html): Zahlen, Cursorstelle, Befunde zum Anklicken. Rechnet die
  // Analyse noch, bleiben die alten Befunde mit dem Hinweis "liest" stehen; ein Klick springt an die heutige Stelle.
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import type { Schwere } from "../../../kern";
  import type { EditorZustand } from "./editorZustand.svelte";

  let { blatt, z, springen }: { blatt: Arbeitsblatt; z: EditorZustand; springen: (nummer: number) => void } = $props();

  const SYMBOL: Record<Schwere, string> = { fehler: "fa-circle-xmark", warnung: "fa-triangle-exclamation", hinweis: "fa-circle-info" };
  const mehr = $derived(z.zahlen.fehler + z.zahlen.warnungen + z.zahlen.hinweise - z.befunde.length);
  const zahl = (n: number, eins: string, viele: string): string => `${n} ${n === 1 ? eins : viele}`;
</script>

<div class="ed-diagnose">
  <div class="ed-diagnose-kopf">
    Diagnose
    {#if z.zahlen.fehler}<span class="abzeichen fehler">{zahl(z.zahlen.fehler, "Fehler", "Fehler")}</span>{/if}
    {#if z.zahlen.warnungen}<span class="abzeichen warn">{zahl(z.zahlen.warnungen, "Warnung", "Warnungen")}</span>{/if}
    {#if z.zahlen.hinweise}<span class="abzeichen">{zahl(z.zahlen.hinweise, "Hinweis", "Hinweise")}</span>{/if}
    {#if blatt.lesefehler}
      <span class="abzeichen fehler" title={blatt.lesefehler}>nicht lesbar</span>
    {:else if !blatt.aktuell}
      <span class="abzeichen zweit"><i class="fa-solid fa-spinner fa-spin"></i> liest</span>
    {:else if z.befunde.length === 0}
      <span class="abzeichen gut">Keine Befunde</span>
    {/if}
    <span class="rechts mono">Zeile {z.zeile}, Spalte {z.spalte}</span>
  </div>
  {#if z.befunde.length}
    <div class="ed-diagnose-liste">
      {#each z.befunde as b (b.nummer)}
        <div class="ed-befund">
          <i class="fa-solid {SYMBOL[b.schwere]} ed-{b.schwere}-zeichen"></i>
          <button class="ed-sprung" title="Zur Stelle springen" onclick={() => springen(b.nummer)}>{b.meldung}</button>
          <button class="ed-ort" title="Zur Stelle springen" onclick={() => springen(b.nummer)}>Zeile {b.zeile}, Spalte {b.spalte}</button>
        </div>
      {/each}
      {#if mehr > 0}
        <div class="ed-befund ed-mehr text-3">und {zahl(mehr, "weiterer Befund", "weitere Befunde")}, gezeigt sind die ersten {z.befunde.length}</div>
      {/if}
    </div>
  {/if}
</div>
