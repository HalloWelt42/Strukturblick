<script lang="ts">
  // Liste der Unterschiede (entwuerfe/vergleich.html): Zahl je Art, je Unterschied Art, Pfad und Werte. Ein Klick wählt
  // ihn; die Seiten rollen dorthin, der Inspektor zeigt ihn.
  import { kennung } from "../../../analyse/vergleich/zeilen";
  import type { Vergleich, Vergleichsknoten } from "../../../analyse/vergleich/vergleichen";
  import { anzahl } from "../tabelle/zahlen";
  import type { VergleichZustand } from "./vergleichZustand.svelte";

  let { z, vergleich }: { z: VergleichZustand; vergleich: Vergleich } = $props();

  /** So viele Unterschiede stehen in der Liste; der Patch enthält alle */
  const GEZEIGT = 500;
  const zahl = (art: string) => vergleich.unterschiede.filter((u) => (art === "geaendert" ? u.art === "geaendert" || u.reihenfolge : u.art === art)).length;
  const kurz = (w: unknown): string => {
    const s = typeof w === "string" ? JSON.stringify(w) : Array.isArray(w) ? `${anzahl(w.length)} Einträge` : typeof w === "object" && w !== null ? kennung(w) || "Objekt" : String(w);
    return s.length > 60 ? `${s.slice(0, 59)}...` : s;
  };
  const SYMBOL = { geaendert: "fa-pen", hinzu: "fa-plus", weg: "fa-minus", reihenfolge: "fa-arrow-down-up-across-line" } as const;
  const artVon = (u: Vergleichsknoten): keyof typeof SYMBOL => (u.reihenfolge ? "reihenfolge" : (u.art as "geaendert" | "hinzu" | "weg"));
  const fuss = $derived(vergleich.paarungen.filter((p) => p.feld).map((p) => `${p.muster} über ${p.feld}: ${anzahl(p.paare)} Paare${p.nurVorher ? `, ${anzahl(p.nurVorher)} nur vorher` : ""}${p.nurJetzt ? `, ${anzahl(p.nurJetzt)} nur jetzt` : ""}`));
</script>

<section class="an-ud">
  <div class="an-ud-kopf">
    <div class="karte-titel">Unterschiede</div>
    <div class="an-ud-summe">
      <span class="abzeichen {zahl('geaendert') ? 'warn' : 'an-null'}">{anzahl(zahl("geaendert"))} geändert</span>
      <span class="abzeichen {zahl('hinzu') ? 'gut' : 'an-null'}">{anzahl(zahl("hinzu"))} hinzu</span>
      <span class="abzeichen {zahl('weg') ? 'fehler' : 'an-null'}">{anzahl(zahl("weg"))} weg</span>
    </div>
  </div>
  <div class="an-ud-liste">
    {#each vergleich.unterschiede.slice(0, GEZEIGT) as u (u.pfad + u.art)}
      {@const art = artVon(u)}
      <button class="an-ud-eintrag" class:vg-gewaehlt={u.pfad === z.gewaehlt} aria-current={u.pfad === z.gewaehlt} onclick={() => (z.gewaehlt = u.pfad)}>
        <span class="an-ud-art an-{art === 'reihenfolge' ? 'geaendert' : art}" title={art}><i class="fa-solid {SYMBOL[art]}"></i></span>
        <span class="an-ud-pfad">{u.pfad || "(Wurzel)"}</span>
        <span class="an-ud-werte">
          {#if art === "reihenfolge"}<span class="an-alt">Reihenfolge der Einträge geändert</span>
          {:else if u.art === "geaendert"}<span class="an-alt">{kurz(u.vorher)}</span><i class="fa-solid fa-arrow-right"></i><span class="an-neu">{kurz(u.jetzt)}</span>
          {:else if u.art === "hinzu"}<span class="an-neu">{kurz(u.jetzt)}</span>
          {:else}<span class="an-alt">{kurz(u.vorher)}</span>{/if}
        </span>
      </button>
    {:else}
      <p class="wz-satz vg-luft">Keine Unterschiede: Beide Seiten enthalten dasselbe.</p>
    {/each}
    {#if vergleich.unterschiede.length > GEZEIGT}<p class="klein text-3 vg-luft">und {anzahl(vergleich.unterschiede.length - GEZEIGT)} weitere, vollständig im JSON Patch.</p>{/if}
  </div>
  {#if fuss.length}<div class="an-ud-fuss">{fuss.join("; ")}</div>{/if}
</section>

<style>
  .vg-gewaehlt {
    background-color: var(--flaeche-hervor);
  }
  .vg-luft {
    padding: var(--a3);
  }
</style>
