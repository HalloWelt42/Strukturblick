<script lang="ts">
  // Facette für Text (und Listen in der Zelle): jeder Wert mit Anzahl zum Ankreuzen, nach dem Alphabet oder nach Anzahl.
  // Gibt es Schreibweisen mit gleichem Kern, verweist ein Hinweis auf den Reiter Ähnliche Werte.
  import { gruppenFinden } from "../../../analyse/bereinigen/aehnlich";
  import type { BereinigenZustand, Tabellenstand } from "./bereinigenZustand.svelte";
  import { anzahl } from "../../ansichten/tabelle/zahlen";
  import WertText from "./WertText.svelte";

  let { z, s, name, spalte }: { z: BereinigenZustand; s: Tabellenstand; name: string; spalte: number } = $props();

  /** So viele Werte stehen da, bevor "Weitere" aufklappt */
  const ZUERST = 15;
  const SORTIERER = new Intl.Collator("de", { sensitivity: "variant", numeric: true });

  const werte = $derived(z.werte(s, spalte));
  const nachAnzahl = $derived(z.nachAnzahl[name] ?? false);
  const sortiert = $derived([...werte].sort((a, b) => (nachAnzahl ? b.anzahl - a.anzahl : 0) || SORTIERER.compare(a.wert, b.wert)));
  const alle = $derived(z.alleWerte[name] ?? false);
  const gezeigt = $derived(alle ? sortiert : sortiert.slice(0, ZUERST));
  const hoechste = $derived(Math.max(1, ...werte.map((w) => w.anzahl)));
  const auswahl = $derived(z.auswahl(name));
  const an = $derived(new Set(auswahl?.art === "werte" ? auswahl.werte : []));

  const gruppen = $derived(gruppenFinden(werte, "kern"));
  const hinweis = $derived.by(() => {
    if (!gruppen.length) return "";
    const [g, ...rest] = gruppen;
    const erst = `${g.ziel} steht in ${g.varianten.length} Schreibweisen`;
    if (!rest.length) return `${erst}. Zusammenführen`;
    const weitere = rest.length <= 2 ? rest.map((r) => r.ziel.trim()).join(" und ") : `${rest.length} weitere Werte`;
    return `${erst}, ${weitere} ebenso. Zusammenführen`;
  });

  function umschalten(wert: string): void {
    const neu = new Set(an);
    if (neu.has(wert)) neu.delete(wert);
    else neu.add(wert);
    z.auswahlSetzen(name, neu.size ? { art: "werte", werte: [...neu] } : null);
  }
</script>

{#if !werte.length}
  <p class="br-facette-unter">Keine einfachen Werte: In dieser Spalte stehen Objekte oder Listen von Objekten.</p>
{:else}
  <div class="segment" title="Reihenfolge">
    <button class:aktiv={nachAnzahl} onclick={() => (z.nachAnzahl[name] = true)}>Anzahl</button>
    <button class:aktiv={!nachAnzahl} onclick={() => (z.nachAnzahl[name] = false)}>A bis Z</button>
  </div>
  <ul class="br-werte">
    {#each gezeigt as w (w.wert)}
      <li>
        <button class="br-wert" class:an={an.has(w.wert)} aria-pressed={an.has(w.wert)} onclick={() => umschalten(w.wert)}>
          <span class="br-haken" class:an={an.has(w.wert)}><i class="fa-solid fa-check"></i></span>
          <span class="br-wert-text"><WertText wert={w.wert} /></span>
          <span class="br-balken"><span style="width: {(w.anzahl / hoechste) * 100}%"></span></span>
          <span class="br-anzahl">{anzahl(w.anzahl)}</span>
        </button>
      </li>
    {/each}
  </ul>
  {#if sortiert.length > ZUERST}
    <button class="br-mehr" onclick={() => (z.alleWerte[name] = !alle)}>
      <i class="fa-solid {alle ? 'fa-chevron-up' : 'fa-chevron-down'}"></i>
      {alle ? "Weniger zeigen" : `Weitere ${anzahl(sortiert.length - ZUERST)} Werte`}
    </button>
  {/if}
{/if}
{#if hinweis}
  <button class="br-hinweis" onclick={() => z.aehnlicheZeigen(name)}><i class="fa-solid fa-object-group"></i><span>{hinweis}</span></button>
{/if}
