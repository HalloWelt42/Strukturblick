<script lang="ts">
  // Tafel "Spezifikation" (entwuerfe/testdaten.html): je Feld eine Zeile mit Erzeuger (Menü), Einstellungen als Marken
  // und einem Beispiel aus der Probe. Verschachtelte Felder sind eingerückt. Ein Klick wählt das Feld; seine
  // Einstellungen ändert der Inspektor.
  import type { Arbeitsblatt } from "../../../zustand/arbeitsblatt.svelte";
  import { ERZEUGER, erzeuger, mitVorgaben } from "../../../analyse/testdaten/erzeuger";
  import { LEERARTEN, schluesselVon, tiefeVon, wertAn, type Spezifikation } from "../../../analyse/testdaten/spezifikation";
  import { zeigen } from "./zeigen";
  import type { TestdatenZustand } from "./testdatenZustand.svelte";

  let { blatt, z, spez }: { blatt: Arbeitsblatt; z: TestdatenZustand; spez: Spezifikation } = $props();

  const probe = $derived(z.probe(blatt));
  let menueFuer = $state<string | null>(null);

  const feldname = (pfad: string): string => (pfad === "" ? "(Datensatz)" : pfad.endsWith("[]") ? "(je Eintrag)" : schluesselVon(pfad));
  function beispiel(pfad: string): string {
    for (const d of probe) {
      const w = wertAn(d, pfad);
      if (w !== undefined) return zeigen(w);
    }
    return "";
  }
</script>

<svelte:window onpointerdown={(ev) => menueFuer !== null && !(ev.target as HTMLElement).closest(".td-menue") && (menueFuer = null)} />

<div class="td-tafel-feld">
  <table class="td-tabelle">
    <thead>
      <tr><th>Feld</th><th>Erzeuger</th><th>Einstellungen</th><th>Beispiel</th></tr>
    </thead>
    <tbody>
      {#each spez.felder as f (f.pfad)}
        {@const erz = erzeuger(f.erzeuger)}
        <tr class:gewaehlt={z.gewaehlt === f.pfad} onclick={() => (z.gewaehlt = f.pfad)}>
          <td class="td-feldname mono" style="--tiefe: {tiefeVon(f.pfad)}" title={f.pfad || "Der Datensatz selbst"}>{feldname(f.pfad)}</td>
          <td class="td-menue">
            {#if erz.art !== "wert"}
              <span class="td-aufbau">{erz.titel}</span>
            {:else}
            <button class="td-wahl" aria-haspopup="menu" aria-expanded={menueFuer === f.pfad} onclick={(e) => { e.stopPropagation(); z.gewaehlt = f.pfad; menueFuer = menueFuer === f.pfad ? null : f.pfad; }}>
              {erz.titel} <i class="fa-solid fa-chevron-down"></i>
            </button>
            {#if menueFuer === f.pfad}
              <div class="td-liste karte" role="menu">
                {#each ERZEUGER.filter((e) => e.art === "wert") as e (e.kennung)}
                  <button role="menuitem" class:aktiv={e.kennung === f.erzeuger} title={e.beschreibung} onclick={(ev) => { ev.stopPropagation(); menueFuer = null; z.erzeugerWechseln(blatt, f.pfad, e.kennung); }}>{e.titel}</button>
                {/each}
              </div>
            {/if}
            {/if}
          </td>
          <td>
            <div class="td-marken">
              {#each erz.marken(mitVorgaben(erz, f.einstellungen)) as m, i (i)}<span class="td-marke">{m}</span>{/each}
              {#if f.leer.anteil > 0}<span class="td-marke td-leer" title="So oft bleibt das Feld leer">leer {f.leer.anteil} % {LEERARTEN.find((l) => l.wert === f.leer.als)?.titel}</span>{/if}
            </div>
          </td>
          <td class="mono td-beispiel">{erz.art === "wert" ? beispiel(f.pfad) : ""}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
